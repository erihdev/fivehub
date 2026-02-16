import { useMessages } from '@/hooks/useMessages';
import { useLanguage } from '@/hooks/useLanguage';
import { MessageSquare, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const MessagesWidget = () => {
  const { messages, unreadCount } = useMessages();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const recentMessages = messages.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-coffee-gold" />
          <span className="text-sm font-medium">
            {isArabic ? 'الرسائل الواردة' : 'Inbox'}
          </span>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive">{unreadCount}</Badge>
        )}
      </div>

      {recentMessages.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          {isArabic ? 'لا توجد رسائل' : 'No messages'}
        </div>
      ) : (
        <div className="space-y-2">
          {recentMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-2 rounded-lg ${msg.is_read ? 'bg-secondary/50' : 'bg-coffee-gold/10'}`}
            >
              <p className="text-sm font-medium truncate">{msg.subject}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(msg.created_at), 'dd MMM HH:mm', {
                  locale: isArabic ? ar : undefined,
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <Link to="/messages" className="block">
        <Button variant="outline" size="sm" className="w-full">
          <MessageSquare className="w-4 h-4 me-2" />
          {isArabic ? 'عرض الكل' : 'View All'}
        </Button>
      </Link>
    </div>
  );
};

export default MessagesWidget;
