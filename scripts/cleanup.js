
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const filesToDelete = [
  'api/tasks.ts',
  'api/auth/login.ts',
  'api/users.ts',
  'api/articles.ts',
  'api/announcements.ts',
  'api/feed.ts',
  'api/documents.ts',
  'api/auth/change-password.ts',
  'api/tasks/[id].ts',
  'api/announcements/[id]/like.ts',
  'api/announcements/[id]/comments.ts',
  'api/articles/[id].ts',
  'api/users/[id].ts',
  'api/announcements/[id]/read.ts',
  'api/feed/[id]/like.ts',
  'api/feed/[id]/comments.ts',
  'api/documents/[id].ts'
];

console.log('🧹 Начинаем очистку устаревших файлов API...');

filesToDelete.forEach(file => {
  const fullPath = path.join(rootDir, file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Удален: ${file}`);
    } else {
        console.log(`⚠️  Не найден (уже удален): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при удалении ${file}:`, error.message);
  }
});

// Удаляем пустые директории, если они остались
const dirsToClean = [
    'api/auth',
    'api/tasks',
    'api/announcements/[id]',
    'api/announcements',
    'api/articles',
    'api/users',
    'api/feed/[id]',
    'api/feed',
    'api/documents'
];

dirsToClean.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    try {
        if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length === 0) {
            fs.rmdirSync(fullPath);
            console.log(`📂 Удалена пустая папка: ${dir}`);
        }
    } catch (e) {}
});

console.log('✨ Очистка завершена! API теперь работает через api/index.ts');
