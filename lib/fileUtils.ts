
// Vercel Serverless Function limit is 4.5MB for body. 
// Base64 adds ~33% overhead. 
// 3MB file * 1.33 = ~4MB, which is safe.
export const MAX_FILE_SIZE = 3 * 1024 * 1024; 

/**
 * Сжимает изображение на клиенте перед отправкой.
 * Позволяет избежать ошибок 413 Payload Too Large и экономит место в БД.
 */
export const compressImage = (file: File, maxWidth = 1280, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      // Если это не изображение, читаем как есть, но проверяем размер
      if (file.size > MAX_FILE_SIZE) {
         reject(new Error(`Файл слишком большой (>3MB). Пожалуйста, выберите файл поменьше.`));
         return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Сохраняем пропорции
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // Заливаем белым для JPEG, чтобы прозрачность не стала черной
            if (file.type === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            // Используем JPEG для фото, PNG для остального, если нужно сохранить прозрачность
            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            // Для PNG качество игнорируется браузерами, но для JPEG работает
            const base64 = canvas.toDataURL(outputType, quality);
            
            // Финальная проверка размера после сжатия
            if (base64.length > 4.2 * 1024 * 1024) {
                reject(new Error('Даже после сжатия изображение слишком большое.'));
            } else {
                resolve(base64);
            }
        } else {
            reject(new Error('Ошибка контекста канваса'));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
