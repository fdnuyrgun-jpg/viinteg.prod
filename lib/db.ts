
import { neon } from '@neondatabase/serverless';
import { SERVER_CONFIG } from './server-config';

let sqlClient: any = null;

// Ленивая инициализация клиента
// Если DATABASE_URL нет, ошибка вылетит только при попытке сделать запрос, 
// что позволит нам перехватить её и показать на фронтенде.
const getClient = () => {
    if (sqlClient) return sqlClient;

    if (!SERVER_CONFIG.DATABASE_URL) {
        throw new Error("Configuration Error: DATABASE_URL is missing. Please check your .env.local or Vercel Environment Variables.");
    }
    
    try {
        sqlClient = neon(SERVER_CONFIG.DATABASE_URL);
        return sqlClient;
    } catch (e: any) {
        throw new Error(`Database Init Error: ${e.message}`);
    }
};

// Прокси-функция для выполнения запросов
export const sql = ((strings: any, ...values: any[]) => {
    const client = getClient();
    return client(strings, ...values);
}) as any;

/**
 * Хелпер для маппинга ключей объекта из camelCase в snake_case перед отправкой в БД
 */
export function toSnakeCase(obj: any) {
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}
