/**
 * Unit Tests: Session & Refresh Token Service
 * Tests rotation, replay detection, expiration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '@/services/auth/sessionService';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session with 24-hour expiration', async () => {
      const mockSession = {
        id: 'session-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await SessionService.createSession({
        userId: 'user-1',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });

      expect(result.session).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('should return valid for active non-expired session', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours

      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: futureExpiry.toISOString(),
          revoked_at: null,
        },
        error: null,
      });

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(true);
      expect(result.requiresRefresh).toBe(false);
    });

    it('should suggest refresh for session expiring soon', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: soonExpiry.toISOString(),
          revoked_at: null,
        },
        error: null,
      });

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(true);
      expect(result.requiresRefresh).toBe(true);
    });

    it('should return invalid for expired session', async () => {
      const pastExpiry = new Date(Date.now() - 1000); // Past

      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: pastExpiry.toISOString(),
          revoked_at: null,
        },
        error: null,
      });

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(false);
      expect(result.requiresRefresh).toBe(true);
    });

    it('should return invalid for revoked session', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: new Date(Date.now() + 10000).toISOString(),
          revoked_at: new Date().toISOString(), // Revoked
        },
        error: null,
      });

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(false);
    });
  });

  describe('rotateRefreshToken', () => {
    it('should detect replay attack on revoked token', async () => {
      // Mock replay detection returns false
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      // Mock token is revoked (replay)
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: { revoked_at: new Date().toISOString() },
        error: null,
      });

      const result = await SessionService.rotateRefreshToken(
        'old-token',
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.replayDetected).toBe(true);
      expect(result.error?.message).toContain('replay');
    });

    it('should successfully rotate valid token', async () => {
      // Mock validation succeeds
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      // Mock old token data
      mockSupabase.from().single.mockResolvedValueOnce({
        data: {
          id: 'old-token-id',
          session_id: 'session-1',
        },
        error: null,
      });

      // Mock new token creation
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { id: 'new-token-id' },
        error: null,
      });

      const result = await SessionService.rotateRefreshToken(
        'valid-old-token',
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.newToken).toBeDefined();
      expect(result.replayDetected).toBeUndefined();
    });

    it('should reject token from wrong user', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: { revoked_at: null }, // Not revoked, just wrong user
        error: null,
      });

      const result = await SessionService.rotateRefreshToken(
        'some-token',
        'wrong-user'
      );

      expect(result.success).toBe(false);
      expect(result.replayDetected).toBe(false);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should call database function to revoke all sessions', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: null,
      });

      const result = await SessionService.revokeAllUserSessions('user-1');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'revoke_all_user_sessions',
        { _user_id: 'user-1' }
      );
    });
  });
});
