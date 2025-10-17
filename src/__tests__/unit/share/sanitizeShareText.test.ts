import { describe, it, expect } from 'vitest';
import { sanitizeShareText, sanitizeShareData } from '@/lib/share/sanitizeShareText';

describe('sanitizeShareText', () => {
  it('removes heart emojis from text', () => {
    expect(sanitizeShareText('I ❤️ this post')).toBe('I  this post');
    expect(sanitizeShareText('💖 Amazing content!')).toBe('Amazing content!');
    expect(sanitizeShareText('Check this out 💕')).toBe('Check this out');
  });

  it('removes multiple heart emojis', () => {
    expect(sanitizeShareText('💖❤️💗 Love this')).toBe('Love this');
  });

  it('handles text without emojis', () => {
    expect(sanitizeShareText('Regular text')).toBe('Regular text');
  });

  it('handles empty strings', () => {
    expect(sanitizeShareText('')).toBe('');
  });

  it('removes all heart variants', () => {
    const heartsText = '❤️💖💕💗💓💞💝💟💙💚💛💜🧡🖤🤍🤎';
    expect(sanitizeShareText(heartsText)).toBe('');
  });
});

describe('sanitizeShareData', () => {
  it('sanitizes title and text in share data', () => {
    const data = {
      title: '💖 My Post',
      text: 'Check this out ❤️',
      url: 'https://example.com'
    };

    const sanitized = sanitizeShareData(data);
    
    expect(sanitized.title).toBe('My Post');
    expect(sanitized.text).toBe('Check this out');
    expect(sanitized.url).toBe('https://example.com');
  });

  it('handles missing fields', () => {
    const data = { url: 'https://example.com' };
    const sanitized = sanitizeShareData(data);
    
    expect(sanitized.title).toBeUndefined();
    expect(sanitized.text).toBeUndefined();
    expect(sanitized.url).toBe('https://example.com');
  });
});
