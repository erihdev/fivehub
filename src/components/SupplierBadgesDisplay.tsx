import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Star, Clock, Shield, Sparkles, Trophy, Medal, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface SupplierBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  earned_at: string;
  expires_at: string | null;
  is_active: boolean;
  performance_score: number | null;
}

interface SupplierBadgesDisplayProps {
  supplierId: string;
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getBadgeConfig = (badgeType: string) => {
  switch (badgeType) {
    case 'top_performer':
      return {
        icon: Crown,
        className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0',
        iconColor: 'text-white',
      };
    case 'perfect_timing':
      return {
        icon: Clock,
        className: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0',
        iconColor: 'text-white',
      };
    case 'trusted_supplier':
      return {
        icon: Shield,
        className: 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-0',
        iconColor: 'text-white',
      };
    case 'rising_star':
      return {
        icon: Sparkles,
        className: 'bg-gradient-to-r from-purple-400 to-pink-500 text-white border-0',
        iconColor: 'text-white',
      };
    case 'excellence':
      return {
        icon: Trophy,
        className: 'bg-gradient-to-r from-orange-400 to-red-500 text-white border-0',
        iconColor: 'text-white',
      };
    default:
      return {
        icon: Medal,
        className: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0',
        iconColor: 'text-white',
      };
  }
};

export const SupplierBadgesDisplay = ({ supplierId, showAll = false, size = 'md' }: SupplierBadgesDisplayProps) => {
  const { language } = useLanguage();
  const [badges, setBadges] = useState<SupplierBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const { data, error } = await supabase
          .from('supplier_badges')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('is_active', true)
          .order('earned_at', { ascending: false });

        if (error) throw error;
        setBadges(data || []);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, [supplierId]);

  if (isLoading || badges.length === 0) return null;

  const displayBadges = showAll ? badges : badges.slice(0, 3);
  const remainingCount = badges.length - displayBadges.length;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayBadges.map((badge) => {
        const config = getBadgeConfig(badge.badge_type);
        const Icon = config.icon;

        return (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger>
                <Badge className={`${config.className} ${sizeClasses[size]} shadow-sm hover:scale-105 transition-transform cursor-default`}>
                  <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
                  <span>{badge.badge_name}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">{badge.badge_name}</p>
                  {badge.badge_description && <p className="text-muted-foreground">{badge.badge_description}</p>}
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'حُصل عليها:' : 'Earned:'} {new Date(badge.earned_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                  {badge.expires_at && (
                    <p className="text-xs text-amber-500">
                      {language === 'ar' ? 'تنتهي:' : 'Expires:'} {new Date(badge.expires_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {remainingCount > 0 && (
        <Badge variant="outline" className={`${sizeClasses[size]} text-muted-foreground`}>
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

// Compact badge display for lists
export const SupplierBadgeIcons = ({ supplierId }: { supplierId: string }) => {
  const [badges, setBadges] = useState<{ badge_type: string; badge_name: string }[]>([]);

  useEffect(() => {
    const fetchBadges = async () => {
      const { data } = await supabase
        .from('supplier_badges')
        .select('badge_type, badge_name')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .limit(3);

      setBadges(data || []);
    };

    fetchBadges();
  }, [supplierId]);

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {badges.map((badge, index) => {
        const config = getBadgeConfig(badge.badge_type);
        const Icon = config.icon;
        
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger>
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
                  <Icon className="w-3 h-3 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{badge.badge_name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
