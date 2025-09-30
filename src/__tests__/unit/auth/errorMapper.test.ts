/**
 * Unit Tests: Auth Error Mapper
 * Tests user-friendly error message generation
 */

import { describe, it, expect } from 'vitest';
import { AuthErrorMapper } from '@/services/auth/errorMapper';

describe('AuthErrorMapper', () => {
  describe('mapOAuthError', () => {
    it('should map user cancellation', () => {
      const error = new Error('access_denied');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Sign-in Cancelled');
      expect(mapped.canRetry).toBe(true);
      expect(mapped.requiresSupport).toBe(false);
      expect(mapped.action).toContain('try again');
    });

    it('should map expired authorization code', () => {
      const error = new Error('invalid_grant: code expired');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Authorization Expired');
      expect(mapped.canRetry).toBe(true);
    });

    it('should map state mismatch (CSRF attempt)', () => {
      const error = new Error('state parameter mismatch');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Security Check Failed');
      expect(mapped.message).toContain('could not be verified');
    });

    it('should map network errors', () => {
      const error = new Error('fetch failed: network timeout');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Connection Issue');
      expect(mapped.message).toContain('connect');
      expect(mapped.canRetry).toBe(true);
    });

    it('should map consent revoked', () => {
      const error = new Error('consent_required');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Permission Required');
      expect(mapped.action).toContain('approve');
    });

    it('should map Apple private relay issues', () => {
      const error = new Error('privaterelay email delivery failed');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Email Delivery Issue');
      expect(mapped.message).toContain('Private Relay');
      expect(mapped.requiresSupport).toBe(true);
    });

    it('should map account linking conflicts', () => {
      const error = new Error('provider already linked to another user');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Account Already Linked');
      expect(mapped.canRetry).toBe(false);
      expect(mapped.requiresSupport).toBe(true);
    });

    it('should map rate limiting', () => {
      const error = new Error('rate limit exceeded');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Too Many Attempts');
      expect(mapped.action).toContain('Wait');
      expect(mapped.canRetry).toBe(true);
    });

    it('should map refresh token replay', () => {
      const error = new Error('refresh token replay detected');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Security Alert');
      expect(mapped.message).toContain('Suspicious activity');
      expect(mapped.requiresSupport).toBe(true);
    });

    it('should provide generic fallback for unknown errors', () => {
      const error = new Error('some_unknown_error_code');
      const mapped = AuthErrorMapper.mapOAuthError(error);

      expect(mapped.title).toBe('Sign-in Failed');
      expect(mapped.canRetry).toBe(true);
      expect(mapped.action).toContain('try again');
    });
  });

  describe('mapEmailAuthError', () => {
    it('should map invalid credentials', () => {
      const error = new Error('Invalid login credentials');
      const mapped = AuthErrorMapper.mapEmailAuthError(error);

      expect(mapped.title).toBe('Invalid Credentials');
      expect(mapped.message).toContain('Incorrect');
      expect(mapped.action).toContain('reset your password');
    });

    it('should map user not found', () => {
      const error = new Error('User not found');
      const mapped = AuthErrorMapper.mapEmailAuthError(error);

      expect(mapped.title).toBe('Account Not Found');
      expect(mapped.action).toContain('Sign up');
      expect(mapped.canRetry).toBe(false);
    });

    it('should map email not confirmed', () => {
      const error = new Error('Email not confirmed');
      const mapped = AuthErrorMapper.mapEmailAuthError(error);

      expect(mapped.title).toBe('Email Not Verified');
      expect(mapped.action).toContain('confirmation email');
    });
  });
});
