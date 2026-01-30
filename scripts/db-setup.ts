import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env vars from .env.local if present
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ Ошибка: DATABASE_URL не найден. Убедитесь, что он есть в .env.local');
        process.exit(1);
    }

    console.log('🔌 Подключение к базе данных Neon...');
    const sql = neon(process.env.DATABASE_URL);

    try {
        // 1. Читаем SQL схему
        const schemaPath = path.resolve(__dirname, '../backend/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Применение схемы БД...');

        // Очистка комментариев
        const cleanSql = schemaSql.replace(/--.*$/gm, '');

        // Разбивка на команды
        // Neon драйвер не поддерживает несколько команд в одном вызове (prepared statements error)
        // Поэтому мы разбиваем их вручную
        const parts = cleanSql.split(';');
        let buffer = '';

        for (const part of parts) {
            if (!part.trim()) continue;

            buffer += part + ';';

            // Проверяем, не находимся ли мы внутри блока $$ (для DO блоков)
            const dollarCount = (buffer.match(/\$\$/g) || []).length;
            
            // Если количество $$ четное, значит блок закрыт (или его нет)
            if (dollarCount % 2 === 0) {
                try {
                    await sql([buffer] as any);
                    process.stdout.write('.'); // Progress indicator
                } catch (e: any) {
                    console.error('\n❌ Ошибка в команде:', buffer.substring(0, 50) + '...');
                    console.error(e.message);
                    process.exit(1);
                }
                buffer = '';
            }
        }
        console.log('\n✅ Таблицы синхронизированы.');

        // 2. Создаем дефолтного админа
        console.log('👤 Проверка/Создание супер-админа...');

        // Создаем департамент Admin
        await sql`
            INSERT INTO departments (id, name) 
            VALUES ('00000000-0000-0000-0000-000000000001', 'Administration')
            ON CONFLICT (name) DO NOTHING;
        `;

        // Генерируем хеш для пароля 'admin123'
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.default.genSalt(10);
        const dynamicHash = await bcrypt.default.hash('admin123', salt);

        // Создаем пользователя
        await sql`
            INSERT INTO users (email, password_hash, name, role, position, department, avatar_url, is_active)
            VALUES (
                'admin@corppulse.com',
                ${dynamicHash},
                'Super Admin',
                'ADMIN',
                'System Administrator',
                'Administration',
                'https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff',
                true
            )
            ON CONFLICT (email) DO NOTHING;
        `;

        console.log('✅ Администратор готов.');
        console.log('📧 Email: admin@corppulse.com');
        console.log('🔑 Pass: admin123');

    } catch (err) {
        console.error('\n❌ Ошибка при настройке БД:', err);
        process.exit(1);
    }
};

run();