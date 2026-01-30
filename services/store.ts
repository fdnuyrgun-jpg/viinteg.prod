
import { User, Role, Article, Announcement, DocumentFile, Task, TaskStatus, EmployeeUpdate, Project } from '../types';

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
    try {
        let savedUser = localStorage.getItem('vinteg_user');
        let savedToken = localStorage.getItem('vinteg_token');

        if (!savedUser || !savedToken) {
            savedUser = sessionStorage.getItem('vinteg_user');
            savedToken = sessionStorage.getItem('vinteg_token');
        }
        
        if (savedUser && savedToken) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            this.currentUser = parsed as User;
            this.token = savedToken;
          } else {
             this.logout();
          }
        }
    } catch (e) {
        this.logout();
    }
  }

  private async apiRequest<T>(url: string, method: string = 'GET', body?: any, useCache = false): Promise<T> {
    // 1. Check Cache for GET requests
    if (useCache && method === 'GET') {
      const cached = this.cache.get(url);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        return JSON.parse(JSON.stringify(cached.data));
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(url, { 
        method, 
        headers, 
        body: body ? JSON.stringify(body) : undefined 
    });

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
    
    // Convert snake_case from DB to camelCase for Frontend
    const result = this.mapToCamel(data);

    if (useCache && method === 'GET') {
        this.cache.set(url, { data: result, timestamp: Date.now() });
    }
    
    // Invalidate cache on mutations
    if (method !== 'GET') this.clearCache();

    return result;
  }

  // Helper: snake_case to camelCase (recursive)
  private mapToCamel(obj: any): any {
      if (Array.isArray(obj)) return obj.map(v => this.mapToCamel(v));
      if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).reduce((result, key) => {
              const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
              result[camelKey] = this.mapToCamel(obj[key]);
              return result;
          }, {} as any);
      }
      return obj;
  }

  private clearCache() {
      this.cache.clear();
  }

  // --- PUBLIC API METHODS ---

  public async login(email: string, password: string, remember = false): Promise<User> {
    const data = await this.apiRequest<{ user: User, token: string }>('/api/auth/login', 'POST', { email, password });
    
    this.currentUser = data.user;
    this.token = data.token;

    if (remember) {
      localStorage.setItem('vinteg_user', JSON.stringify(this.currentUser));
      localStorage.setItem('vinteg_token', this.token);
    } else {
      sessionStorage.setItem('vinteg_user', JSON.stringify(this.currentUser));
      sessionStorage.setItem('vinteg_token', this.token);
    }
    return this.currentUser;
  }

  public logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('vinteg_user');
    localStorage.removeItem('vinteg_token');
    sessionStorage.removeItem('vinteg_user');
    sessionStorage.removeItem('vinteg_token');
    this.clearCache();
  }

  public getCurrentUser() { return this.currentUser; }

  public async updateCurrentUser(data: Partial<User>) {
      if (!this.currentUser) throw new Error('No user');
      const updated = await this.apiRequest<User>(`/api/users/${this.currentUser.id}`, 'PATCH', data);
      this.currentUser = updated;
      
      const storageKey = localStorage.getItem('vinteg_user') ? 'vinteg_user' : 'vinteg_user'; // Check which storage was used
      const storage = localStorage.getItem('vinteg_user') ? localStorage : sessionStorage;
      
      storage.setItem(storageKey, JSON.stringify(updated));
      this.clearCache();
      return updated;
  }

  public async changePassword(email: string, oldPass: string, newPass: string) {
      return this.apiRequest('/api/auth/change-password', 'POST', { email, oldPass, newPass });
  }

  // Users
  public async getUsers() { return this.apiRequest<User[]>('/api/users', 'GET', undefined, true); }
  public async addUser(user: any) { return this.apiRequest<User>('/api/users', 'POST', user); }
  public async deleteUser(id: string) { return this.apiRequest(`/api/users/${id}`, 'DELETE'); }

  // Projects
  public async getProjects() { return this.apiRequest<Project[]>('/api/projects', 'GET', undefined, true); }
  public async addProject(project: any) { return this.apiRequest<Project>('/api/projects', 'POST', project); }
  public async deleteProject(id: string) { return this.apiRequest(`/api/projects/${id}`, 'DELETE'); }

  // Tasks
  public async getTasks() { return this.apiRequest<Task[]>('/api/tasks', 'GET'); }
  public async addTask(task: Partial<Task>) { return this.apiRequest<Task>('/api/tasks', 'POST', task); }
  public async updateTask(id: string, data: Partial<Task>) { return this.apiRequest<Task>(`/api/tasks/${id}`, 'PATCH', data); }
  public async updateTaskStatus(id: string, status: TaskStatus) { return this.apiRequest<Task>(`/api/tasks/${id}`, 'PATCH', { status }); }
  public async deleteTask(id: string) { return this.apiRequest(`/api/tasks/${id}`, 'DELETE'); }

  // Articles (Wiki)
  public async getArticles() { return this.apiRequest<Article[]>('/api/articles', 'GET', undefined, true); }
  public async addArticle(article: Partial<Article>) { return this.apiRequest<Article>('/api/articles', 'POST', article); }
  public async updateArticle(id: string, article: Partial<Article>, userId: string) { return this.apiRequest<Article>(`/api/articles/${id}`, 'PATCH', { ...article, lastEditorId: userId }); }
  public async deleteArticle(id: string) { return this.apiRequest(`/api/articles/${id}`, 'DELETE'); }

  // Announcements
  public async getAnnouncements() { return this.apiRequest<Announcement[]>('/api/announcements', 'GET'); }
  public async addAnnouncement(ann: any) { return this.apiRequest<Announcement>('/api/announcements', 'POST', ann); }
  public async deleteAnnouncement(id: string) { return this.apiRequest(`/api/announcements/${id}`, 'DELETE'); }
  public async toggleAnnouncementLike(id: string, userId: string) { return this.apiRequest<Announcement>(`/api/announcements/${id}/like`, 'POST', { userId }); }
  
  public async addAnnouncementComment(id: string, user: User, content: string, mentions: string[]) {
      return this.apiRequest<Announcement>(`/api/announcements/${id}/comments`, 'POST', { 
        authorId: user.id, 
        authorName: user.name, 
        authorAvatar: user.avatarUrl, 
        content, 
        mentions 
      });
  }
  
  public async markAnnouncementAsRead(id: string, userId: string) {
      return this.apiRequest(`/api/announcements/${id}/read`, 'POST', { userId });
  }

  // Feed (Employee Updates)
  public async getEmployeeUpdates() { return this.apiRequest<EmployeeUpdate[]>('/api/feed', 'GET'); }
  public async addEmployeeUpdate(content: string) { return this.apiRequest<EmployeeUpdate>('/api/feed', 'POST', { content }); }
  public async toggleFeedLike(id: string, userId: string) { return this.apiRequest<EmployeeUpdate>(`/api/feed/${id}/like`, 'POST', { userId }); }
  
  public async addFeedComment(id: string, user: User, content: string, mentions: string[]) {
      return this.apiRequest<EmployeeUpdate>(`/api/feed/${id}/comments`, 'POST', { 
        authorId: user.id, 
        authorName: user.name, 
        authorAvatar: user.avatarUrl, 
        content, 
        mentions 
      });
  }

  // Documents
  public async getDocuments(role: string) { return this.apiRequest<DocumentFile[]>('/api/documents', 'GET'); }
  public async getDocument(id: string) { return this.apiRequest<DocumentFile>(`/api/documents/${id}`, 'GET'); }
  public async addDocument(doc: any) { return this.apiRequest<DocumentFile>('/api/documents', 'POST', doc); }
  public async deleteDocument(id: string) { return this.apiRequest(`/api/documents/${id}`, 'DELETE'); }
}

export const store = new StoreService();
