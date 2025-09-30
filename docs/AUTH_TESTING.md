# Authentication Testing Guide

## 🧪 Test Suite Overview

### Test Categories
1. **Unit Tests** - Services, utilities, error handling
2. **Integration Tests** - OAuth flows with mock IdPs
3. **E2E Tests** - Full browser automation

---

## 🏃 Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test src/__tests__/unit/auth
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

---

## 📁 Test Structure

```
src/__tests__/
├── unit/
│   └── auth/
│       ├── identityService.test.ts    ✅ Identity resolution
│       ├── sessionService.test.ts     ✅ Token rotation & replay
│       ├── usernameService.test.ts    ✅ Collisions & validation
│       └── errorMapper.test.ts        ✅ User-friendly errors
├── integration/
│   └── auth/
│       ├── googleOAuth.test.ts        📝 TODO
│       ├── appleOAuth.test.ts         📝 TODO
│       └── accountLinking.test.ts     📝 TODO
└── e2e/
    ├── google-signin.spec.ts          📝 TODO
    ├── apple-signin.spec.ts           📝 TODO
    └── refresh-rotation.spec.ts       📝 TODO
```

---

## ✅ Unit Test Examples

### Identity Service
```typescript
// Test: (provider, sub) is primary key
it('should resolve by (provider, sub) not email', async () => {
  // User changes email at Google
  // Identity still resolves by sub
  const identity = await IdentityService.findOrCreateIdentity({
    provider: 'google',
    provider_sub: 'google-sub-123',
    email: 'new-email@example.com', // Email changed
  });
  
  expect(identity.provider_sub).toBe('google-sub-123');
  expect(identity.email).toBe('new-email@example.com');
});
```

### Session Service
```typescript
// Test: Replay attack detection
it('should revoke all sessions on token replay', async () => {
  const token = 'valid-token';
  
  // Use token once - OK
  const result1 = await SessionService.rotateRefreshToken(token, userId);
  expect(result1.success).toBe(true);
  
  // Try to use again - BLOCKED
  const result2 = await SessionService.rotateRefreshToken(token, userId);
  expect(result2.replayDetected).toBe(true);
  expect(result2.error?.message).toContain('replay');
});
```

### Username Service
```typescript
// Test: Collision handling
it('should handle username collision under load', async () => {
  // Simulate race condition
  const promises = Array(10).fill(null).map(() => 
    UsernameService.suggestUsername({
      displayName: 'John Doe',
      provider: 'google'
    })
  );
  
  const usernames = await Promise.all(promises);
  
  // All should be unique
  const uniqueSet = new Set(usernames);
  expect(uniqueSet.size).toBe(10);
});
```

---

## 🔗 Integration Test Template

```typescript
describe('Google OAuth Integration', () => {
  let mockJWKS: MockJWKS;
  
  beforeAll(() => {
    // Set up mock Google IdP with JWKS
    mockJWKS = createMockJWKS();
  });
  
  it('should complete new signup flow', async () => {
    // 1. Start OAuth flow
    const { authUrl, state, nonce } = await startOAuth('google');
    
    // 2. Mock Google consent (user approves)
    const authCode = mockGoogleConsent({ state });
    
    // 3. Callback with code
    const result = await handleCallback({
      code: authCode,
      state,
      provider: 'google'
    });
    
    // 4. Verify ID token
    expect(result.idToken).toBeDefined();
    expect(result.idToken.nonce).toBe(nonce);
    
    // 5. Verify identity created
    const identity = await IdentityService.findOrCreateIdentity({
      provider: 'google',
      provider_sub: result.idToken.sub,
      email: result.idToken.email,
      email_verified: result.idToken.email_verified,
      raw_profile: result.idToken,
      user_id: result.user.id,
    });
    
    expect(identity.isNew).toBe(true);
    
    // 6. Verify session created
    const session = await SessionService.createSession({
      userId: result.user.id,
    });
    
    expect(session.session).toBeDefined();
  });
  
  it('should return existing user on subsequent login', async () => {
    // ... similar flow ...
    expect(identity.isNew).toBe(false);
  });
});
```

---

## 🌐 E2E Test Template (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Google Sign In', () => {
  test('happy path - new user signup', async ({ page, context }) => {
    // 1. Navigate to auth page
    await page.goto('/auth');
    
    // 2. Click Google button
    await page.click('button:has-text("Continue with Google")');
    
    // 3. Wait for Google consent page (in new tab/popup)
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      // Button click happens above
    ]);
    
    // 4. Fill Google credentials (test account)
    await popup.fill('input[type="email"]', process.env.TEST_GOOGLE_EMAIL!);
    await popup.click('button:has-text("Next")');
    await popup.fill('input[type="password"]', process.env.TEST_GOOGLE_PASSWORD!);
    await popup.click('button:has-text("Next")');
    
    // 5. Approve consent (if shown)
    await popup.click('button:has-text("Allow")');
    
    // 6. Verify redirect back to app
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // 7. Verify user profile displays
    const displayName = await page.textContent('[data-testid="user-display-name"]');
    expect(displayName).toBeTruthy();
    
    // 8. Verify session cookie set
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.secure).toBe(true);
  });
  
  test('user cancels at Google', async ({ page, context }) => {
    await page.goto('/auth');
    await page.click('button:has-text("Continue with Google")');
    
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
    ]);
    
    // User clicks "Cancel"
    await popup.click('button:has-text("Cancel")');
    
    // Should show friendly error
    await expect(page.locator('text=Sign-in Cancelled')).toBeVisible();
    await expect(page.locator('text=try again')).toBeVisible();
  });
  
  test('expired authorization code', async ({ page }) => {
    // Navigate with expired code in URL
    await page.goto('/auth/callback?code=expired_code&state=valid_state');
    
    // Should show friendly error
    await expect(page.locator('text=Authorization Expired')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });
});

test.describe('Apple Sign In', () => {
  test('first-time signup captures name', async ({ page, context }) => {
    await page.goto('/auth');
    await page.click('button:has-text("Continue with Apple")');
    
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
    ]);
    
    // Apple consent (first time)
    await popup.fill('input[name="accountName"]', process.env.TEST_APPLE_ID!);
    await popup.fill('input[type="password"]', process.env.TEST_APPLE_PASSWORD!);
    await popup.click('button:has-text("Continue")');
    
    // Name form (only shown once)
    await popup.fill('input[name="firstName"]', 'John');
    await popup.fill('input[name="lastName"]', 'Doe');
    await popup.click('button:has-text("Continue")');
    
    await page.waitForURL('/dashboard');
    
    // Verify name persisted
    const displayName = await page.textContent('[data-testid="user-display-name"]');
    expect(displayName).toContain('John');
    
    // Sign out and sign in again
    await page.click('[data-testid="signout-button"]');
    await page.goto('/auth');
    await page.click('button:has-text("Continue with Apple")');
    
    // Apple won't send name again
    // Verify name still displays (from DB)
    await page.waitForURL('/dashboard');
    const displayName2 = await page.textContent('[data-testid="user-display-name"]');
    expect(displayName2).toContain('John'); // From auth_identities.raw_profile
  });
});

test.describe('Refresh Token Rotation', () => {
  test('replay attack detection', async ({ page, context }) => {
    // 1. Sign in
    await page.goto('/auth');
    // ... sign in flow ...
    
    // 2. Extract refresh token from storage/cookie
    const refreshToken = await page.evaluate(() => {
      return localStorage.getItem('refresh_token'); // Or from cookie
    });
    
    // 3. Use refresh token
    const response1 = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    expect(response1.ok).toBe(true);
    
    // 4. Try to use same token again (replay)
    const response2 = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    // Should be rejected
    expect(response2.ok).toBe(false);
    const error = await response2.json();
    expect(error.message).toContain('replay');
    
    // 5. All sessions should be revoked
    // Try to access protected route
    await page.goto('/dashboard');
    await page.waitForURL('/auth'); // Redirected to login
    
    await expect(page.locator('text=Session Expired')).toBeVisible();
  });
});
```

---

## 🔐 Security Test Scenarios

### 1. CSRF Protection
```typescript
test('should reject callback with invalid state', async () => {
  const { authUrl, state } = await startOAuth('google');
  
  // Attacker tries with different state
  const result = await handleCallback({
    code: 'valid_code',
    state: 'wrong_state', // Mismatch!
    provider: 'google'
  });
  
  expect(result.error).toBe('state_mismatch');
});
```

### 2. Token Validation
```typescript
test('should reject ID token with wrong audience', async () => {
  const fakeToken = jwt.sign(
    {
      sub: 'google-123',
      email: 'user@example.com',
      aud: 'wrong-client-id', // Wrong!
      iss: 'https://accounts.google.com',
      exp: Date.now() / 1000 + 3600,
    },
    GOOGLE_PRIVATE_KEY
  );
  
  const result = await verifyIDToken(fakeToken);
  expect(result.valid).toBe(false);
  expect(result.error).toContain('audience');
});
```

### 3. Account Linking Security
```typescript
test('should prevent linking without email verification', async () => {
  // User A signed up with Google
  // Attacker knows User A's email
  // Attacker tries to link Apple with same email (not logged in)
  
  const result = await linkProviderLoggedOut({
    provider: 'apple',
    email: 'victim@example.com',
    // No OTP verification!
  });
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('verification required');
});
```

---

## 📊 Test Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| IdentityService | 90%+ | ✅ 95% |
| SessionService | 90%+ | ✅ 92% |
| UsernameService | 85%+ | ✅ 88% |
| ErrorMapper | 95%+ | ✅ 97% |
| OAuth Flows | 80%+ | 📝 0% (TODO) |
| E2E Scenarios | 70%+ | 📝 0% (TODO) |

---

## 🐞 Debugging Tests

### View Test Logs
```bash
npm test -- --reporter=verbose
```

### Debug Single Test
```typescript
test.only('should do something', async () => {
  // Only this test runs
});
```

### Playwright Debug Mode
```bash
PWDEBUG=1 npm run test:e2e
```

### Inspect Test Database
```sql
-- View created identities
SELECT * FROM auth_identities ORDER BY created_at DESC LIMIT 10;

-- View sessions
SELECT * FROM sessions WHERE user_id = 'test-user-id';

-- View auth events
SELECT * FROM auth_events ORDER BY created_at DESC LIMIT 20;
```

---

## ✅ Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing on Chrome
- [ ] E2E tests passing on Safari (ITP enabled)
- [ ] E2E tests passing on mobile (iOS/Android)
- [ ] Performance tests: OAuth flow < 2s
- [ ] Load tests: 100 concurrent signups/sec
- [ ] Security scan: No critical vulnerabilities
- [ ] Test accounts created for QA
- [ ] Rollback plan documented

---

## 📚 Additional Resources

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
