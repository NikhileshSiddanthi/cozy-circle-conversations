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
    content: "Let's take a quick tour to help you get started with the platform. This interactive guide will show you around key features. You can skip or pause anytime.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    id: 'categories',
    route: '/',
    target: '[data-tour="categories-grid"]',
    title: 'Browse Categories',
    content: 'These are the main categories covering different topics. Each category contains multiple groups focused on specific discussions.',
    placement: 'bottom',
  },
  {
    id: 'create-post-button',
    route: '/',
    target: '[data-tour="create-post-button"]',
    title: 'Create Posts',
    content: 'Click the Create button to share your thoughts. You can add text, images, videos, polls, and link previews to your posts.',
    placement: 'bottom',
    desktopOnly: true,
  },
  {
    id: 'groups-page',
    route: '/groups',
    target: '[data-tour="groups-page"]',
    title: 'Explore Groups',
    content: 'Browse all available groups across categories. Click on any group to join and start participating in discussions.',
    placement: 'top',
  },
  {
    id: 'notification-bell',
    route: '/',
    target: '[data-tour="notification-bell"]',
    title: 'Stay Updated',
    content: 'Check your notifications here to see reactions, comments, and mentions from the community.',
    placement: 'bottom',
    requireAuth: true,
    desktopOnly: true,
  },
  {
    id: 'news-section',
    route: '/news',
    target: '[data-tour="news-feed"]',
    title: 'Stay Informed',
    content: 'Visit the News section to read curated news articles from trusted sources, organized by category for your convenience.',
    placement: 'top',
  },
  {
    id: 'theme-toggle',
    route: '/',
    target: '[data-tour="theme-toggle"]',
    title: 'Customize Your Experience',
    content: 'Use the theme toggle to switch between light and dark modes. You can also customize accent colors to personalize your experience.',
    placement: 'bottom',
    desktopOnly: true,
  },
  {
    id: 'profile-avatar',
    route: '/',
    target: '[data-tour="profile-avatar"]',
    title: 'Your Profile',
    content: 'Access your profile, settings, and account options from here. Manage your posts, groups, and preferences.',
    placement: 'bottom',
    requireAuth: true,
    desktopOnly: true,
  },
  {
    id: 'complete',
    route: '/',
    target: 'body',
    title: "You're All Set!",
    content: "You've completed the tour! Start exploring, join conversations, and make your voice heard in the COZI community. You can restart this tour anytime from the home page.",
    placement: 'center',
    disableBeacon: true,
  },
];
