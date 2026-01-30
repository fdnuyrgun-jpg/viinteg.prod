
import { z } from 'zod';

// Shared Validation Schemas

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Имя слишком короткое").max(50),
  email: z.string().email("Некорректный email"),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  position: z.string().min(2),
  department: z.string(),
  avatarUrl: z.string().optional(),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов").optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const TaskSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  assignee_name: z.string().optional(),
  due_date: z.string().optional(),
  author_id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional() // Allow null to unassign project
});

export const ArticleSchema = z.object({
  title: z.string().min(5, "Заголовок должен быть не менее 5 символов").max(100),
  content: z.string().min(10, "Контент слишком короткий"),
  category: z.string(),
  folder: z.string().optional(),
  author_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const AnnouncementSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
  isPinned: z.boolean().optional(),
});

export const ChangePasswordSchema = z.object({
  email: z.string().email(),
  oldPass: z.string(),
  newPass: z.string().min(6)
});

export const ProjectSchema = z.object({
  name: z.string().min(3, "Название проекта слишком короткое"),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'on-hold']).optional(),
  owner_id: z.string().uuid().optional()
});
