import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Lock, Users as UsersIcon } from 'lucide-react';
import { getIcon } from '@/lib/iconMap';

// Accent colors for group cards
const accentColors = [
  'bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
  'bg-lime-100 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',
  'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
  'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
];

interface Group {
  id: string;
  name: string;
  description: string;
  icon?: string;
  member_count: number;
  type: string;
  is_public: boolean;
  created_at: string;
}

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onClick }) => {
  const Icon = getIcon(group.icon);
  
  // Get consistent accent color based on group ID
  const accentColorIndex = group.id.charCodeAt(0) % accentColors.length;
  const accentColor = accentColors[accentColorIndex];
  
  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border/50 bg-card rounded-xl overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        {/* Icon and Badges */}
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${accentColor} transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex gap-2">
            <Badge variant={group.is_public ? 'default' : 'secondary'} className="gap-1 text-xs">
              {group.is_public ? (
                <><Eye className="h-3 w-3" /> Public</>
              ) : (
                <><Lock className="h-3 w-3" /> Private</>
              )}
            </Badge>
          </div>
        </div>
        
        {/* Title */}
        <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors duration-200">
          {group.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Description */}
        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {group.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            <span>{group.member_count || 0} members</span>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {group.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
