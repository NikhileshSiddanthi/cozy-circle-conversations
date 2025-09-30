/**
 * Session & Refresh Token Management
 * Implements rotating refresh tokens with replay detection
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserSession, RefreshToken } from './types';

export class SessionService {
  private static readonly SESSION_DURATION_HOURS = 24;
  private static readonly REFRESH_TOKEN_DURATION_DAYS = 30;

  /**
   * Create new session with refresh token
   */
  static async createSession(params: {
    userId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ session: UserSession; error?: Error }> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS);

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: params.userId,
          expires_at: expiresAt.toISOString(),
          user_agent: params.userAgent || null,
          ip_address: params.ipAddress || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      return { session: session as UserSession };
    } catch (error) {
      return {
        session: null as any,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate session and refresh if needed
   */
  static async validateSession(sessionId: string): Promise<{
    valid: boolean;
    session?: UserSession;
    requiresRefresh?: boolean;
  }> {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .is('revoked_at', null)
        .maybeSingle();

      if (error || !session) {
        return { valid: false };
      }

      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      // Session expired
      if (now >= expiresAt) {
        return { valid: false, requiresRefresh: true };
      }

      // Session expires soon (within 1 hour) - suggest refresh
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const requiresRefresh = expiresAt <= oneHourFromNow;

      // Update last activity
      if (!requiresRefresh) {
        await supabase
          .from('sessions')
          .update({ last_activity_at: now.toISOString() })
          .eq('id', sessionId);
      }

      return {
        valid: true,
        session: session as UserSession,
        requiresRefresh,
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Revoke session and all associated refresh tokens
   */
  static async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      const now = new Date().toISOString();

      // Revoke session
      await supabase
        .from('sessions')
        .update({ revoked_at: now })
        .eq('id', sessionId);

      // Revoke all refresh tokens for this session
      await supabase
        .from('refresh_tokens')
        .update({ revoked_at: now })
        .eq('session_id', sessionId)
        .is('revoked_at', null);

      return { success: true };
    } catch (error) {
      console.error('Session revocation error:', error);
      return { success: false };
    }
  }

  /**
   * Revoke all sessions for a user (logout everywhere / security breach)
   */
  static async revokeAllUserSessions(userId: string): Promise<{ success: boolean }> {
    try {
      // Use the database function for atomic operation
      const { error } = await supabase.rpc('revoke_all_user_sessions', {
        _user_id: userId,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('User session revocation error:', error);
      return { success: false };
    }
  }

  /**
   * Generate hash for refresh token storage
   * In production, use crypto.subtle.digest or similar
   */
  private static async hashToken(token: string): Promise<string> {
    // Simple hash for demo - use proper crypto in production
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create rotating refresh token
   */
  static async createRefreshToken(params: {
    userId: string;
    sessionId: string;
    previousTokenId?: string;
  }): Promise<{ token: string; tokenId: string; error?: Error }> {
    try {
      // Generate secure random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const tokenHash = await this.hashToken(token);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_DURATION_DAYS);

      // If there's a previous token, mark it as chained
      if (params.previousTokenId) {
        await supabase
          .from('refresh_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', params.previousTokenId);
      }

      const { data: refreshToken, error: createError } = await supabase
        .from('refresh_tokens')
        .insert({
          user_id: params.userId,
          session_id: params.sessionId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          previous_token_id: params.previousTokenId || null,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      return { token, tokenId: refreshToken.id };
    } catch (error) {
      return {
        token: '',
        tokenId: '',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Rotate refresh token (use old token to get new one)
   * Detects replay attacks via token chaining
   */
  static async rotateRefreshToken(
    oldToken: string,
    userId: string
  ): Promise<{
    success: boolean;
    newToken?: string;
    tokenId?: string;
    sessionId?: string;
    replayDetected?: boolean;
    error?: Error;
  }> {
    try {
      const oldTokenHash = await this.hashToken(oldToken);

      // Check for replay attack using database function
      const { data: isValid, error: checkError } = await supabase.rpc(
        'check_refresh_token_replay',
        {
          _token_hash: oldTokenHash,
          _user_id: userId,
        }
      );

      if (checkError) throw checkError;

      if (!isValid) {
        // Check if it was replay or just invalid
        const { data: token } = await supabase
          .from('refresh_tokens')
          .select('revoked_at')
          .eq('token_hash', oldTokenHash)
          .maybeSingle();

        const replayDetected = token?.revoked_at !== null;

        return {
          success: false,
          replayDetected,
          error: new Error(
            replayDetected 
              ? 'Refresh token replay detected. All sessions revoked.' 
              : 'Invalid or expired refresh token'
          ),
        };
      }

      // Get the old token details
      const { data: oldTokenData } = await supabase
        .from('refresh_tokens')
        .select('id, session_id')
        .eq('token_hash', oldTokenHash)
        .single();

      if (!oldTokenData) {
        throw new Error('Token not found after validation');
      }

      // Create new token (rotation)
      const result = await this.createRefreshToken({
        userId,
        sessionId: oldTokenData.session_id,
        previousTokenId: oldTokenData.id,
      });

      if (result.error) {
        throw result.error;
      }

      // Log refresh event
      await supabase.from('auth_events').insert({
        user_id: userId,
        event_type: 'REFRESH',
        metadata: { session_id: oldTokenData.session_id },
      });

      return {
        success: true,
        newToken: result.token,
        tokenId: result.tokenId,
        sessionId: oldTokenData.session_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
