import { Mail, Phone, MapPin, ExternalLink, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { HandSVG } from "@/components/HandPattern";

const Footer = () => {
  const { language, t } = useLanguage();

  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: "/dashboard", label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard' },
    { href: "/suppliers", label: language === 'ar' ? 'الموردين' : 'Suppliers' },
    { href: "/compare", label: language === 'ar' ? 'المقارنة' : 'Compare' },
    { href: "/harvest-calendar", label: language === 'ar' ? 'تقويم الحصاد' : 'Harvest Calendar' },
  ];

  const supportLinks = [
    { href: "/terms", label: language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions' },
  ];

  return (
    <footer className="bg-primary relative overflow-hidden" role="contentinfo">
      {/* Hand Pattern Decorations */}
      <div className="absolute top-16 right-10 opacity-10">
        <HandSVG className="w-20 h-30" color="white" variant="outline" />
      </div>
      <div className="absolute bottom-20 left-10 opacity-10">
        <HandSVG className="w-16 h-24 -rotate-12" color="white" variant="outline" />
      </div>
      <div className="absolute top-1/2 right-1/4 opacity-5">
        <HandSVG className="w-32 h-48 rotate-6" color="white" variant="solid" />
      </div>

      {/* Wave Divider */}
      <div className="w-full">
        <svg viewBox="0 0 1440 60" className="w-full h-8" preserveAspectRatio="none">
          <path
            fill="hsl(var(--background))"
            d="M0,32L60,28C120,24,240,16,360,14C480,12,600,16,720,22C840,28,960,36,1080,36C1200,36,1320,28,1380,24L1440,20L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
          />
        </svg>
      </div>

      <div className="container mx-auto px-6 pt-12 pb-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <div className="text-3xl font-display font-black text-primary-foreground tracking-tight">
                FIVE <span className="text-fivehub-gold">HUB</span>
              </div>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed mb-4">
              {language === 'ar' ? 'مزارع • موردين • محامص • مقاهي • صيانة' : 'Farms • Suppliers • Roasters • Cafes • Maintenance'}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/fivehub"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
              >
                <Instagram className="w-5 h-5 text-primary-foreground" />
              </a>
              <span className="text-primary-foreground/70 text-sm">@fivehub</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-primary-foreground font-semibold mb-4 text-lg">
              {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <nav aria-label={language === 'ar' ? 'روابط سريعة' : 'Quick Links'}>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-sm flex items-center gap-2 group"
                    >
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-primary-foreground font-semibold mb-4 text-lg">
              {language === 'ar' ? 'الدعم' : 'Support'}
            </h3>
            <nav aria-label={language === 'ar' ? 'روابط الدعم' : 'Support Links'}>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-sm flex items-center gap-2 group"
                    >
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-primary-foreground font-semibold mb-4 text-lg">
              {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <MapPin className="w-4 h-4 text-primary-foreground flex-shrink-0" aria-hidden="true" />
                <span>{language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <Mail className="w-4 h-4 text-primary-foreground flex-shrink-0" aria-hidden="true" />
                <a href="mailto:info@fivehub.com" className="hover:text-primary-foreground transition-colors">
                  info@fivehub.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                <Phone className="w-4 h-4 text-primary-foreground flex-shrink-0" aria-hidden="true" />
                <a href="tel:+966500000000" className="hover:text-primary-foreground transition-colors" dir="ltr">
                  +966 50 000 0000
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-foreground/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-primary-foreground/60 text-sm">
              © {currentYear} FIVE HUB. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
            </p>
            <p className="text-primary-foreground/40 text-xs">
              {language === 'ar' ? 'منصة سلسلة القهوة الكاملة ☕' : 'Complete Coffee Supply Chain ☕'}
            </p>
          </div>
          {/* Version Number */}
          <div className="text-center mt-4 space-y-2">
            <span className="text-primary-foreground/30 text-xs font-mono">
              v3.0.0
            </span>
            <div className="flex items-center justify-center gap-1.5 text-primary-foreground/40 text-xs">
              <span>{language === 'ar' ? 'صنع بواسطة' : 'Made by'}</span>
              <a
                href="https://divathar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors font-semibold"
              >
                divathar.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;