import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  type: 'group' | 'post';
  category?: string;
  memberCount?: number;
  excerpt?: string;
}

interface SearchBarProps {
  className?: string;
}

export const SearchBar = ({ className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function with debouncing
  useEffect(() => {
    const searchTimer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Search groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          member_count,
          categories!inner(name)
        `)
        .eq('is_approved', true)
        .eq('is_public', true)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5);

      if (groupsError) {
        console.error('Groups search error:', groupsError);
      }

      // Search posts  
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          groups!inner(name, is_approved, is_public)
        `)
        .eq('groups.is_approved', true)
        .eq('groups.is_public', true)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(5);

      if (postsError) {
        console.error('Posts search error:', postsError);
      }

      const searchResults: SearchResult[] = [];

      // Add groups to results
      if (groupsData) {
        groupsData.forEach(group => {
          searchResults.push({
            id: group.id,
            title: group.name,
            type: 'group',
            category: group.categories?.name,
            memberCount: group.member_count || 0,
            excerpt: group.description?.substring(0, 100) + '...'
          });
        });
      }

      // Add posts to results
      if (postsData) {
        postsData.forEach(post => {
          searchResults.push({
            id: post.id,
            title: post.title,
            type: 'post',
            category: post.groups?.name,
            excerpt: post.content?.substring(0, 100) + '...'
          });
        });
      }

      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    if (result.type === 'group') {
      navigate(`/group/${result.id}`);
    } else if (result.type === 'post') {
      navigate(`/post/${result.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups, posts..."
          className="pl-10 w-80"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {result.type === 'group' ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{result.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                        </div>
                        {result.category && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {result.category}
                            {result.memberCount && ` • ${result.memberCount.toLocaleString()} members`}
                          </p>
                        )}
                        {result.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};