
import { User, Role, Article, Announcement, DocumentFile, Task, TaskStatus, EmployeeUpdate, Project } from '../types';
import { UserSchema } from '../lib/schemas';

class StoreService {
  private currentUser: User | null = null;
  private token: string | null = null;
  
  // Simple in-memory cache
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 60 * 1000; // 1 minute cache duration

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    // Check localStorage first (persistent), then sessionStorage (tab only)
    try {
        let savedUser = localStorage.getItem('vinteg_user');
        let savedToken = localStorage.getItem('vinteg_token');

        if (!savedUser || !savedToken) {
            savedUser = sessionStorage.getItem('vinteg_user');
            savedToken = sessionStorage.getItem('vinteg_token');
        }
        
        if (savedUser && savedToken) {
          const parsed = JSON.parse(savedUser);
          // Loose validation for restored session
          if (parsed && parsed.id && parsed.email) {
            this.currentUser = parsed as User;
            this.token = savedToken;
          } else {
             this.logout();
          }
        }
    } catch (e) {
        console.warn('Session restore failed, clearing storage');
        this.logout();
    }
  }

  private async apiRequest<T>(url: string, method: string = 'GET', body?: any, useCache = false): Promise<T> {
    // 1. Check Cache for GET requests
    if (useCache && method === 'GET') {
      const cached = this.cache.get(url);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        return JSON.parse(JSON.stringify(cached.data)); // Return copy to prevent mutation
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    
    // Auto logout on 401
    if (response.status === 401) {
      this.logout();
      window.location.reload(); 
      throw new Error('Сессия истекла');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Ошибка сервера: ${response.status}`);
    }

    if (response.status === 204) {
      if (method !== 'GET') this.clearCache();
      return {} as T;
    }

    const data = await response.json();
    const result = this.mapToCamel(data);

    // 2. Set Cache
    if (useCache && method === 'GET') {
      this.cache.set(url, { data: result, timestamp: Date.now() });
    }
    
    // 3. Invalidate Cache on Mutations
    // Aggressive invalidation: clear everything on any write operation to ensure consistency
    if (method !== 'GET') {
       this.clearCache(); 
    }

    return result;
  }

  private clearCache() {
      this.cache.clear();
  }

  private mapToCamel(obj: any): any {
    if (Array.isArray(obj)) return obj.map(v => this.mapToCamel(v));
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        acc[camelKey] = this.mapToCamel(obj[key]);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  // --- AUTH ---
  async login(email: string, password?: string, rememberMe: boolean = false): Promise<User> {
    const response = await this.apiRequest<{ user: User, token: string }>('/api/auth/login', 'POST', { email, password });
    this.currentUser = response.user;
    this.token = response.token;
    
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Clear other storage to avoid conflicts
    if (rememberMe) {
        sessionStorage.removeItem('vinteg_user');
        sessionStorage.removeItem('vinteg_token');
    } else {
        localStorage.removeItem('vinteg_user');
        localStorage.removeItem('vinteg_token');
    }

    storage.setItem('vinteg_user', JSON.stringify(this.currentUser));
    storage.setItem('vinteg_token', this.token);
    
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    sessionStorage.removeItem('vinteg_user');
    sessionStorage.removeItem('vinteg_token');
    localStorage.removeItem('vinteg_user');
    localStorage.removeItem('vinteg_token');
    this.clearCache();
  }

  getCurrentUser() { return this.currentUser; }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    return this.apiRequest<User[]>('/api/users', 'GET', undefined, true);
  }

  async addUser(u: any): Promise<User> {
    return this.apiRequest<User>('/api/users', 'POST', u);
  }

  async deleteUser(id: string): Promise<void> {
    await this.apiRequest(`/api/users/${id}`, 'DELETE');
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    return this.apiRequest<Project[]>('/api/projects', 'GET', undefined, true);
  }

  async addProject(p: any): Promise<Project> {
    return this.apiRequest<Project>('/api/projects', 'POST', p);
  }

  async deleteProject(id: string): Promise<void> {
    await this.apiRequest(`/api/projects/${id}`, 'DELETE');
  }

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    return this.apiRequest<Task[]>('/api/tasks', 'GET', undefined, true);
  }

  async addTask(t: any): Promise<Task> {
    const body = { 
      title: t.title,
      description: t.description,
      priority: t.priority,
      assignee_name: t.assigneeName,
      due_date: t.dueDate,
      author_id: this.currentUser?.id,
      project_id: t.projectId
    };
    return this.apiRequest<Task>('/api/tasks', 'POST', body);
  }

  async updateTask(id: string, data: any): Promise<Task> {
    return this.apiRequest<Task>(`/api/tasks/${id}`, 'PATCH', data);
  }

  async deleteTask(id: string): Promise<void> {
    await this.apiRequest(`/api/tasks/${id}`, 'DELETE');
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
    await this.apiRequest(`/api/tasks/${id}`, 'PATCH', { status });
  }

  // --- ARTICLES ---
  async getArticles(): Promise<Article[]> {
    return this.apiRequest<Article[]>('/api/articles', 'GET', undefined, true);
  }

  async addArticle(art: any): Promise<Article> {
    const body = {
      title: art.title,
      content: art.content,
      category: art.category,
      folder: art.folder,
      author_id: this.currentUser?.id,
      attachments: art.attachments
    };
    return this.apiRequest<Article>('/api/articles', 'POST', body);
  }

  async updateArticle(id: string, art: any, _userId: string): Promise<Article> {
    const body = {
      title: art.title,
      content: art.content,
      category: art.category,
      folder: art.folder,
      attachments: art.attachments
    };
    return this.apiRequest<Article>(`/api/articles/${id}`, 'PATCH', body);
  }

  // --- FEED & ANNOUNCEMENTS ---
  async getAnnouncements(): Promise<Announcement[]> {
    return this.apiRequest<Announcement[]>('/api/announcements', 'GET', undefined, true);
  }

  async addAnnouncement(a: any): Promise<Announcement> {
    return this.apiRequest<Announcement>('/api/announcements', 'POST', a);
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.apiRequest(`/api/announcements/${id}`, 'DELETE');
  }

  async toggleAnnouncementLike(id: string, userId: string): Promise<Announcement> {
    return this.apiRequest<Announcement>(`/api/announcements/${id}/like`, 'POST', { userId });
  }

  async addAnnouncementComment(id: string, user: User, content: string, mentions: string[]): Promise<Announcement> {
    const body = { 
      content, 
      mentions, 
      author_id: user.id, 
      author_name: user.name, 
      author_avatar: user.avatarUrl 
    };
    return this.apiRequest<Announcement>(`/api/announcements/${id}/comments`, 'POST', body);
  }

  async markAnnouncementAsRead(id: string, userId: string): Promise<void> {
    await this.apiRequest(`/api/announcements/${id}/read`, 'POST', { userId });
  }

  async getEmployeeUpdates(): Promise<EmployeeUpdate[]> {
    return this.apiRequest<EmployeeUpdate[]>('/api/feed', 'GET', undefined, true);
  }

  async addEmployeeUpdate(content: string): Promise<EmployeeUpdate> {
    return this.apiRequest<EmployeeUpdate>('/api/feed', 'POST', { content, author_id: this.currentUser?.id });
  }

  async toggleFeedLike(id: string, userId: string): Promise<EmployeeUpdate> {
    return this.apiRequest<EmployeeUpdate>(`/api/feed/${id}/like`, 'POST', { userId });
  }

  async addFeedComment(id: string, user: User, content: string, mentions: string[]): Promise<EmployeeUpdate> {
    const body = { 
      content, 
      mentions, 
      author_id: user.id, 
      author_name: user.name, 
      author_avatar: user.avatarUrl 
    };
    return this.apiRequest<EmployeeUpdate>(`/api/feed/${id}/comments`, 'POST', body);
  }

  // --- DOCUMENTS ---
  async getDocuments(_role: Role): Promise<DocumentFile[]> {
    return this.apiRequest<DocumentFile[]>('/api/documents', 'GET', undefined, true);
  }

  async getDocument(id: string): Promise<DocumentFile> {
    return this.apiRequest<DocumentFile>(`/api/documents/${id}`, 'GET');
  }

  async addDocument(doc: any): Promise<DocumentFile> {
    const body = {
      filename: doc.name,
      mime_type: doc.type,
      file_size_bytes: 0,
      uploaded_by: this.currentUser?.id,
      access_role: 'employee',
      data: doc.data 
    };
    return this.apiRequest<DocumentFile>('/api/documents', 'POST', body);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.apiRequest(`/api/documents/${id}`, 'DELETE');
  }

  // --- PROFILE ---
  async changePassword(email: string, oldPass: string, newPass: string): Promise<void> {
    await this.apiRequest('/api/auth/change-password', 'POST', { email, oldPass, newPass });
  }

  async updateCurrentUser(data: any): Promise<User> {
    if (!this.currentUser) throw new Error('User not logged in');
    const user = await this.apiRequest<User>(`/api/users/${this.currentUser.id}`, 'PATCH', data);
    this.currentUser = user;
    
    // Update storage based on where it was found
    if (localStorage.getItem('vinteg_user')) {
        localStorage.setItem('vinteg_user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('vinteg_user', JSON.stringify(user));
    }
    
    return user;
  }
}

export const store = new StoreService();
