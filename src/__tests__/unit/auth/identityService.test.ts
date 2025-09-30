/**
 * Unit Tests: Identity Resolution Service
 * Tests (provider, sub) primary key resolution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityService } from '@/services/auth/identityService';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('IdentityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOrCreateIdentity', () => {
    it('should return existing identity by (provider, sub)', async () => {
      const existingIdentity = {
        id: '123',
        user_id: 'user-1',
        provider: 'google',
        provider_sub: 'google-sub-123',
        email: 'user@example.com',
        email_verified: true,
      };

      // Mock finding existing
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: existingIdentity,
        error: null,
      });

      // Mock update
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { ...existingIdentity, updated_at: new Date().toISOString() },
        error: null,
      });

      const result = await IdentityService.findOrCreateIdentity({
        provider: 'google',
        provider_sub: 'google-sub-123',
        email: 'user@example.com',
        email_verified: true,
        raw_profile: {},
      });

      expect(result.isNew).toBe(false);
      expect(result.identity.provider).toBe('google');
      expect(result.identity.provider_sub).toBe('google-sub-123');
    });

    it('should create new identity if not found', async () => {
      // Mock not finding existing
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock creation
      const newIdentity = {
        id: 'new-id',
        user_id: 'user-1',
        provider: 'apple',
        provider_sub: 'apple-sub-456',
        email: 'user@privaterelay.appleid.com',
        email_verified: true,
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: newIdentity,
        error: null,
      });

      const result = await IdentityService.findOrCreateIdentity({
        provider: 'apple',
        provider_sub: 'apple-sub-456',
        email: 'user@privaterelay.appleid.com',
        email_verified: true,
        raw_profile: { name: 'John' },
        user_id: 'user-1',
      });

      expect(result.isNew).toBe(true);
      expect(result.identity.provider).toBe('apple');
    });

    it('should update email when provider email changes', async () => {
      const existingIdentity = {
        id: '123',
        user_id: 'user-1',
        provider: 'google' as const,
        provider_sub: 'google-sub-123',
        email: 'old@example.com',
        email_verified: true,
      };

      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: existingIdentity,
        error: null,
      });

      const updatedIdentity = {
        ...existingIdentity,
        email: 'new@example.com',
      };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: updatedIdentity,
        error: null,
      });

      const result = await IdentityService.findOrCreateIdentity({
        provider: 'google',
        provider_sub: 'google-sub-123',
        email: 'new@example.com',
        email_verified: true,
        raw_profile: {},
      });

      expect(result.identity.email).toBe('new@example.com');
      expect(result.isNew).toBe(false);
    });

    it('should require user_id for new identity creation', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await IdentityService.findOrCreateIdentity({
        provider: 'google',
        provider_sub: 'google-sub-789',
        email: 'user@example.com',
        email_verified: true,
        raw_profile: {},
        // Missing user_id
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('user_id required');
    });
  });

  describe('linkIdentity', () => {
    it('should prevent linking identity already used by another user', async () => {
      // Mock identity exists for different user
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: { user_id: 'other-user' },
        error: null,
      });

      const result = await IdentityService.linkIdentity({
        userId: 'current-user',
        provider: 'google',
        provider_sub: 'google-sub-123',
        email: 'user@example.com',
        email_verified: true,
        raw_profile: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already linked');
    });

    it('should allow linking new provider to user', async () => {
      // Mock identity doesn't exist
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock successful creation
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockSupabase.from().single.mockResolvedValueOnce({
        data: {
          id: 'new-link',
          user_id: 'user-1',
          provider: 'apple',
          provider_sub: 'apple-sub-456',
        },
        error: null,
      });

      const result = await IdentityService.linkIdentity({
        userId: 'user-1',
        provider: 'apple',
        provider_sub: 'apple-sub-456',
        email: 'user@example.com',
        email_verified: true,
        raw_profile: {},
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unlinkIdentity', () => {
    it('should prevent unlinking last authentication method', async () => {
      // Mock user has only one identity
      mockSupabase.from().order.mockResolvedValueOnce({
        data: [{ id: '1', provider: 'google' }],
        error: null,
      });

      const result = await IdentityService.unlinkIdentity('user-1', 'google');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('last authentication');
    });

    it('should allow unlinking when multiple methods exist', async () => {
      // Mock user has multiple identities
      mockSupabase.from().order.mockResolvedValueOnce({
        data: [
          { id: '1', provider: 'google' },
          { id: '2', provider: 'apple' },
        ],
        error: null,
      });

      // Mock deletion
      mockSupabase.from().delete.mockResolvedValueOnce({
        error: null,
      });

      const result = await IdentityService.unlinkIdentity('user-1', 'google');

      expect(result.success).toBe(true);
    });
  });

  describe('checkEmailConflict', () => {
    it('should detect email used by another account', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: { user_id: 'other-user' },
        error: null,
      });

      const result = await IdentityService.checkEmailConflict(
        'conflict@example.com',
        'current-user'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.existingUserId).toBe('other-user');
    });

    it('should allow email not used by others', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await IdentityService.checkEmailConflict(
        'unique@example.com',
        'current-user'
      );

      expect(result.hasConflict).toBe(false);
    });
  });
});
