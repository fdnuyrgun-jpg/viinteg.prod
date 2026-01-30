
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
  as?: 'div' | 'span' | 'p' | 'article';
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className = '', as = 'div' }) => {
  const sanitizedHtml = useMemo(() => ({
    __html: DOMPurify.sanitize(html, {
      ADD_ATTR: ['target'], // Разрешаем target="_blank" для ссылок
    })
  }), [html]);

  const Tag = as as any;

  return (
    <Tag 
      className={className}
      dangerouslySetInnerHTML={sanitizedHtml}
    />
  );
};
