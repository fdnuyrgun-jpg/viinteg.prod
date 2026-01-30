
import { UserSchema } from '../lib/schemas';

// Re-export schemas for frontend convenience
export { UserSchema, ArticleSchema, AnnouncementSchema } from '../lib/schemas';

/**
 * Client-side only utilities (DOM dependent)
 */

export const sanitize = (text: string): string => {
  if (!text) return '';
  if (typeof document === 'undefined') return text; // SSR/Node safety
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const parseMentions = (text: string, users: { id: string; name: string }[]): { sanitized: string; mentions: string[] } => {
  const mentions: string[] = [];
  let processedText = sanitize(text);

  users.forEach(user => {
    const mentionTag = `@${user.name}`;
    if (processedText.includes(mentionTag)) {
      mentions.push(user.id);
      const replacement = `<span class="text-blue-600 font-bold dark:text-blue-400">@${user.name}</span>`;
      processedText = processedText.split(mentionTag).join(replacement);
    }
  });

  return { sanitized: processedText, mentions };
};
