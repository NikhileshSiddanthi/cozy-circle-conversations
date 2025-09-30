/**
 * Identity Resolution Service
 * Primary key: (provider, provider_sub)
 * Email is NOT used for identity resolution
 */

import { supabase } from '@/integrations/supabase/client';
import type { AuthIdentity, OAuthProvider } from './types';

export class IdentityService {
  /**
   * Find or create identity by (provider, sub)
   * This is the PRIMARY identity resolution method
   */
  static async findOrCreateIdentity(params: {
    provider: OAuthProvider;
    provider_sub: string;
    email: string | null;
    email_verified: boolean;
    raw_profile: Record<string, unknown>;
    user_id?: string;
  }): Promise<{ identity: AuthIdentity; isNew: boolean; error?: Error }> {
    try {
      // First, try to find existing identity by (provider, sub)
      const { data: existing, error: findError } = await supabase
        .from('auth_identities')
        .select('*')
        .eq('provider', params.provider)
        .eq('provider_sub', params.provider_sub)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      // Identity exists - update profile data
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('auth_identities')
          .update({
            email: params.email,
            email_verified: params.email_verified,
            raw_profile: params.raw_profile as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return { identity: updated as AuthIdentity, isNew: false };
      }

      // New identity - create it
      if (!params.user_id) {
        throw new Error('user_id required for new identity creation');
      }

      const { data: created, error: createError } = await supabase
        .from('auth_identities')
        .insert([{
          user_id: params.user_id,
          provider: params.provider,
          provider_sub: params.provider_sub,
          email: params.email,
          email_verified: params.email_verified,
          raw_profile: params.raw_profile as any,
        }])
        .select()
        .single();

      if (createError) throw createError;

      return { identity: created as AuthIdentity, isNew: true };
    } catch (error) {
      return { 
        identity: null as any, 
        isNew: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
    }
  }

  /**
   * Get all identities for a user
   */
  static async getUserIdentities(userId: string): Promise<AuthIdentity[]> {
    const { data, error } = await supabase
      .from('auth_identities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching identities:', error);
      return [];
    }

    return data as AuthIdentity[];
  }

  /**
   * Check if email is already used by another account
   * Used for account linking validation
   */
  static async checkEmailConflict(
    email: string,
    currentUserId: string
  ): Promise<{ hasConflict: boolean; existingUserId?: string }> {
    const { data, error } = await supabase
      .from('auth_identities')
      .select('user_id')
      .eq('email', email)
      .neq('user_id', currentUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking email conflict:', error);
      return { hasConflict: false };
    }

    return {
      hasConflict: !!data,
      existingUserId: data?.user_id,
    };
  }

  /**
   * Link new provider identity to existing user
   * Requires recent authentication
   */
  static async linkIdentity(params: {
    userId: string;
    provider: OAuthProvider;
    provider_sub: string;
    email: string | null;
    email_verified: boolean;
    raw_profile: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: Error }> {
    try {
      // Check if this provider identity is already linked to another account
      const { data: existing } = await supabase
        .from('auth_identities')
        .select('user_id')
        .eq('provider', params.provider)
        .eq('provider_sub', params.provider_sub)
        .maybeSingle();

      if (existing && existing.user_id !== params.userId) {
        throw new Error('This provider account is already linked to another user');
      }

      // Create the identity link
      const result = await this.findOrCreateIdentity({
        ...params,
        user_id: params.userId,
      });

      if (result.error) {
        throw result.error;
      }

      // Log the linking event
      await supabase.from('auth_events').insert({
        user_id: params.userId,
        event_type: 'LINK',
        provider: params.provider,
        metadata: { provider_sub: params.provider_sub },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Unlink provider identity from user
   * Requires at least one other auth method
   */
  static async unlinkIdentity(
    userId: string,
    provider: OAuthProvider
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      // Check how many identities user has
      const identities = await this.getUserIdentities(userId);
      
      if (identities.length <= 1) {
        throw new Error('Cannot unlink last authentication method');
      }

      // Delete the identity
      const { error: deleteError } = await supabase
        .from('auth_identities')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      if (deleteError) throw deleteError;

      // Log the unlinking event
      await supabase.from('auth_events').insert({
        user_id: userId,
        event_type: 'UNLINK',
        provider,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
