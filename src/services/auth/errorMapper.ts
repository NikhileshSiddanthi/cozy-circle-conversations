/**
 * User-Friendly Auth Error Messages
 * Maps technical errors to human-readable messages with actionable guidance
 */

export interface MappedError {
  message: string;
  title: string;
  action?: string;
  canRetry: boolean;
  requiresSupport: boolean;
}

export class AuthErrorMapper {
  /**
   * Map OAuth/OIDC errors to user-friendly messages
   */
  static mapOAuthError(error: string | Error | unknown): MappedError {
    const errorString = error instanceof Error ? error.message : String(error);
    const lowerError = errorString.toLowerCase();

    // User cancelled at provider
    if (
      lowerError.includes('access_denied') ||
      lowerError.includes('user_denied') ||
      lowerError.includes('cancelled')
    ) {
      return {
        title: 'Sign-in Cancelled',
        message: 'You cancelled the sign-in process.',
        action: 'Click "Continue with Google/Apple" to try again.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Invalid or expired authorization code
    if (
      lowerError.includes('invalid_grant') ||
      lowerError.includes('code') ||
      lowerError.includes('expired')
    ) {
      return {
        title: 'Authorization Expired',
        message: 'The sign-in link expired or was already used.',
        action: 'Please try signing in again.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // State/nonce mismatch (CSRF attempt)
    if (lowerError.includes('state') || lowerError.includes('nonce')) {
      return {
        title: 'Security Check Failed',
        message: 'The sign-in request could not be verified.',
        action: 'Please try again. If this persists, clear your browser cache.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Network/timeout issues
    if (
      lowerError.includes('network') ||
      lowerError.includes('timeout') ||
      lowerError.includes('fetch')
    ) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to the sign-in service.',
        action: 'Check your internet connection and try again.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Consent revoked
    if (lowerError.includes('consent') || lowerError.includes('revoked')) {
      return {
        title: 'Permission Required',
        message: 'You need to grant permission to continue.',
        action: 'Sign in again and approve the requested permissions.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Apple private relay email bounce
    if (
      lowerError.includes('privaterelay') ||
      lowerError.includes('relay email')
    ) {
      return {
        title: 'Email Delivery Issue',
        message: 'Cannot send to Apple Private Relay address.',
        action: 'Update your Apple ID settings to share your real email.',
        canRetry: false,
        requiresSupport: true,
      };
    }

    // Account linking errors
    if (lowerError.includes('already linked')) {
      return {
        title: 'Account Already Linked',
        message: 'This provider account is already connected to another user.',
        action: 'Sign in with that provider or use a different account.',
        canRetry: false,
        requiresSupport: true,
      };
    }

    if (lowerError.includes('email conflict')) {
      return {
        title: 'Email Already Used',
        message: 'This email is already associated with another account.',
        action: 'Sign in to that account first, then link this provider.',
        canRetry: false,
        requiresSupport: false,
      };
    }

    // Rate limiting
    if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
      return {
        title: 'Too Many Attempts',
        message: 'Please wait a moment before trying again.',
        action: 'Wait 1-2 minutes, then retry.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Invalid token/session
    if (
      lowerError.includes('invalid') &&
      (lowerError.includes('token') || lowerError.includes('session'))
    ) {
      return {
        title: 'Session Expired',
        message: 'Your session has expired or is invalid.',
        action: 'Please sign in again.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    // Refresh token replay attack detected
    if (lowerError.includes('replay')) {
      return {
        title: 'Security Alert',
        message: 'Suspicious activity detected. All sessions have been signed out for your security.',
        action: 'Sign in again and change your password if you did not initiate this.',
        canRetry: true,
        requiresSupport: true,
      };
    }

    // Generic fallback
    return {
      title: 'Sign-in Failed',
      message: 'An unexpected error occurred during sign-in.',
      action: 'Please try again. If this continues, contact support.',
      canRetry: true,
      requiresSupport: true,
    };
  }

  /**
   * Map email/password auth errors
   */
  static mapEmailAuthError(error: string | Error | unknown): MappedError {
    const errorString = error instanceof Error ? error.message : String(error);
    const lowerError = errorString.toLowerCase();

    if (lowerError.includes('invalid login')) {
      return {
        title: 'Invalid Credentials',
        message: 'Incorrect email or password.',
        action: 'Check your credentials and try again, or reset your password.',
        canRetry: true,
        requiresSupport: false,
      };
    }

    if (lowerError.includes('user not found')) {
      return {
        title: 'Account Not Found',
        message: 'No account exists with this email.',
        action: 'Sign up to create an account.',
        canRetry: false,
        requiresSupport: false,
      };
    }

    if (lowerError.includes('email not confirmed')) {
      return {
        title: 'Email Not Verified',
        message: 'Please verify your email address first.',
        action: 'Check your inbox for the confirmation email.',
        canRetry: false,
        requiresSupport: true,
      };
    }

    return this.mapOAuthError(error);
  }
}
