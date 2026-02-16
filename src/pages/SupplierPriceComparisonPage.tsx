import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import SupplierPriceComparison from "@/components/roaster/SupplierPriceComparison";

const SupplierPriceComparisonPage = () => {
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6"
        >
          {isRtl ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
          {language === 'ar' ? 'رجوع' : 'Back'}
        </Button>

        <SupplierPriceComparison />
      </div>
    </div>
  );
};

export default SupplierPriceComparisonPage;
