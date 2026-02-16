import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Package, Building2, MapPin, Loader2, ArrowLeft, ArrowRight, MessageSquare, Mail } from 'lucide-react';

interface Supplier {
  id: string;
  user_id: string;
  company_name: string | null;
  city: string | null;
  company_email: string | null;
}

interface BusinessDirectoryItem {
  id: string;
  user_id: string;
  company_name: string | null;
  city: string | null;
  role: string;
  company_email: string | null;
}

const RegisteredSuppliers = () => {
  const { language } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase.rpc('get_business_directory');

        if (error) throw error;

        const supplierData = ((data as BusinessDirectoryItem[]) || [])
          .filter(item => item.role === 'supplier')
          .slice(0, 12);

        const suppliersFormatted: Supplier[] = supplierData.map((supplier) => ({
          id: supplier.id,
          user_id: supplier.user_id,
          company_name: supplier.company_name,
          city: supplier.city,
          company_email: supplier.company_email,
        }));

        setSuppliers(suppliersFormatted);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <section id="suppliers" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (suppliers.length === 0) {
    return (
      <section id="suppliers" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-coffee-gold/10 px-4 py-2 rounded-full mb-4">
              <Package className="w-5 h-5 text-coffee-gold" />
              <span className="text-sm font-medium text-coffee-gold">
                {language === 'ar' ? 'الموردين المسجلين' : 'Registered Suppliers'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {language === 'ar' ? 'موردي البن الأخضر' : 'Green Coffee Suppliers'}
            </h2>
          </div>
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا يوجد موردين مسجلين حالياً' : 'No registered suppliers yet'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="suppliers" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-coffee-gold/10 px-4 py-2 rounded-full mb-4">
            <Package className="w-5 h-5 text-coffee-gold" />
            <span className="text-sm font-medium text-coffee-gold">
              {language === 'ar' ? 'الموردين المسجلين' : 'Registered Suppliers'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === 'ar' ? 'موردي البن الأخضر' : 'Green Coffee Suppliers'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'تعرف على موردي البن الأخضر المسجلين في منصتنا'
              : 'Discover green coffee suppliers registered on our platform'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {suppliers.map((supplier) => (
            <Card 
              key={supplier.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4 ring-2 ring-coffee-gold/20 group-hover:ring-coffee-gold/40 transition-all">
                    <AvatarFallback className="bg-coffee-gold/10 text-coffee-gold text-xl">
                      {(supplier.company_name || 'S').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                    {supplier.company_name || (language === 'ar' ? 'مورد' : 'Supplier')}
                  </h3>
                  
                  {supplier.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{supplier.city}</span>
                    </div>
                  )}
                  
                  {supplier.company_email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Mail className="w-3.5 h-3.5" />
                      <a 
                        href={`mailto:${supplier.company_email}`} 
                        className="hover:text-coffee-gold transition-colors truncate max-w-[180px]"
                        title={supplier.company_email}
                      >
                        {supplier.company_email}
                      </a>
                    </div>
                  )}
                  
                  <Badge variant="outline" className="bg-coffee-gold/5 text-coffee-gold border-coffee-gold/20 mb-3">
                    <Building2 className="w-3 h-3 me-1" />
                    {language === 'ar' ? 'مورد معتمد' : 'Verified Supplier'}
                  </Badge>

                  <Link to={`/messages?recipient=${supplier.user_id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-coffee-gold border-coffee-gold/30 hover:bg-coffee-gold/10">
                      <MessageSquare className="w-4 h-4" />
                      {language === 'ar' ? 'تواصل' : 'Contact'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {suppliers.length >= 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ar' 
                ? `وأكثر من ${suppliers.length} مورد مسجل...`
                : `And ${suppliers.length}+ registered suppliers...`}
            </p>
          </div>
        )}
        
        <div className="text-center mt-8">
          <Link to="/suppliers">
            <Button variant="coffee" size="lg">
              {language === 'ar' ? 'عرض جميع الموردين' : 'View All Suppliers'}
              {language === 'ar' ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RegisteredSuppliers;
