import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, Sparkles, FileText, RefreshCw, Flame, Rocket } from 'lucide-react';
import { HandSVG } from '@/components/HandPattern';

const ExclusiveFeatures = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const features = [
    {
      id: 'auctions',
      icon: Gavel,
      title: language === 'ar' ? 'مزادات القهوة المباشرة' : 'Live Coffee Auctions',
      description: language === 'ar' ? 'زايد على أفضل الأنواع' : 'Bid on premium lots',
      badge: language === 'ar' ? 'مباشر' : 'Live',
      badgeColor: 'bg-destructive animate-pulse',
      href: '/live-auctions',
      gradient: 'from-primary/20 via-primary/5 to-transparent',
      iconColor: 'text-primary',
      borderColor: 'hover:border-primary/50'
    },
    {
      id: 'blend',
      icon: Sparkles,
      title: language === 'ar' ? 'مُنشئ الخلطات الذكي' : 'AI Blend Creator',
      description: language === 'ar' ? 'صمم خلطتك بالذكاء الاصطناعي' : 'Design with AI assistance',
      badge: language === 'ar' ? 'جديد' : 'New',
      badgeColor: 'bg-fivehub-brown-light',
      href: '/blend-creator',
      gradient: 'from-fivehub-brown/20 via-fivehub-brown/5 to-transparent',
      iconColor: 'text-fivehub-brown-light',
      borderColor: 'hover:border-fivehub-brown/50'
    },
    {
      id: 'contracts',
      icon: FileText,
      title: language === 'ar' ? 'عقود ما قبل الحصاد' : 'Pre-Harvest Contracts',
      description: language === 'ar' ? 'احجز محصولك مبكراً' : 'Reserve crops early',
      badge: language === 'ar' ? 'حصري' : 'Exclusive',
      badgeColor: 'bg-success',
      href: '/harvest-contracts',
      gradient: 'from-success/20 via-success/5 to-transparent',
      iconColor: 'text-success',
      borderColor: 'hover:border-success/50'
    },
    {
      id: 'resale',
      icon: RefreshCw,
      title: language === 'ar' ? 'سوق إعادة البيع' : 'Resale Marketplace',
      description: language === 'ar' ? 'تبادل بين المحامص' : 'Trade between roasters',
      badge: language === 'ar' ? 'فريد' : 'Unique',
      badgeColor: 'bg-primary',
      href: '/coffee-resale',
      gradient: 'from-primary/20 via-primary/5 to-transparent',
      iconColor: 'text-primary',
      borderColor: 'hover:border-primary/50'
    }
  ];

  return (
    <section className="py-16 bg-secondary/30 relative overflow-hidden">
      {/* Hand Pattern Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 right-12 w-28 h-42 opacity-[0.04] rotate-[15deg]">
          <HandSVG color="hsl(var(--primary))" variant="outline" className="w-full h-full" />
        </div>
        <div className="absolute bottom-12 left-12 w-24 h-36 opacity-[0.04] -rotate-[15deg]">
          <HandSVG color="hsl(var(--primary))" variant="outline" className="w-full h-full" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-72 opacity-[0.02]">
          <HandSVG color="hsl(var(--foreground))" variant="solid" className="w-full h-full" />
        </div>
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Rocket className="h-5 w-5" />
            <span className="font-semibold text-sm">
              {language === 'ar' ? 'ميزات حصرية عالمياً' : 'World-First Features'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {language === 'ar' ? 'ابتكارات ثورية في عالم القهوة' : 'Revolutionary Coffee Innovations'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'أول منصة في العالم تقدم هذه الميزات المبتكرة لصناعة القهوة المختصة'
              : 'The first platform in the world to offer these innovative features for specialty coffee'}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Link key={feature.id} to={feature.href}>
              <Card 
                className={`group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${feature.borderColor} h-full bg-card`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <CardContent className="relative p-6 flex flex-col h-full">
                  {/* Badge */}
                  <Badge className={`${feature.badgeColor} self-start mb-4 text-white`}>
                    <Flame className="h-3 w-3 ml-1" />
                    {feature.badge}
                  </Badge>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                  </div>

                  {/* Content */}
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex-1">
                    {feature.description}
                  </p>

                  {/* Arrow */}
                  <div className={`mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span>{language === 'ar' ? 'استكشف الآن' : 'Explore Now'}</span>
                    <span className={`transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`}>→</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? '🌍 هذه الميزات حصرية لمنصتنا ولا توجد في أي منصة أخرى في العالم'
              : '🌍 These features are exclusive to our platform and don\'t exist anywhere else in the world'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ExclusiveFeatures;