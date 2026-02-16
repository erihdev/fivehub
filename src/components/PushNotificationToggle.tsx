import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PushNotificationToggle = () => {
  const { permission, isSupported, requestPermission } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (permission === 'default') {
      await requestPermission();
    }
  };

  const getIcon = () => {
    switch (permission) {
      case 'granted':
        return <BellRing className="h-5 w-5" />;
      case 'denied':
        return <BellOff className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTooltipText = () => {
    switch (permission) {
      case 'granted':
        return 'الإشعارات مفعلة';
      case 'denied':
        return 'الإشعارات مرفوضة - يمكنك تفعيلها من إعدادات المتصفح';
      default:
        return 'تفعيل إشعارات المتصفح';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={permission === 'denied'}
          className={permission === 'granted' ? 'text-success' : ''}
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default PushNotificationToggle;
