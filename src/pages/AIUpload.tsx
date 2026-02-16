
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadSection from "@/components/UploadSection";
import AddCoffeeManuallySheet from "@/components/supplier/AddCoffeeManuallySheet";

const AIUpload = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          <h1 className="text-xl font-bold">
            {language === 'ar' ? 'إضافة المحاصيل' : 'Add Crops'}
          </h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>

        <Tabs defaultValue="ai" className="w-full" dir={dir}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="ai">
              {language === 'ar' ? 'رفع بالذكاء الاصطناعي' : 'AI Upload'}
            </TabsTrigger>
            <TabsTrigger value="manual">
              {language === 'ar' ? 'إضافة يدوية' : 'Manual Entry'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai">
            <UploadSection />
          </TabsContent>
          
          <TabsContent value="manual">
            <div className="max-w-2xl mx-auto">
              <AddCoffeeManuallySheet />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIUpload;
