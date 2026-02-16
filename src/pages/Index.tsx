import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TypicaHero from "@/components/landing/TypicaHero";
import Ticker from "@/components/landing/Ticker";
import CommunityStats from "@/components/landing/CommunityStats";
import Prologue from "@/components/landing/Prologue";
import Narratives from "@/components/landing/Narratives";
import Journal from "@/components/landing/Journal";
import TradingData from "@/components/landing/TradingData";
import OriginTabs from "@/components/landing/OriginTabs";
import DiscoveryMap from "@/components/landing/DiscoveryMap";
import SaudiCoffeeDirectory from "@/components/landing/SaudiCoffeeDirectory";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { dir } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const checkUserRoleAndRedirect = async () => {
      if (authLoading) return;

      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      try {
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role, status")
          .eq("user_id", user.id)
          .single();

        if (userRole) {
          if (userRole.status === "pending") {
            window.location.href = "/pending-approval";
            return;
          } else if (userRole.status === "approved") {
            if (userRole.role === "admin") {
              window.location.href = "/admin";
              return;
            } else if (userRole.role === "supplier") {
              window.location.href = "/supplier-dashboard";
              return;
            } else if (userRole.role === "farm") {
              window.location.href = "/farm-dashboard";
              return;
            } else if (userRole.role === "roaster") {
              window.location.href = "/roaster-dashboard";
              return;
            } else if (userRole.role === "cafe") {
              window.location.href = "/cafe-dashboard";
              return;
            } else if (userRole.role === "maintenance") {
              window.location.href = "/maintenance-dashboard";
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }

      setIsCheckingRole(false);
    };

    checkUserRoleAndRedirect();
  }, [user, authLoading]);

  // Show loading while checking role
  if (authLoading || (user && isCheckingRole)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background" dir={dir}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen font-arabic bg-aura relative overflow-hidden" dir={dir}>
      {/* Cinematic Aura Layers */}
      <div className="absolute inset-0 bg-aura opacity-30 animate-aura pointer-events-none" />

      <div className="relative z-10">
        <TypicaHero />

        <div className="space-y-32 pb-32">
          {/* Main Content Sections - Simplified to only show high-impact visuals */}
          <section className="container mx-auto px-4">
            <SaudiCoffeeDirectory />
          </section>

          <section className="container mx-auto px-4">
            <Narratives />
          </section>

          <section className="container mx-auto px-4">
            <TradingData />
          </section>

          <section className="container mx-auto px-4">
            <Journal />
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
};

export default Index;
