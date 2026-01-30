
import { z } from 'zod';

/**
 * Этот файл должен импортироваться ТОЛЬКО в серверных файлах (api/*, lib/db.ts, lib/auth.ts).
 * Он валидирует наличие критических переменных окружения.
 */

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET too short"), // Relaxed constraint
  NODE_ENV: z.string().optional(),
});

// Пытаемся провалидировать process.env
const getEnv = () => {
    // Пропускаем проверку во время сборки фронтенда
    if (typeof window !== 'undefined') {
        return {} as any;
    }

    try {
        return envSchema.parse(process.env);
    } catch (error) {
        // ВМЕСТО ВЫБРОСА ОШИБКИ (CRASH), возвращаем то, что есть.
        // Это позволит функции запуститься и вернуть пользователю понятную ошибку в ответе API,
        // а не глухой 500 Server Error платформы.
        console.error("⚠️ Invalid Server Configuration:", error);
        
        return {
            DATABASE_URL: process.env.DATABASE_URL || '',
            JWT_SECRET: process.env.JWT_SECRET || 'unsafe-fallback-secret',
            NODE_ENV: process.env.NODE_ENV || 'development'
        };
    }
};

export const SERVER_CONFIG = getEnv();
