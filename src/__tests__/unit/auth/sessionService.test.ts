/**
 * Unit Tests: Session & Refresh Token Service
 * Tests rotation, replay detection, expiration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '@/services/auth/sessionService';

// Create mock query builder
const createMockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
});

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => createMockQueryBuilder()),
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

      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.single.mockResolvedValueOnce({
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
      const futureExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000);

      const mockQuery1 = createMockQueryBuilder();
      const mockQuery2 = createMockQueryBuilder();
      
      mockSupabase.from.mockReturnValueOnce(mockQuery1);
      mockQuery1.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: futureExpiry.toISOString(),
          revoked_at: null,
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(mockQuery2);

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(true);
      expect(result.requiresRefresh).toBe(false);
    });

    it('should suggest refresh for session expiring soon', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000);

      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
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
      const pastExpiry = new Date(Date.now() - 1000);

      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
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
      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'session-1',
          expires_at: new Date(Date.now() + 10000).toISOString(),
          revoked_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await SessionService.validateSession('session-1');

      expect(result.valid).toBe(false);
    });
  });

  describe('rotateRefreshToken', () => {
    it('should detect replay attack on revoked token', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
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
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const mockQuery1 = createMockQueryBuilder();
      const mockQuery2 = createMockQueryBuilder();
      const mockQuery3 = createMockQueryBuilder();
      const mockQuery4 = createMockQueryBuilder();
      
      mockSupabase.from.mockReturnValueOnce(mockQuery1);
      mockQuery1.single.mockResolvedValueOnce({
        data: {
          id: 'old-token-id',
          session_id: 'session-1',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(mockQuery2);
      mockSupabase.from.mockReturnValueOnce(mockQuery3);
      mockQuery3.single.mockResolvedValueOnce({
        data: { id: 'new-token-id' },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(mockQuery4);

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

      const mockQuery = createMockQueryBuilder();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
        data: { revoked_at: null },
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
