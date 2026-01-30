
import { sql, toSnakeCase } from '../lib/db.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { 
  UserSchema, LoginSchema, TaskSchema, ArticleSchema, 
  AnnouncementSchema, ChangePasswordSchema, ProjectSchema
} from '../lib/schemas.js';

// --- Production Utilities ---

// 1. Structured Logger
const logger = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg: string, meta?: any) => console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() })),
};

// 2. Custom Error Class
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 3. Robust Rate Limiter (In-Memory for Serverless)
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300; 

const checkRateLimit = (req: any) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim() 
    : req.socket?.remoteAddress || 'unknown';

  const now = Date.now();
  const record = rateLimit.get(ip);

  if (record) {
    if (now - record.timestamp > RATE_LIMIT_WINDOW) {
      rateLimit.set(ip, { count: 1, timestamp: now });
    } else {
      if (record.count >= MAX_REQUESTS) {
        logger.warn('Rate limit exceeded', { ip });
        return false;
      }
      record.count++;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }

  // Lazy Cleanup (Probabilistic)
  if (Math.random() < 0.05) {
    for (const [key, val] of rateLimit.entries()) {
      if (now - val.timestamp > RATE_LIMIT_WINDOW) rateLimit.delete(key);
    }
  }
  
  return true;
};

// 4. Security Headers & CORS
const setSecurityHeaders = (req: any, res: any) => {
  const origin = req.headers.origin;
  
  if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
};

const json = (res: any, status: number, data: any) => res.status(status).json(data);

// 5. Validation Wrapper
const validateBody = (schema: z.ZodSchema) => (handler: Handler) => async (req: any, res: any, params: string[]) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    await handler(req, res, params);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError(`Validation Error: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
    }
    throw error;
  }
};

const getUserFromRequest = (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized: Missing token', 401);
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    throw new AppError('Unauthorized: Invalid or expired token', 401);
  }
  return decoded as { id: string, role: string, email: string };
};

// --- Business Logic Handlers ---

type Handler = (req: any, res: any, params: string[]) => Promise<void>;

// 0. HEALTH CHECK
const handleHealth: Handler = async (req, res) => {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
};

// 1. AUTH
const handleLogin: Handler = async (req, res) => {
  const { email, password } = req.body;
  
  const users = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = true LIMIT 1`;
  if (users.length === 0) throw new AppError('Неверный email или пароль', 401);
  
  const user = users[0];
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) throw new AppError('Неверный email или пароль', 401);

  const token = signToken({ id: user.id, role: user.role, email: user.email });
  
  const { password_hash, ...safeUser } = user;
  
  logger.info('User logged in', { userId: user.id });
  return json(res, 200, { user: safeUser, token });
};

// 2. USERS
const handleGetUsers: Handler = async (req, res) => {
  getUserFromRequest(req);
  const users = await sql`
    SELECT id, name, email, role, position, department, avatar_url, is_active 
    FROM users 
    WHERE deleted_at IS NULL 
    ORDER BY name ASC 
    LIMIT 1000
  `;
  return json(res, 200, users);
};

const handleCreateUser: Handler = async (req, res) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Доступ запрещен', 403);

  const { name, email, role, position, department, password, avatarUrl } = req.body;
  const hashedPassword = await hashPassword(password || '123456');
  const finalAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  
  try {
    const [newUser] = await sql`
      INSERT INTO users (name, email, role, position, department, password_hash, avatar_url)
      VALUES (${name}, ${email}, ${role}, ${position}, ${department}, ${hashedPassword}, ${finalAvatar})
      RETURNING id, name, email, role, position, department, avatar_url
    `;
    return json(res, 201, newUser);
  } catch (err: any) {
    if (err.code === '23505') throw new AppError('Email уже занят', 409);
    throw err;
  }
};

const handleUpdateUser: Handler = async (req, res, [id]) => {
  const requester = getUserFromRequest(req);
  if (requester.id !== id && requester.role !== 'ADMIN') throw new AppError('Доступ запрещен', 403);

  const { name, position, department, avatarUrl, role } = req.body;
  
  let query;
  if (requester.role === 'ADMIN' && role) {
      query = sql`
        UPDATE users SET name = ${name}, position = ${position}, department = ${department}, avatar_url = ${avatarUrl}, role = ${role}, updated_at = NOW()
        WHERE id = ${id} RETURNING id, name, email, role, position, department, avatar_url
      `;
  } else {
      query = sql`
        UPDATE users SET name = ${name}, position = ${position}, department = ${department}, avatar_url = ${avatarUrl}, updated_at = NOW()
        WHERE id = ${id} RETURNING id, name, email, role, position, department, avatar_url
      `;
  }

  const [updated] = await query;
  return json(res, 200, updated);
};

const handleChangePassword: Handler = async (req, res) => {
  const requester = getUserFromRequest(req);
  const { oldPass, newPass, email } = req.body;

  if (requester.email !== email && requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);

  const [user] = await sql`SELECT password_hash FROM users WHERE email = ${email}`;
  if (!user) throw new AppError('User not found', 404);

  if (requester.role !== 'ADMIN') {
    const isValid = await verifyPassword(oldPass, user.password_hash);
    if (!isValid) throw new AppError('Старый пароль неверен', 401);
  }

  const newHash = await hashPassword(newPass);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE email = ${email}`;
  return json(res, 200, { success: true });
};

const handleDeleteUser: Handler = async (req, res, [id]) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Только админ может удалять', 403);
  
  // PREVENT SELF-DELETION
  if (requester.id === id) {
      throw new AppError('Нельзя удалить собственную учетную запись', 400);
  }

  await sql`UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = ${id}`;
  return res.status(204).end();
};

// 3. PROJECTS
const handleGetProjects: Handler = async (req, res) => {
  getUserFromRequest(req);
  const projects = await sql`SELECT * FROM projects ORDER BY created_at DESC LIMIT 100`;
  return json(res, 200, projects);
};

const handleCreateProject: Handler = async (req, res) => {
  const user = getUserFromRequest(req);
  const { name, description, status } = req.body;
  const [project] = await sql`
    INSERT INTO projects (name, description, status, owner_id)
    VALUES (${name}, ${description}, ${status || 'active'}, ${user.id})
    RETURNING *
  `;
  return json(res, 201, project);
};

const handleDeleteProject: Handler = async (req, res, [id]) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return res.status(204).end();
};

// 4. TASKS
const handleGetTasks: Handler = async (req, res) => {
  getUserFromRequest(req);
  const tasks = await sql`
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 500
  `;
  return json(res, 200, tasks);
};

const handleCreateTask: Handler = async (req, res) => {
  const user = getUserFromRequest(req);
  const { title, description, priority, assignee_name, due_date, project_id } = req.body;
  
  const pid = project_id === "" ? null : project_id;

  const [newTask] = await sql`
    INSERT INTO tasks (title, description, priority, assignee_name, author_id, due_date, status, project_id)
    VALUES (${title}, ${description}, ${priority}, ${assignee_name}, ${user.id}, ${due_date || null}, 'todo', ${pid})
    RETURNING *
  `;
  return json(res, 201, newTask);
};

const handleUpdateTask: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const fields = req.body;
  const dbFields = toSnakeCase(fields);
  
  if (dbFields.project_id === "") dbFields.project_id = null;
  
  if (dbFields.status) await sql`UPDATE tasks SET status = ${dbFields.status}::task_status WHERE id = ${id}`;
  if (dbFields.title) await sql`UPDATE tasks SET title = ${dbFields.title} WHERE id = ${id}`;
  if (dbFields.description) await sql`UPDATE tasks SET description = ${dbFields.description} WHERE id = ${id}`;
  if (dbFields.priority) await sql`UPDATE tasks SET priority = ${dbFields.priority}::task_priority WHERE id = ${id}`;
  if (dbFields.assignee_name !== undefined) await sql`UPDATE tasks SET assignee_name = ${dbFields.assignee_name} WHERE id = ${id}`;
  if (dbFields.due_date !== undefined) await sql`UPDATE tasks SET due_date = ${dbFields.due_date || null} WHERE id = ${id}`;
  if (dbFields.project_id !== undefined) await sql`UPDATE tasks SET project_id = ${dbFields.project_id} WHERE id = ${id}`;

  const [updated] = await sql`
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ${id}
  `;
  return json(res, 200, updated);
};

const handleDeleteTask: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  await sql`DELETE FROM tasks WHERE id = ${id}`;
  return res.status(204).end();
};

// 5. ARTICLES
const handleGetArticles: Handler = async (req, res) => {
  getUserFromRequest(req);
  const articles = await sql`SELECT * FROM articles WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`;
  return json(res, 200, articles);
};

const handleCreateArticle: Handler = async (req, res) => {
  const user = getUserFromRequest(req);
  const { title, content, category, folder, attachments } = req.body;
  const [newArticle] = await sql`
    INSERT INTO articles (title, content, category, author_id, folder, type, status, attachments)
    VALUES (${title}, ${content}, ${category}, ${user.id}, ${folder}, 'knowledge', 'published', ${JSON.stringify(attachments || [])}::jsonb)
    RETURNING *
  `;
  return json(res, 201, newArticle);
};

const handleUpdateArticle: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const { title, content, category, folder, attachments } = req.body;
  const [updated] = await sql`
    UPDATE articles SET 
      title = ${title}, 
      content = ${content}, 
      category = ${category}, 
      folder = ${folder}, 
      attachments = ${JSON.stringify(attachments || [])}::jsonb,
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  return json(res, 200, updated);
};

const handleDeleteArticle: Handler = async (req, res, [id]) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);
  await sql`UPDATE articles SET deleted_at = NOW() WHERE id = ${id}`;
  return res.status(204).end();
};

// 6. ANNOUNCEMENTS
const handleGetAnnouncements: Handler = async (req, res) => {
  getUserFromRequest(req);
  const data = await sql`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`;
  return json(res, 200, data);
};

const handleCreateAnnouncement: Handler = async (req, res) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);

  const { title, content, priority, isPinned } = req.body;
  const [record] = await sql`
    INSERT INTO announcements (title, content, priority, is_pinned, liked_by, comments, read_by)
    VALUES (${title}, ${content}, ${priority}, ${isPinned || false}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    RETURNING *
  `;
  return json(res, 201, record);
};

const handleAnnouncementLike: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const { userId } = req.body;
  const [record] = await sql`SELECT liked_by FROM announcements WHERE id = ${id}`;
  let likes = Array.isArray(record?.liked_by) ? record.liked_by : [];
  if (likes.includes(userId)) likes = likes.filter((uid: string) => uid !== userId);
  else likes.push(userId);
  const [updated] = await sql`UPDATE announcements SET liked_by = ${JSON.stringify(likes)}::jsonb WHERE id = ${id} RETURNING *`;
  return json(res, 200, updated);
};

const handleAnnouncementComment: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const comment = req.body;
  const [record] = await sql`SELECT comments FROM announcements WHERE id = ${id}`;
  const comments = Array.isArray(record?.comments) ? record.comments : [];
  comments.push({ ...comment, id: randomUUID(), date: new Date().toISOString() });
  const [updated] = await sql`UPDATE announcements SET comments = ${JSON.stringify(comments)}::jsonb WHERE id = ${id} RETURNING *`;
  return json(res, 200, updated);
};

const handleAnnouncementRead: Handler = async (req, res, [id]) => {
  const { userId } = req.body;
  const [record] = await sql`SELECT read_by FROM announcements WHERE id = ${id}`;
  let reads = Array.isArray(record?.read_by) ? record.read_by : [];
  if (!reads.includes(userId)) {
    reads.push(userId);
    await sql`UPDATE announcements SET read_by = ${JSON.stringify(reads)}::jsonb WHERE id = ${id}`;
  }
  return json(res, 200, { success: true });
};

const handleDeleteAnnouncement: Handler = async (req, res, [id]) => {
    const requester = getUserFromRequest(req);
    if (requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);
    await sql`DELETE FROM announcements WHERE id = ${id}`;
    return res.status(204).end();
}

// 7. FEED
const handleGetFeed: Handler = async (req, res) => {
  getUserFromRequest(req);
  const data = await sql`
    SELECT f.*, u.name as author_name, u.avatar_url as author_avatar
    FROM employee_updates f
    JOIN users u ON f.author_id = u.id
    ORDER BY f.created_at DESC
    LIMIT 50
  `;
  return json(res, 200, data);
};

const handleCreateFeed: Handler = async (req, res) => {
  const user = getUserFromRequest(req);
  const { content } = req.body;
  if (!content || content.length < 1) throw new AppError('Content required', 400);

  const [record] = await sql`
    INSERT INTO employee_updates (content, author_id, liked_by, comments)
    VALUES (${content}, ${user.id}, '[]'::jsonb, '[]'::jsonb)
    RETURNING *
  `;
  return json(res, 201, record);
};

const handleFeedLike: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const { userId } = req.body;
  const [record] = await sql`SELECT liked_by FROM employee_updates WHERE id = ${id}`;
  let likes = Array.isArray(record?.liked_by) ? record.liked_by : [];
  if (likes.includes(userId)) likes = likes.filter((uid: string) => uid !== userId);
  else likes.push(userId);
  
  await sql`UPDATE employee_updates SET liked_by = ${JSON.stringify(likes)}::jsonb, likes_count = ${likes.length} WHERE id = ${id}`;
  
  const [full] = await sql`
    SELECT f.*, u.name as author_name, u.avatar_url as author_avatar
    FROM employee_updates f
    JOIN users u ON f.author_id = u.id
    WHERE f.id = ${id}
  `;
  return json(res, 200, full);
};

const handleFeedComment: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const comment = req.body;
  const [record] = await sql`SELECT comments FROM employee_updates WHERE id = ${id}`;
  const comments = Array.isArray(record?.comments) ? record.comments : [];
  comments.push({ ...comment, id: randomUUID(), date: new Date().toISOString() });
  await sql`UPDATE employee_updates SET comments = ${JSON.stringify(comments)}::jsonb WHERE id = ${id}`;
  
  const [full] = await sql`
    SELECT f.*, u.name as author_name, u.avatar_url as author_avatar
    FROM employee_updates f
    JOIN users u ON f.author_id = u.id
    WHERE f.id = ${id}
  `;
  return json(res, 200, full);
};

// 8. DOCUMENTS
const handleGetDocs: Handler = async (req, res) => {
  getUserFromRequest(req);
  const data = await sql`
    SELECT id, filename, mime_type, file_size_bytes, access_role, uploaded_by, created_at, storage_path 
    FROM documents 
    ORDER BY created_at DESC 
    LIMIT 200
  `;
  return json(res, 200, data);
};

const handleGetDocumentById: Handler = async (req, res, [id]) => {
  getUserFromRequest(req);
  const [doc] = await sql`SELECT * FROM documents WHERE id = ${id}`;
  if (!doc) throw new AppError('Document not found', 404);
  return json(res, 200, doc);
};

const handleCreateDoc: Handler = async (req, res) => {
  const user = getUserFromRequest(req);
  const { filename, mime_type, file_size_bytes, uploaded_by, access_role, data: base64 } = req.body;
  
  if (base64 && base64.length > 4.2 * 1024 * 1024) { // ~4.2MB limit for base64
      throw new AppError('File too large (Base64 limit exceeded).', 413);
  }

  const [record] = await sql`
    INSERT INTO documents (filename, mime_type, file_size_bytes, uploaded_by, access_role, storage_path, data)
    VALUES (${filename}, ${mime_type}, ${file_size_bytes}, ${user.id}, ${access_role}, 'db-storage', ${base64})
    RETURNING id, filename, mime_type, file_size_bytes, access_role, uploaded_by, created_at
  `;
  return json(res, 201, record);
};

const handleDeleteDoc: Handler = async (req, res, [id]) => {
  const requester = getUserFromRequest(req);
  if (requester.role !== 'ADMIN') throw new AppError('Forbidden', 403);
  await sql`DELETE FROM documents WHERE id = ${id}`;
  return res.status(204).end();
};


// --- Router Config ---
interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [
  // System
  { method: 'GET', pattern: /^\/api\/health$/, handler: handleHealth },

  // Auth
  { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: validateBody(LoginSchema)(handleLogin) },
  { method: 'POST', pattern: /^\/api\/auth\/change-password$/, handler: validateBody(ChangePasswordSchema)(handleChangePassword) },
  
  // Users
  { method: 'GET', pattern: /^\/api\/users$/, handler: handleGetUsers },
  { method: 'POST', pattern: /^\/api\/users$/, handler: validateBody(UserSchema)(handleCreateUser) },
  { method: 'PATCH', pattern: /^\/api\/users\/([^\/]+)$/, handler: handleUpdateUser },
  { method: 'DELETE', pattern: /^\/api\/users\/([^\/]+)$/, handler: handleDeleteUser },
  
  // Projects
  { method: 'GET', pattern: /^\/api\/projects$/, handler: handleGetProjects },
  { method: 'POST', pattern: /^\/api\/projects$/, handler: validateBody(ProjectSchema)(handleCreateProject) },
  { method: 'DELETE', pattern: /^\/api\/projects\/([^\/]+)$/, handler: handleDeleteProject },

  // Tasks
  { method: 'GET', pattern: /^\/api\/tasks$/, handler: handleGetTasks },
  { method: 'POST', pattern: /^\/api\/tasks$/, handler: validateBody(TaskSchema)(handleCreateTask) },
  { method: 'PATCH', pattern: /^\/api\/tasks\/([^\/]+)$/, handler: handleUpdateTask },
  { method: 'DELETE', pattern: /^\/api\/tasks\/([^\/]+)$/, handler: handleDeleteTask },

  // Articles
  { method: 'GET', pattern: /^\/api\/articles$/, handler: handleGetArticles },
  { method: 'POST', pattern: /^\/api\/articles$/, handler: validateBody(ArticleSchema)(handleCreateArticle) },
  { method: 'PATCH', pattern: /^\/api\/articles\/([^\/]+)$/, handler: handleUpdateArticle },
  { method: 'DELETE', pattern: /^\/api\/articles\/([^\/]+)$/, handler: handleDeleteArticle },

  // Announcements
  { method: 'GET', pattern: /^\/api\/announcements$/, handler: handleGetAnnouncements },
  { method: 'POST', pattern: /^\/api\/announcements$/, handler: validateBody(AnnouncementSchema)(handleCreateAnnouncement) },
  { method: 'DELETE', pattern: /^\/api\/announcements\/([^\/]+)$/, handler: handleDeleteAnnouncement },
  { method: 'POST', pattern: /^\/api\/announcements\/([^\/]+)\/like$/, handler: handleAnnouncementLike },
  { method: 'POST', pattern: /^\/api\/announcements\/([^\/]+)\/comments$/, handler: handleAnnouncementComment },
  { method: 'POST', pattern: /^\/api\/announcements\/([^\/]+)\/read$/, handler: handleAnnouncementRead },

  // Feed
  { method: 'GET', pattern: /^\/api\/feed$/, handler: handleGetFeed },
  { method: 'POST', pattern: /^\/api\/feed$/, handler: handleCreateFeed },
  { method: 'POST', pattern: /^\/api\/feed\/([^\/]+)\/like$/, handler: handleFeedLike },
  { method: 'POST', pattern: /^\/api\/feed\/([^\/]+)\/comments$/, handler: handleFeedComment },

  // Documents
  { method: 'GET', pattern: /^\/api\/documents$/, handler: handleGetDocs },
  { method: 'GET', pattern: /^\/api\/documents\/([^\/]+)$/, handler: handleGetDocumentById },
  { method: 'POST', pattern: /^\/api\/documents$/, handler: handleCreateDoc },
  { method: 'DELETE', pattern: /^\/api\/documents\/([^\/]+)$/, handler: handleDeleteDoc },
];

export default async function handler(req: any, res: any) {
  setSecurityHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limit Check
  if (!checkRateLimit(req)) {
     return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }

  try {
    const url = req.url.split('?')[0]; 
    const method = req.method;

    for (const route of routes) {
      if (route.method === method) {
        const match = url.match(route.pattern);
        if (match) {
          const params = match.slice(1);
          await route.handler(req, res, params);
          return;
        }
      }
    }

    throw new AppError(`Route not found: ${method} ${url}`, 404);

  } catch (error: any) {
    const isOperational = error instanceof AppError;
    const statusCode = isOperational ? error.statusCode : 500;
    const message = isOperational ? error.message : 'Internal Server Error';

    if (!isOperational) {
        logger.error('Unhandled Exception', { error: error.message, stack: error.stack, url: req.url });
    }

    // Explicitly return database configuration errors to the client for better DX
    if (error.message && (error.message.includes('Configuration Error') || error.message.includes('DATABASE_URL'))) {
         return res.status(500).json({ message: error.message });
    }

    return res.status(statusCode).json({ message });
  }
}
