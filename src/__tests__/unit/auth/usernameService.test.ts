/**
 * Unit Tests: Username Service
 * Tests validation, collision handling, suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsernameService } from '@/services/auth/usernameService';

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('UsernameService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUsername', () => {
    it('should accept valid usernames', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await UsernameService.validateUsername('valid_user_123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject username too short', async () => {
      const result = await UsernameService.validateUsername('ab');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('3-20 characters');
    });

    it('should reject username too long', async () => {
      const result = await UsernameService.validateUsername(
        'a'.repeat(21)
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('3-20 characters');
    });

    it('should reject username with invalid characters', async () => {
      const result = await UsernameService.validateUsername('user@domain');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('letters, numbers, underscores');
    });

    it('should reject username with spaces', async () => {
      const result = await UsernameService.validateUsername('user name');

      expect(result.valid).toBe(false);
    });

    it('should detect taken username', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: { username: 'taken_user' },
        error: null,
      });

      const result = await UsernameService.validateUsername('taken_user');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already taken');
    });
  });

  describe('suggestUsername', () => {
    it('should generate username from display name', async () => {
      // Mock all checks as available
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const username = await UsernameService.suggestUsername({
        displayName: 'John Doe',
        provider: 'google',
      });

      expect(username).toMatch(/^john_doe/);
      expect(username.length).toBeGreaterThanOrEqual(3);
      expect(username.length).toBeLessThanOrEqual(20);
    });

    it('should generate username from email if no display name', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const username = await UsernameService.suggestUsername({
        email: 'user.name@example.com',
        provider: 'google',
      });

      expect(username).toMatch(/^user_name/);
    });

    it('should handle collision with numeric suffix', async () => {
      let callCount = 0;
      mockSupabase.from().maybeSingle.mockImplementation(() => {
        callCount++;
        // First call: base is taken
        // Second call: base1 is available
        return Promise.resolve({
          data: callCount === 1 ? { username: 'john_doe' } : null,
          error: null,
        });
      });

      const username = await UsernameService.suggestUsername({
        displayName: 'John Doe',
        provider: 'google',
      });

      expect(username).toBe('john_doe1');
    });

    it('should sanitize special characters', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const username = await UsernameService.suggestUsername({
        displayName: 'Jöhn@Döe#123',
        provider: 'apple',
      });

      // Should only contain valid characters
      expect(username).toMatch(/^[a-z0-9_]+$/);
    });

    it('should handle empty display name and email', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const username = await UsernameService.suggestUsername({
        provider: 'google',
      });

      expect(username).toMatch(/^user\d+/);
    });
  });

  describe('reserveUsername', () => {
    it('should reserve valid username', async () => {
      // Mock validation passes
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock update succeeds
      mockSupabase.from().eq.mockResolvedValueOnce({
        error: null,
      });

      const result = await UsernameService.reserveUsername(
        'user-1',
        'my_username'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid username', async () => {
      const result = await UsernameService.reserveUsername(
        'user-1',
        'x' // Too short
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid username');
    });

    it('should handle unique constraint violation', async () => {
      // Mock validation passes (race condition)
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock update fails with unique violation
      mockSupabase.from().eq.mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key' },
      });

      const result = await UsernameService.reserveUsername(
        'user-1',
        'taken_username'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already taken');
    });
  });
});
