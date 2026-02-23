import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coffee, Building2, Truck, MapPin, ExternalLink, Award, Crown, Sparkles } from 'lucide-react';

// Import local logos
import dalLogo from '@/assets/dal-logo.png';
import brew92Logo from '@/assets/partners/brew92-logo.svg';
import riyadhRoasterLogo from '@/assets/partners/riyadh-roaster-logo.png';

interface Partner {
  id: string;
  name: string;
  nameAr: string;
  city: string;
  cityAr: string;
  website: string;
  logo?: string;
  founded?: string;
  description: string;
  descriptionAr: string;
  verified: boolean;
}

const roasters: Partner[] = [
  {
    id: 'dal',
    name: 'Dal Roastery',
    nameAr: 'محمصة دال',
    city: 'Jeddah',
    cityAr: 'جدة',
    website: 'https://dal.sa',
    logo: dalLogo,
    founded: '2018',
    description: 'Premium specialty coffee roasters known for high-quality single-origin beans',
    descriptionAr: 'محمصة قهوة مختصة معروفة بجودة البن أحادي المصدر',
    verified: true,
  },
  {
    id: 'piccolo',
    name: 'Piccolo Coffee Roasters',
    nameAr: 'محمصة بيكولو',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://piccolo.sa',
    founded: '2014',
    description: 'Pioneer specialty coffee roasters in Saudi Arabia since 2014',
    descriptionAr: 'رواد محامص القهوة المختصة في السعودية منذ 2014',
    verified: true,
  },
  {
    id: 'riyadh-roaster',
    name: 'Arriyadh Roaster',
    nameAr: 'محمصة الرياض',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://arriyadhroaster.com',
    logo: riyadhRoasterLogo,
    founded: '2019',
    description: 'Premium specialty coffee with free shipping across GCC',
    descriptionAr: 'قهوة مختصة فاخرة مع شحن مجاني لدول الخليج',
    verified: true,
  },
  {
    id: 'elixir-bunn',
    name: 'Elixir Bunn',
    nameAr: 'إكسير البُن',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://elixirbunn.com',
    founded: '2018',
    description: 'Award-winning coffee roasters with Saudi Southern Region blends',
    descriptionAr: 'محمصة حائزة على جوائز مع خلطات من المنطقة الجنوبية',
    verified: true,
  },
  {
    id: 'october',
    name: 'October Coffee Roasters',
    nameAr: 'محمصة أكتوبر',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://october.sa',
    founded: '2020',
    description: 'Specialty coffee roasters with premium seasonal offerings',
    descriptionAr: 'محمصة قهوة مختصة مع عروض موسمية فاخرة',
    verified: true,
  },
  {
    id: 'zelebrity',
    name: 'Zelebrity Roasters',
    nameAr: 'محمصة زيلبرتي',
    city: 'Dammam',
    cityAr: 'الدمام',
    website: 'https://zelebrity.sa',
    founded: '2020',
    description: 'Eastern Province specialty coffee roasters',
    descriptionAr: 'محمصة قهوة مختصة في المنطقة الشرقية',
    verified: true,
  },
];

const cafes: Partner[] = [
  {
    id: 'brew92',
    name: 'BREW92',
    nameAr: 'برو92',
    city: 'Jeddah & Riyadh',
    cityAr: 'جدة والرياض',
    website: 'https://www.brew92.com',
    logo: brew92Logo,
    founded: '2016',
    description: 'SCA certified specialty café and roastery with professional baristas',
    descriptionAr: 'مقهى ومحمصة معتمدة من SCA مع باريستا محترفين',
    verified: true,
  },
  {
    id: 'cove',
    name: 'COVE',
    nameAr: 'كوف',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://cove.sa',
    founded: '2019',
    description: 'Premium specialty coffee experience in Riyadh',
    descriptionAr: 'تجربة قهوة مختصة فاخرة في الرياض',
    verified: true,
  },
  {
    id: 'repose',
    name: 'Repose Café',
    nameAr: 'ريبوز كافيه',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://reposecafe.sa',
    founded: '2020',
    description: 'Your coffee as it should be - premium specialty café',
    descriptionAr: 'قهوتك كما يجب أن تكون - مقهى مختص فاخر',
    verified: true,
  },
  {
    id: 'draft',
    name: 'Draft Café',
    nameAr: 'درافت كافيه',
    city: 'Multiple Cities',
    cityAr: 'مدن متعددة',
    website: 'https://www.draftcafe.sa',
    founded: '2018',
    description: 'Specialty coffee chain across Saudi Arabia',
    descriptionAr: 'سلسلة مقاهي مختصة في أنحاء المملكة',
    verified: true,
  },
];

const suppliers: Partner[] = [
  {
    id: 'alfanoos',
    name: 'Alfanoos',
    nameAr: 'الفانوس',
    city: 'Jeddah',
    cityAr: 'جدة',
    website: 'https://www.alfanoos.com',
    founded: '1966',
    description: 'Specialty green coffee supplier since 1966 with global sourcing',
    descriptionAr: 'مورد بن أخضر مختص منذ 1966 مع مصادر عالمية',
    verified: true,
  },
  {
    id: 'coffee-beans-ksa',
    name: 'Coffee Beans Co.',
    nameAr: 'شركة حبوب القهوة',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://www.coffeebeansksa.com',
    founded: '2019',
    description: 'Leading specialty green coffee beans supplier in Saudi Arabia',
    descriptionAr: 'من أكبر موردي البن الأخضر المختص في السعودية',
    verified: true,
  },
  {
    id: 'origins',
    name: 'Origins Coffee',
    nameAr: 'أوريجنز كوفي',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://www.coffee-origins.com',
    founded: '2020',
    description: 'Sustainable green coffee sourcing with top-rated Q Graders',
    descriptionAr: 'توريد بن أخضر مستدام مع أفضل مقيمي القهوة',
    verified: true,
  },
  {
    id: 'saudi-coffee',
    name: 'Saudi Coffee Company',
    nameAr: 'الشركة السعودية للقهوة',
    city: 'Jazan',
    cityAr: 'جازان',
    website: 'https://saudicoffee.com',
    founded: '2020',
    description: 'Supporting local Saudi coffee farmers and producers',
    descriptionAr: 'دعم مزارعي ومنتجي القهوة السعوديين المحليين',
    verified: true,
  },
  {
    id: 'green-coffee',
    name: 'Green Coffee EST',
    nameAr: 'مؤسسة جرين كوفي',
    city: 'Riyadh',
    cityAr: 'الرياض',
    website: 'https://greencoffesa.com',
    founded: '2018',
    description: 'Green coffee beans and café equipment supplier',
    descriptionAr: 'مورد بن أخضر ومعدات المقاهي',
    verified: true,
  },
];

const PartnerCard = ({ partner, language }: { partner: Partner; language: string }) => {
  const isArabic = language === 'ar';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          {partner.logo ? (
            <div className="w-20 h-20 mb-4 rounded-full bg-background border-2 border-primary/20 group-hover:border-primary/40 transition-all flex items-center justify-center overflow-hidden">
              <img
                src={partner.logo}
                alt={isArabic ? partner.nameAr : partner.name}
                className="w-16 h-16 object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 mb-4 rounded-full bg-primary/10 border-2 border-primary/20 group-hover:border-primary/40 transition-all flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {(isArabic ? partner.nameAr : partner.name).charAt(0)}
              </span>
            </div>
          )}

          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
            {isArabic ? partner.nameAr : partner.name}
          </h3>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{isArabic ? partner.cityAr : partner.city}</span>
          </div>

          {partner.founded && (
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted mb-2">
              {isArabic ? `منذ ${partner.founded}` : `Est. ${partner.founded}`}
            </Badge>
          )}

          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {isArabic ? partner.descriptionAr : partner.description}
          </p>

          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {partner.verified && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <Award className="w-3 h-3 me-1" />
                {isArabic ? 'موثق' : 'Verified'}
              </Badge>
            )}
            <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30">
              <Crown className="w-3 h-3 me-1" />
              {isArabic ? 'شريك مميز' : 'Premium Partner'}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => window.open(partner.website, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            {isArabic ? 'زيارة الموقع' : 'Visit Website'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SaudiCoffeeDirectory = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <section id="saudi-directory" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Coffee className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isArabic ? 'دليل القهوة السعودي' : 'Saudi Coffee Directory'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {isArabic ? 'أبرز شركاء القهوة المختصة' : 'Top Specialty Coffee Partners'}
          </h2>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-2 rounded-full mb-4 border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600">
              {isArabic ? 'يظهر هنا فقط مشتركي الخطة Enterprise' : 'Exclusive to Enterprise subscribers'}
            </span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isArabic
              ? 'اكتشف أشهر المحامص والمقاهي وموردي البن الأخضر في المملكة العربية السعودية'
              : 'Discover the most renowned roasters, cafés, and green coffee suppliers in Saudi Arabia'}
          </p>
        </div>

        <Tabs defaultValue="roasters" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="roasters" className="gap-2">
              <Coffee className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'المحامص' : 'Roasters'}</span>
            </TabsTrigger>
            <TabsTrigger value="cafes" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'المقاهي' : 'Cafés'}</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'الموردين' : 'Suppliers'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roasters">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {roasters.map((roaster) => (
                <PartnerCard key={roaster.id} partner={roaster} language={language} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cafes">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {cafes.map((cafe) => (
                <PartnerCard key={cafe.id} partner={cafe} language={language} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suppliers">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {suppliers.map((supplier) => (
                <PartnerCard key={supplier.id} partner={supplier} language={language} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? '* البيانات موثقة من المواقع الرسمية للشركات'
              : '* Data verified from official company websites'}
          </p>
          <p className="text-xs text-amber-600/80">
            {isArabic
              ? '✨ للظهور في هذا الدليل، اشترك في خطة Enterprise'
              : '✨ To appear in this directory, subscribe to the Enterprise plan'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default SaudiCoffeeDirectory;
