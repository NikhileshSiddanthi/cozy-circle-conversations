/**
 * Sanitize share text by removing heart emojis and other symbols
 * that might appear in social share previews
 */
export function sanitizeShareText(text: string): string {
  if (!text) return '';
  
  // Remove common heart emojis and love-related symbols
  const heartPattern = /(❤️|💖|💕|💗|💓|💞|💝|💟|💙|💚|💛|💜|🧡|🖤|🤍|🤎|❤|♥️|♥)/g;
  
  return text.replace(heartPattern, '').trim();
}

/**
 * Sanitize share data object for Web Share API
 */
export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export function sanitizeShareData(data: ShareData): ShareData {
  return {
    title: data.title ? sanitizeShareText(data.title) : undefined,
    text: data.text ? sanitizeShareText(data.text) : undefined,
    url: data.url,
  };
}
