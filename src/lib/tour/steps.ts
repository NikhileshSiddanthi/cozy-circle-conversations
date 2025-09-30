/**
 * Tour Step Definitions
 * Define all tour steps with routes, targets, and content
 */

export interface TourStep {
  id: string;
  route: string;
  target: string;
  title?: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center';
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  requireAuth?: boolean;
  disableBeacon?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    target: 'body',
    title: 'Welcome to COZI!',
    content: "Let's take a quick tour to help you get started. This will show you the key features of the platform.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    id: 'categories',
    route: '/',
    target: '[data-tour="categories-grid"]',
    title: 'Browse Categories',
    content: 'These are the main categories. Each category contains groups focused on specific discussions. Click any category to explore its groups.',
    placement: 'bottom',
  },
  {
    id: 'groups-page',
    route: '/groups',
    target: '[data-tour="groups-page"]',
    title: 'All Groups',
    content: 'Here you can browse all available groups across categories. Join groups to participate in discussions.',
    placement: 'top',
  },
  {
    id: 'create-post',
    route: '/',
    target: '[data-tour="create-post-button"]',
    title: 'Create Posts',
    content: 'Click the Create button to share your thoughts. You can add text, images, videos, polls, and link previews.',
    placement: 'bottom',
  },
  {
    id: 'news-section',
    route: '/news',
    target: '[data-tour="news-feed"]',
    title: 'News & Updates',
    content: 'Stay informed with curated news articles organized by category. Browse different news topics using the tabs.',
    placement: 'top',
  },
  {
    id: 'complete',
    route: '/',
    target: 'body',
    title: "You're All Set!",
    content: "You've completed the tour! Start exploring categories, join groups, and share your thoughts. You can restart this tour anytime from the home page.",
    placement: 'center',
    disableBeacon: true,
  },
];
