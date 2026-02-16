import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  supplierName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WhatsAppButton({ 
  phoneNumber, 
  message, 
  supplierName,
  variant = 'outline',
  size = 'sm',
  className = ''
}: WhatsAppButtonProps) {
  const { language } = useLanguage();
  
  const defaultMessage = supplierName
    ? (language === 'ar' 
        ? `مرحباً، أنا مهتم بمنتجات ${supplierName}` 
        : `Hello, I'm interested in products from ${supplierName}`)
    : (language === 'ar' 
        ? 'مرحباً، أنا مهتم بمنتجاتكم' 
        : "Hello, I'm interested in your products");

  const finalMessage = message || defaultMessage;
  
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(finalMessage);
    const url = phoneNumber 
      ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 ${className}`}
      title={language === 'ar' ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
    >
      <MessageCircle className="h-4 w-4" />
      {size !== 'icon' && (
        <span className="ms-2">
          {language === 'ar' ? 'واتساب' : 'WhatsApp'}
        </span>
      )}
    </Button>
  );
}
