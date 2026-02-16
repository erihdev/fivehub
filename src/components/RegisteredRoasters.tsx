import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Coffee, Building2, MapPin, Loader2, MessageSquare } from 'lucide-react';

interface Roaster {
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

const RegisteredRoasters = () => {
  const { language } = useLanguage();
  const [roasters, setRoasters] = useState<Roaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoasters = async () => {
      try {
        const { data, error } = await supabase.rpc('get_business_directory');

        if (error) throw error;

        const roasterData = ((data as BusinessDirectoryItem[]) || [])
          .filter(item => item.role === 'roaster')
          .slice(0, 12);

        const roastersFormatted: Roaster[] = roasterData.map((roaster) => ({
          id: roaster.id,
          user_id: roaster.user_id,
          company_name: roaster.company_name,
          city: roaster.city,
        }));

        setRoasters(roastersFormatted);
      } catch (error) {
        console.error('Error fetching roasters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoasters();
  }, []);

  if (loading) {
    return (
      <section id="roasters" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (roasters.length === 0) {
    return null;
  }

  return (
    <section id="roasters" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Coffee className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {language === 'ar' ? 'المحامص المسجلة' : 'Registered Roasters'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === 'ar' ? 'محامص القهوة المتخصصة' : 'Specialty Coffee Roasters'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'تعرف على محامص القهوة المتخصصة المسجلة في منصتنا'
              : 'Discover specialty coffee roasters registered on our platform'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {roasters.map((roaster) => (
            <Card 
              key={roaster.id} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {(roaster.company_name || 'R').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                    {roaster.company_name || (language === 'ar' ? 'محمصة' : 'Roaster')}
                  </h3>
                  
                  {roaster.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{roaster.city}</span>
                    </div>
                  )}
                  
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 mb-3">
                    <Building2 className="w-3 h-3 me-1" />
                    {language === 'ar' ? 'محمصة معتمدة' : 'Verified Roaster'}
                  </Badge>

                  <Link to={`/messages?recipient=${roaster.user_id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/10">
                      <MessageSquare className="w-4 h-4" />
                      {language === 'ar' ? 'تواصل' : 'Contact'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {roasters.length >= 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `وأكثر من ${roasters.length} محمصة مسجلة...`
                : `And ${roasters.length}+ registered roasters...`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegisteredRoasters;
