import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Coffee, Building2, MapPin, Loader2, MessageSquare } from 'lucide-react';

interface Cafe {
  id: string;
  user_id: string;
  company_name: string | null;
  city: string | null;
}

interface BusinessDirectoryItem {
  id: string;
  user_id: string;
  company_name: string | null;
  city: string | null;
  role: string;
}

const RegisteredCafes = () => {
  const { language } = useLanguage();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCafes = async () => {
      try {
        const { data, error } = await supabase.rpc('get_business_directory');

        if (error) throw error;

        const cafeData = ((data as BusinessDirectoryItem[]) || [])
          .filter(item => item.role === 'cafe')
          .slice(0, 12);

        const cafesFormatted: Cafe[] = cafeData.map((cafe) => ({
          id: cafe.id,
          user_id: cafe.user_id,
          company_name: cafe.company_name,
          city: cafe.city,
        }));

        setCafes(cafesFormatted);
      } catch (error) {
        console.error('Error fetching cafes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCafes();
  }, []);

  if (loading) {
    return (
      <section id="cafes" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (cafes.length === 0) {
    return (
      <section id="cafes" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full mb-4">
              <Coffee className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">
                {language === 'ar' ? 'المقاهي المسجلة' : 'Registered Cafes'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {language === 'ar' ? 'المقاهي المتعاملة' : 'Partner Cafes'}
            </h2>
          </div>
          <div className="text-center py-12">
            <Coffee className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد مقاهي مسجلة حالياً' : 'No registered cafes yet'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="cafes" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full mb-4">
            <Coffee className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">
              {language === 'ar' ? 'المقاهي المسجلة' : 'Registered Cafes'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === 'ar' ? 'المقاهي المتعاملة' : 'Partner Cafes'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'تعرف على المقاهي المسجلة التي يمكنك التعامل معها'
              : 'Discover registered cafes you can partner with'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cafes.map((cafe) => (
            <Card 
              key={cafe.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4 ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all">
                    <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xl">
                      {(cafe.company_name || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                    {cafe.company_name || (language === 'ar' ? 'مقهى' : 'Cafe')}
                  </h3>
                  
                  {cafe.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{cafe.city}</span>
                    </div>
                  )}
                  
                  <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 mb-3">
                    <Building2 className="w-3 h-3 me-1" />
                    {language === 'ar' ? 'مقهى معتمد' : 'Verified Cafe'}
                  </Badge>

                  <Link to={`/messages?recipient=${cafe.user_id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-50">
                      <MessageSquare className="w-4 h-4" />
                      {language === 'ar' ? 'تواصل' : 'Contact'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cafes.length >= 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `وأكثر من ${cafes.length} مقهى مسجل...`
                : `And ${cafes.length}+ registered cafes...`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegisteredCafes;
