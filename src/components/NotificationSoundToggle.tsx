import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useLanguage } from '@/hooks/useLanguage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const NotificationSoundToggle = () => {
  const { isSoundEnabled, toggleSound, playNotificationSound } = useNotificationSound();
  const { language } = useLanguage();

  const handleClick = () => {
    toggleSound();
    // Play sound when enabling to demonstrate
    if (!isSoundEnabled) {
      setTimeout(playNotificationSound, 100);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={isSoundEnabled 
              ? 'text-green-500 hover:text-green-600 hover:bg-green-500/10' 
              : 'text-red-500 hover:text-red-600 hover:bg-red-500/10'}
          >
            {isSoundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isSoundEnabled
              ? (language === 'ar' ? 'إيقاف صوت الإشعارات' : 'Mute notifications')
              : (language === 'ar' ? 'تشغيل صوت الإشعارات' : 'Unmute notifications')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
