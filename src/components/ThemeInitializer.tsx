import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Initializes the theme system on app mount
 * This component should be placed at the root of the app
 */
export function ThemeInitializer() {
  const { theme, resolvedTheme } = useTheme();
  
  useEffect(() => {
    // Theme is automatically initialized by the useTheme hook
    console.log('Theme initialized:', { theme, resolvedTheme });
  }, [theme, resolvedTheme]);
  
  return null;
}
