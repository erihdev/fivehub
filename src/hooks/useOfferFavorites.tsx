import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

interface OfferFavorite {
  id: string;
  offer_id: string;
  created_at: string;
}

export const useOfferFavorites = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [favorites, setFavorites] = useState<OfferFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('offer_favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching offer favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((offerId: string): boolean => {
    return favorites.some(fav => fav.offer_id === offerId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (offerId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: language === 'ar' ? 'تنبيه' : 'Notice',
        description: language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first',
        variant: 'destructive',
      });
      return false;
    }

    const existingFavorite = favorites.find(fav => fav.offer_id === offerId);

    try {
      if (existingFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('offer_favorites')
          .delete()
          .eq('id', existingFavorite.id);

        if (error) throw error;

        setFavorites(prev => prev.filter(fav => fav.id !== existingFavorite.id));
        
        toast({
          title: language === 'ar' ? 'تمت الإزالة' : 'Removed',
          description: language === 'ar' ? 'تمت إزالة العرض من المفضلة' : 'Offer removed from favorites',
        });
        
        return false;
      } else {
        // Add to favorites
        const { data, error } = await supabase
          .from('offer_favorites')
          .insert({
            user_id: user.id,
            offer_id: offerId,
          })
          .select()
          .single();

        if (error) throw error;

        setFavorites(prev => [...prev, data]);
        
        toast({
          title: language === 'ar' ? 'تمت الإضافة' : 'Added',
          description: language === 'ar' ? 'تمت إضافة العرض للمفضلة' : 'Offer added to favorites',
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, please try again',
        variant: 'destructive',
      });
      return isFavorite(offerId);
    }
  }, [user, favorites, language, isFavorite]);

  const getFavoriteCount = useCallback((): number => {
    return favorites.length;
  }, [favorites]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    getFavoriteCount,
    refetch: fetchFavorites,
  };
};
