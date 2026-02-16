import { Link } from "react-router-dom";
import {
  LogOut, LogIn, LayoutDashboard,
  Menu, X, User, ShoppingBag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fivehubLogo from "@/assets/fivehub-logo-official.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { NotificationSoundToggle } from "@/components/NotificationSoundToggle";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const Header = () => {
  const { user, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const [userRole, setUserRole] = useState<{ role: string; status: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ business_name: string | null; logo_url: string | null } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setUserProfile(null);
      return;
    }

    const fetchUserData = async () => {
      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserRole(roleData);

      // Fetch profile for business name and logo
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_name, logo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        let displayLogoUrl = profileData.logo_url;

        // If logo_url is a path (not a full URL), generate public URL
        if (displayLogoUrl && !displayLogoUrl.startsWith('http')) {
          const { data: logoData } = supabase.storage
            .from("avatars")
            .getPublicUrl(displayLogoUrl);
          displayLogoUrl = logoData?.publicUrl || null;
        }

        setUserProfile({
          business_name: profileData.business_name,
          logo_url: displayLogoUrl
        });
      } else {
        setUserProfile(null);
      }
    };

    fetchUserData();
  }, [user]);

  const isAdmin = userRole?.role === 'admin' && userRole?.status === 'approved';
  const isSupplier = userRole?.role === 'supplier' && userRole?.status === 'approved';
  const isRoaster = userRole?.role === 'roaster' && userRole?.status === 'approved';

  const getDashboardLink = () => {
    if (!userRole || userRole.status !== 'approved') return null;
    return '/hub';
  };

  const getRoleBadge = () => {
    if (!userRole || userRole.status !== 'approved') return null;
    switch (userRole.role) {
      case 'admin': return { label: language === 'ar' ? 'المشرف' : 'Admin', color: 'bg-destructive text-destructive-foreground' };
      case 'supplier': return { label: language === 'ar' ? 'مورد' : 'Supplier', color: 'bg-fivehub-gold text-fivehub-brown' };
      case 'roaster': return { label: language === 'ar' ? 'محمصة' : 'Roaster', color: 'bg-primary text-primary-foreground' };
      case 'cafe': return { label: language === 'ar' ? 'مقهى' : 'Cafe', color: 'bg-accent text-accent-foreground' };
      case 'farm': return { label: language === 'ar' ? 'مزرعة' : 'Farm', color: 'bg-green-600 text-white' };
      case 'maintenance': return { label: language === 'ar' ? 'صيانة' : 'Maintenance', color: 'bg-orange-600 text-white' };
      default: return null;
    }
  };

  const dashboardLink = getDashboardLink();
  const roleBadge = getRoleBadge();

  // Use user's logo if available, otherwise show FiveHub logo
  const displayLogo = userProfile?.logo_url || fivehubLogo;
  const displayName = userProfile?.business_name;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/[0.02] backdrop-blur-2xl border-b border-white/5 transition-all duration-500 overflow-hidden">
        {/* Cinematic Header Aura */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[40vw] h-[20vw] bg-primary/20 blur-[60px] rounded-full animate-pulse" />
        </div>

        <div className="container mx-auto px-6 py-3 relative z-10">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="p-1.5 glass-card rounded-xl border-white/10 group-hover:border-primary/50 transition-colors bg-white/5">
                  <img
                    src={displayLogo}
                    alt={displayName || "FIVE HUB"}
                    className="h-8 w-auto max-w-[100px] object-contain rounded"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-luxury tracking-tighter leading-none">
                    {displayName || "FIVE HUB"}
                  </span>
                  {roleBadge && (
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60 ${roleBadge.color.includes('destructive') ? 'text-destructive' : 'text-primary'}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - Simplified & Elegant */}
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/coffee-resale">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/5 rounded-xl px-4">
                  {language === 'ar' ? 'السوق' : 'Marketplace'}
                </Button>
              </Link>

              {user ? (
                <>
                  {dashboardLink && (
                    <Link to={dashboardLink}>
                      <Button variant="outline" size="sm" className="glass-card border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl px-4">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'المركز' : 'The Hub'}
                      </Button>
                    </Link>
                  )}
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/5 rounded-xl px-4">
                      <User className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'الملف' : 'Profile'}
                    </Button>
                  </Link>

                  <div className="h-4 w-[1px] bg-white/10 mx-2" />

                  <ThemeToggle />
                  <LanguageSwitcher />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/40 hover:text-destructive transition-colors"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
                  <Link to="/auth">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105">
                      <LogIn className="w-4 h-4 me-2" />
                      {language === 'ar' ? 'دخول' : 'Login'}
                    </Button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 glass-card border-none bg-white/5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu - Luxury Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="md:hidden mt-4 pb-6 space-y-2 border-t border-white/5 pt-6"
              >
                {user ? (
                  <>
                    {dashboardLink && (
                      <Link to={dashboardLink} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-white font-black uppercase text-xs tracking-widest gap-4 h-14 bg-white/[0.02] rounded-2xl hover:bg-white/5">
                          <LayoutDashboard className="w-5 h-5 text-primary" />
                          {language === 'ar' ? 'المركز الموحد' : 'Unified Hub'}
                        </Button>
                      </Link>
                    )}

                    <Link to="/coffee-resale" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-white font-black uppercase text-xs tracking-widest gap-4 h-14 bg-white/[0.02] rounded-2xl hover:bg-white/5">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        {language === 'ar' ? 'السوق' : 'Marketplace'}
                      </Button>
                    </Link>

                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-white font-black uppercase text-xs tracking-widest gap-4 h-14 bg-white/[0.02] rounded-2xl hover:bg-white/5">
                        <User className="w-5 h-5 text-primary" />
                        {language === 'ar' ? 'الملف الشخصي' : 'My Profile'}
                      </Button>
                    </Link>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2 glass-card flex items-center justify-center rounded-2xl bg-white/[0.02]">
                        <LanguageSwitcher />
                      </div>
                      <Button
                        variant="ghost"
                        className="w-full justify-center text-destructive font-black uppercase text-xs tracking-widest gap-2 h-14 bg-destructive/5 rounded-2xl hover:bg-destructive/10"
                        onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      >
                        <LogOut className="w-4 h-4" />
                        {language === 'ar' ? 'خروج' : 'Logout'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <LanguageSwitcher />
                    </div>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-14 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-xl shadow-primary/20">
                        <LogIn className="w-5 h-5 me-3" />
                        {language === 'ar' ? 'تسجيل الدخول' : 'Login NOW'}
                      </Button>
                    </Link>
                  </>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
};

export default Header;
