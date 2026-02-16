import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Package, 
  Building2, 
  FileText, 
  Calculator, 
  ShoppingCart, 
  MessageSquare,
  Bell,
  Map,
} from 'lucide-react';

export const QuickActionsWidget = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const actions = [
    { icon: Building2, label: isArabic ? 'الموردين' : 'Suppliers', to: '/suppliers' },
    { icon: Package, label: isArabic ? 'المخزون' : 'Inventory', to: '/inventory' },
    { icon: ShoppingCart, label: isArabic ? 'طلباتي' : 'My Orders', to: '/buyer-orders' },
    { icon: FileText, label: isArabic ? 'التقارير' : 'Reports', to: '/reports' },
    { icon: Calculator, label: isArabic ? 'الحاسبة' : 'Calculator', to: '/calculator' },
    { icon: MessageSquare, label: isArabic ? 'الرسائل' : 'Messages', to: '/messages' },
    { icon: Bell, label: isArabic ? 'التنبيهات' : 'Alerts', to: '/price-alerts' },
    { icon: Map, label: isArabic ? 'الخريطة' : 'Map', to: '/origin-map' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(action => (
        <Link key={action.to} to={action.to}>
          <Button
            variant="ghost"
            className="w-full h-auto flex flex-col items-center gap-1 p-2 hover:bg-coffee-gold/10"
          >
            <action.icon className="w-5 h-5 text-coffee-gold" />
            <span className="text-xs">{action.label}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default QuickActionsWidget;
