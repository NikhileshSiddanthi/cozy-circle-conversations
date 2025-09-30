/**
 * Username Suggestion & Validation
 * Handles collisions with retry/suffix strategy
 */

import { supabase } from '@/integrations/supabase/client';
import type { UsernameValidation } from './types';

export class UsernameService {
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  private static readonly MAX_RETRY_ATTEMPTS = 5;

  /**
   * Validate username format and availability
   */
  static async validateUsername(username: string): Promise<UsernameValidation> {
    // Format validation
    if (!this.USERNAME_REGEX.test(username)) {
      return {
        valid: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscores only)',
      };
    }

    // Check availability
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('Username validation error:', error);
      return { valid: false, error: 'Unable to validate username' };
    }

    if (data) {
      return { valid: false, error: 'Username already taken' };
    }

    return { valid: true };
  }

  /**
   * Suggest username from provider profile
   * Handles collisions with suffix strategy
   */
  static async suggestUsername(params: {
    email?: string;
    displayName?: string;
    provider: 'google' | 'apple' | 'email';
  }): Promise<string> {
    // Generate base username from available data
    let base = '';

    if (params.displayName) {
      // Use display name, clean it up
      base = params.displayName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 15);
    } else if (params.email) {
      // Use email prefix
      base = params.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 15);
    } else {
      // Fallback to random
      base = 'user' + Math.floor(Math.random() * 10000);
    }

    // Ensure base is valid
    if (base.length < 3) {
      base = base + '_user';
    }

    // Try base username first
    const baseValidation = await this.validateUsername(base);
    if (baseValidation.valid) {
      return base;
    }

    // Try with suffixes
    for (let i = 1; i <= this.MAX_RETRY_ATTEMPTS; i++) {
      const candidate = `${base}${i}`;
      const validation = await this.validateUsername(candidate);
      if (validation.valid) {
        return candidate;
      }
    }

    // Last resort: random suffix
    const random = Math.floor(Math.random() * 10000);
    return `${base}_${random}`;
  }

  /**
   * Reserve username for user (atomic operation)
   */
  static async reserveUsername(
    userId: string,
    username: string
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      // Validate first
      const validation = await this.validateUsername(username);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid username');
      }

      // Update profile (will fail if username constraint violated)
      const { error } = await supabase
        .from('profiles')
        .update({ username } as any)
        .eq('user_id', userId);

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('Username already taken');
        }
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
