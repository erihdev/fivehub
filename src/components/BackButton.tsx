import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface BackButtonProps {
  fallbackPath?: string;
}

export default function BackButton({ fallbackPath }: BackButtonProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userRole } = useAuth();
  const isArabic = language === "ar";

  const handleBack = () => {
    // If there's a fallback path, use it
    if (fallbackPath) {
      navigate(fallbackPath);
      return;
    }

    // Otherwise, navigate based on user role
    const roleDashboards: Record<string, string> = {
      roaster: "/roaster-dashboard",
      supplier: "/supplier-dashboard",
      cafe: "/cafe-dashboard",
      farmer: "/farm-dashboard",
      farm: "/farm-dashboard",
      maintenance: "/maintenance-dashboard",
    };

    const dashboard = userRole ? roleDashboards[userRole] : "/dashboard";
    navigate(dashboard || "/dashboard");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      className="shrink-0"
    >
      {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
    </Button>
  );
}
