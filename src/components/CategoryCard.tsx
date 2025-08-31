import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Flag, 
  Building2, 
  Globe, 
  Users, 
  Crown, 
  Briefcase,
  TrendingUp,
  Vote,
  Gavel,
  MapPin
} from 'lucide-react';

const iconMap: { [key: string]: any } = {
  Flag,
  Building2,
  Globe,
  Users,
  Crown,
  TrendingUp,
  Briefcase,
  Vote,
  Gavel,
  MapPin
};

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
  group_count?: number;
}

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  const Icon = iconMap[category.icon] || Flag;
  
  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-border/50 overflow-hidden h-48"
      onClick={onClick}
    >
      {/* Header with Icon Background */}
      <div className={`relative h-20 ${category.color_class} flex items-center justify-center`}>
        <Icon className="h-8 w-8 text-white" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {category.name}
          </CardTitle>
        </div>
        <Badge variant="secondary" className="w-fit">
          {category.group_count || 0} groups
        </Badge>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {category.description}
        </p>
      </CardContent>
    </Card>
  );
};