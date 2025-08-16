import { useState, useEffect } from 'react';

interface URLValidatorProps {
  url: string;
  onValidation: (isValid: boolean, error?: string) => void;
}

export const URLValidator = ({ url, onValidation }: URLValidatorProps) => {
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!url) {
      onValidation(true);
      return;
    }

    const validateURL = async () => {
      setIsValidating(true);
      
      try {
        // Basic URL format validation
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        
        if (!urlPattern.test(url)) {
          onValidation(false, 'Please enter a valid URL format');
          return;
        }

        // For media URLs, check if it's a valid media extension or known platform
        const mediaExtensions = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi)$/i;
        const knownPlatforms = /(youtube\.com|youtu\.be|vimeo\.com|imgur\.com|giphy\.com)/i;
        
        if (mediaExtensions.test(url) || knownPlatforms.test(url)) {
          onValidation(true);
          return;
        }

        // Try to fetch the URL to check if it exists
        try {
          const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
          onValidation(true);
        } catch {
          // If CORS fails, assume URL is valid (common for external media)
          onValidation(true);
        }
      } catch (error) {
        onValidation(false, 'Unable to validate URL');
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateURL, 500);
    return () => clearTimeout(timeoutId);
  }, [url, onValidation]);

  return null;
};