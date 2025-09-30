# Application Tour System

## Overview

The COZI application includes a comprehensive, router-aware guided tour system that helps new users discover key features. The tour automatically navigates between pages, highlights important UI elements, and persists progress across page reloads.

## Architecture

### Core Components

- **TourManager** (`src/components/TourManager.tsx`): Main tour orchestration component
- **Tour Steps** (`src/lib/tour/steps.ts`): Step definitions and configuration
- **Tour Config** (`src/lib/tour/config.ts`): Global configuration and styling
- **useTour Hook** (`src/hooks/useTour.tsx`): Programmatic tour control
- **waitForSelector** (`src/lib/tour/waitForSelector.ts`): DOM element detection utility

### Technology

- **react-joyride**: Powers the overlay, tooltips, and step management
- **React Router v6**: Handles navigation between tour steps
- **SessionStorage**: Persists tour progress
- **LocalStorage**: Tracks tour completion status

## How It Works

1. **Initialization**: Tour starts automatically for new users or manually via button
2. **Navigation**: Automatically navigates to each step's route
3. **Element Detection**: Waits for target elements using polling with configurable timeout
4. **Highlighting**: Shows overlay tooltip highlighting the target element
5. **Progress Tracking**: Saves current step to sessionStorage
6. **Completion**: Marks tour as completed in localStorage

## Adding a New Tour Step

### Step Definition

Add a new step to `TOUR_STEPS` array in `src/lib/tour/steps.ts`:

```typescript
{
  id: 'my-new-step',                    // Unique identifier
  route: '/my-page',                     // Route to navigate to
  target: '[data-tour="my-element"]',    // CSS selector (prefer data-tour)
  title: 'Step Title',                   // Optional tooltip title
  content: 'Step description text',      // Tooltip content
  placement: 'bottom',                   // Tooltip position: top, bottom, left, right, auto, center
  mobileOnly: false,                     // Show only on mobile viewports
  desktopOnly: false,                    // Show only on desktop viewports
  requireAuth: false,                    // Skip if user not authenticated
  disableBeacon: false,                  // Disable pulsing beacon
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the step |
| `route` | string | Yes | React Router path to navigate to |
| `target` | string | Yes | CSS selector for element to highlight |
| `title` | string | No | Tooltip title (bold text) |
| `content` | string | Yes | Main tooltip content text |
| `placement` | string | No | Tooltip position (default: 'auto') |
| `mobileOnly` | boolean | No | Show only on viewports < 768px |
| `desktopOnly` | boolean | No | Show only on viewports >= 768px |
| `requireAuth` | boolean | No | Skip if user is not logged in |
| `disableBeacon` | boolean | No | Disable pulsing beacon animation |

### Adding Target Attributes

For each tour step, add a `data-tour` attribute to the target element:

```tsx
// ✅ Good - Stable data attribute
<button data-tour="create-post-button">Create Post</button>

// ❌ Bad - Brittle class-based selector
<button className="btn-primary">Create Post</button>
```

**Selector Rules:**

1. **Always use `data-tour` attributes** for tour targets
2. **Use descriptive, kebab-case names**: `data-tour="notification-bell"`
3. **Place on stable elements** that won't be removed/recreated
4. **Avoid dynamic content** unless element is guaranteed to exist
5. **For lists**, target first item: `data-tour="post-first"`

## Configuration

### Timeout and Polling

Edit `src/lib/tour/config.ts` to adjust timing:

```typescript
export const TOUR_CONFIG = {
  WAIT_TIMEOUT_MS: 8000,      // Max time to wait for element (ms)
  POLL_INTERVAL_MS: 150,      // DOM polling interval (ms)
  MAX_NAV_RETRIES: 2,         // Navigation retry attempts
  MOBILE_BREAKPOINT: 768,     // Mobile viewport threshold (px)
  // ...
};
```

### Styling

Customize Joyride appearance in `JOYRIDE_STYLES`:

```typescript
export const JOYRIDE_STYLES = {
  options: {
    zIndex: 10000,                        // Overlay z-index
    primaryColor: 'hsl(var(--primary))',  // Uses theme colors
    // ...
  },
  tooltip: {
    borderRadius: 8,
    padding: 20,
  },
  // ...
};
```

## Programmatic Control

### Using the Hook

```typescript
import { useTour } from '@/hooks/useTour';

function MyComponent() {
  const { start, reset, hasCompleted } = useTour();

  const handleStartTour = () => {
    reset();        // Clear completion flag
    start(0);       // Start from first step
  };

  return (
    <button onClick={handleStartTour}>
      Start Tour
    </button>
  );
}
```

### Global API

Access tour control via window object:

```javascript
// Start tour from beginning
window.startAppTour();

// Start from specific step
window.startAppTour(3);
```

### Hook Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `start(index?)` | `index?: number` | Start tour from step index (default: 0) |
| `reset()` | none | Clear completion and progress flags |
| `pause()` | none | Pause tour (preserves current step) |
| `resume()` | none | Resume from saved step |
| `hasCompleted()` | none | Returns true if user completed tour |

## Mobile vs Desktop Steps

The tour automatically filters steps based on viewport width:

```typescript
{
  id: 'desktop-feature',
  desktopOnly: true,    // Only shown on desktop (>= 768px)
  // ...
},
{
  id: 'mobile-feature',
  mobileOnly: true,     // Only shown on mobile (< 768px)
  // ...
}
```

Change mobile breakpoint in `TOUR_CONFIG.MOBILE_BREAKPOINT`.

## Authentication-Protected Steps

Skip steps for unauthenticated users:

```typescript
{
  id: 'profile-settings',
  requireAuth: true,      // Skip if user not logged in
  target: '[data-tour="profile-avatar"]',
  // ...
}
```

The tour checks `useAuth()` context and automatically filters these steps.

## Error Handling

### Element Not Found

If a target element doesn't appear within `WAIT_TIMEOUT_MS`:

- **Console warning** is logged
- **Step is skipped** automatically
- **Tour continues** to next step

### Navigation Failures

If navigation fails or returns 404:

- **Up to `MAX_NAV_RETRIES`** attempts
- **Step is skipped** after max retries
- **Tour continues** to next step

### User Navigation

If user manually navigates during tour:

- **Tour pauses** automatically
- **Progress saved** to sessionStorage
- **Can be resumed** via `useTour().resume()`

## Testing

### E2E Tests

Run Playwright tests:

```bash
npm run test:e2e
```

Tests verify:
- Tour starts and navigates correctly
- Elements are highlighted
- Progress persists after reload
- Steps skip when targets missing

### Manual Testing Checklist

- [ ] Tour auto-starts for new users
- [ ] Manual start button works
- [ ] Tour navigates between routes
- [ ] Elements highlight correctly
- [ ] Progress persists on reload
- [ ] Skip button works
- [ ] Complete/finish flow works
- [ ] Mobile filtering works
- [ ] Auth filtering works
- [ ] Tour handles missing elements gracefully

## Accessibility

The tour system is designed with accessibility in mind:

- **Keyboard Navigation**: Use Tab, Enter, Escape keys
- **ARIA Labels**: Tooltips include proper aria attributes
- **Screen Readers**: Joyride announces each step
- **Focus Management**: Tour manages focus automatically
- **Dismissible**: Press Escape or click Skip to exit

## Storage Keys

| Key | Storage | Purpose |
|-----|---------|---------|
| `app_tour_step` | sessionStorage | Current step index (persists across reloads) |
| `app_tour_completed` | localStorage | Tour completion flag (persists forever) |

Clear storage to reset tour:

```javascript
localStorage.removeItem('app_tour_completed');
sessionStorage.removeItem('app_tour_step');
```

## Troubleshooting

### Tour Won't Start

1. Check console for errors
2. Verify `TourManager` is mounted in App root
3. Clear localStorage/sessionStorage
4. Ensure tour steps are defined

### Element Not Highlighting

1. Verify `data-tour` attribute exists on element
2. Check selector syntax in step definition
3. Increase `WAIT_TIMEOUT_MS` if element loads slowly
4. Check element is visible (not `display: none`)

### Navigation Not Working

1. Verify routes exist in React Router
2. Check route paths match step definitions
3. Ensure user has access to route (authentication)
4. Check browser console for navigation errors

### Tour Progress Not Saving

1. Verify sessionStorage is enabled in browser
2. Check for incognito/private browsing mode
3. Ensure `TOUR_CONFIG.STORAGE_KEY` is unique

## Best Practices

### Step Content

- **Keep titles short**: 3-5 words maximum
- **Write clear descriptions**: 1-2 sentences
- **Use action verbs**: "Click here to...", "View your..."
- **Be conversational**: Write for real users, not developers

### Step Order

- **Start simple**: Begin with most important features
- **Build complexity**: Progress from basic to advanced
- **Group related features**: Keep related steps together
- **End with CTA**: Final step should encourage action

### Target Selection

- **Prefer data attributes**: `data-tour="..."` over classes
- **Target stable elements**: Avoid dynamic/conditional content
- **Use specific selectors**: Avoid overly broad selectors
- **Test thoroughly**: Verify elements exist across states

### Performance

- **Limit step count**: 6-10 steps ideal, max 15
- **Optimize timeouts**: Balance UX and performance
- **Filter aggressively**: Use mobile/desktop/auth filters
- **Test on slow connections**: Verify element detection works

## Future Enhancements

Potential improvements for the tour system:

- [ ] Analytics tracking (step completion rates)
- [ ] A/B testing for tour content
- [ ] User feedback collection
- [ ] Contextual tours (feature-specific)
- [ ] Tour branching (different paths)
- [ ] Video/GIF support in tooltips
- [ ] Multi-language support
- [ ] Admin dashboard for tour management

## Support

For issues or questions:

- Check browser console for error messages
- Review this documentation
- Test in incognito mode to rule out caching
- Verify React Router and react-joyride versions
