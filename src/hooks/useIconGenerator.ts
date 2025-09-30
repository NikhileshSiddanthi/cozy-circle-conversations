import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IconGeneratorResult {
  icon: string;
  loading: boolean;
  error: string | null;
}

export const useIconGenerator = (name: string, type: 'category' | 'group' = 'category'): IconGeneratorResult => {
  const [icon, setIcon] = useState<string>(type === 'category' ? 'Flag' : 'Users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name || name.trim().length === 0) {
      return;
    }

    const generateIcon = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('generate-icon', {
          body: { name, type }
        });

        if (functionError) {
          console.error('Error generating icon:', functionError);
          setError(functionError.message);
          // Keep default icon on error
          return;
        }

        if (data?.icon) {
          setIcon(data.icon);
        }
      } catch (err) {
        console.error('Error calling icon generation:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    generateIcon();
  }, [name, type]);

  return { icon, loading, error };
};

