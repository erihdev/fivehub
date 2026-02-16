import { WifiOff, RefreshCw } from "lucide-react";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const OfflineIndicator = () => {
  const { isOnline, isUpdateAvailable, updateServiceWorker } = useServiceWorker();
  const { language } = useLanguage();

  if (isOnline && !isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
      {!isOnline && (
        <div className="bg-warning/90 text-warning-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {language === 'ar' ? 'أنت غير متصل بالإنترنت' : 'You are offline'}
          </span>
        </div>
      )}
      
      {isUpdateAvailable && isOnline && (
        <div className="bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm">
          <RefreshCw className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {language === 'ar' ? 'يتوفر تحديث جديد' : 'New update available'}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={updateServiceWorker}
            className="mr-2"
          >
            {language === 'ar' ? 'تحديث' : 'Update'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
