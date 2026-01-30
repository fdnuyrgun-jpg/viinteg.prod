
import { neon } from '@neondatabase/serverless';
import { SERVER_CONFIG } from './server-config';

// SERVER_CONFIG гарантирует, что URL есть (или выбросит ошибку при инициализации)
export const sql = neon(SERVER_CONFIG.DATABASE_URL);

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
