import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Clock } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface GroupPickerProps {
  groups: Group[];
  value: string;
  onValueChange: (value: string) => void;
  recentGroupIds?: string[];
}

export const GroupPicker = ({ groups, value, onValueChange, recentGroupIds = [] }: GroupPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const recentGroups = useMemo(() => {
    return groups.filter(g => recentGroupIds.includes(g.id));
  }, [groups, recentGroupIds]);
  
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-48 h-8">
        <SelectValue placeholder="Select group" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <div className="p-2 sticky top-0 bg-background z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        {recentGroups.length > 0 && !searchQuery && (
          <div className="px-2 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 px-2">
              <Clock className="h-3 w-3" />
              <span>Recent</span>
            </div>
            {recentGroups.map(group => (
              <SelectItem key={`recent-${group.id}`} value={group.id}>
                <div className="flex items-center gap-2">
                  {group.name}
                  <Badge variant="secondary" className="text-xs">Recent</Badge>
                </div>
              </SelectItem>
            ))}
            <div className="border-t my-2" />
          </div>
        )}
        
        <div className="px-2">
          {filteredGroups.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No groups found
            </div>
          ) : (
            filteredGroups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};
