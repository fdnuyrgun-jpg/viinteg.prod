
import { z } from 'zod';

/**
 * Этот файл должен импортироваться ТОЛЬКО в серверных файлах (api/*, lib/db.ts, lib/auth.ts).
 * Он валидирует наличие критических переменных окружения.
 */

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long for security"),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Пытаемся провалидировать process.env
// Если валидация не проходит, выбрасываем понятную ошибку, которая будет видна в логах Vercel
const getEnv = () => {
    // Пропускаем проверку во время сборки фронтенда, так как там нет серверных env
    if (typeof window !== 'undefined') {
        throw new Error("SERVER_CONFIG should not be imported on the client side!");
    }

    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map(i => i.path.join('.')).join(', ');
            console.error(`❌ CRITICAL: Invalid environment configuration. Missing or invalid: ${missingVars}`);
            // В продакшене лучше упасть сразу, чем работать небезопасно
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Invalid Server Configuration: ${missingVars}`);
            }
        }
        // Возвращаем fallback для dev-режима, чтобы не ломать локальный запуск без полного .env
        console.warn("⚠️ Using fallback configuration for development");
        return {
            DATABASE_URL: process.env.DATABASE_URL || '',
            JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-fallback-minimum-32-chars-long',
            NODE_ENV: 'development'
        };
    }
};

export const SERVER_CONFIG = getEnv();
