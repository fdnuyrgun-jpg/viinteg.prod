

export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: Role;
  position: string;
  department: string;
  avatarUrl: string;
  isActive?: boolean;
  favorites?: string[]; // Array of article IDs
}

export interface ArticleAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url?: string;
  data?: string; // base64 content
}

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Article {
  id: string; // UUID
  title: string;
  content: string; // HTML
  category: string; // Department
  folder?: string; // Sub-folder inside department
  authorId: string;
  lastEditorId?: string;
  createdAt: string; // ISO Date
  updatedAt?: string; // ISO Date
  tags: string[];
  attachments: ArticleAttachment[];
  views: number;
  isPinned?: boolean;
  isVerified?: boolean;
  status: ArticleStatus;
}

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string; // Sanitized HTML
  date: string;
  mentions?: string[]; // User IDs mentioned
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  date: string;
  isPinned?: boolean;
  likes: number;
  likedBy: string[]; // User IDs
  comments: FeedComment[];
  readBy?: string[]; // User IDs who read it
}

export interface EmployeeUpdate {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  date: string;
  likes: number;
  likedBy: string[]; // User IDs
  comments: FeedComment[];
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  date: string;
  accessLevel: Role;
  data?: string; // base64 content for real downloads
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  ownerId: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  assigneeName?: string;
  projectId?: string; // Relation to Project
  projectName?: string; // Joined field from API
  dueDate?: string;
  comments?: FeedComment[];
}

export type View = 'dashboard' | 'team' | 'knowledge' | 'documents' | 'tasks' | 'admin' | 'profile' | 'login';