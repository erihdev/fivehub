import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const AdminBackButton = () => {
  const { language, dir } = useLanguage();
  
  return (
    <Link to="/admin-landing">
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 mb-4 border-primary/30 hover:bg-primary/10 hover:border-primary"
      >
        <ArrowRight className={`w-4 h-4 ${dir === 'ltr' ? 'rotate-180' : ''}`} />
        {language === 'ar' ? 'العودة للوحة الرئيسية' : 'Back to Main Panel'}
      </Button>
    </Link>
  );
};

export default AdminBackButton;
