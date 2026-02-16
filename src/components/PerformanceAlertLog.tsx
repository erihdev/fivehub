import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Loader2, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface AlertLog {
  id: string;
  score: number;
  threshold: number;
  recipient_email: string;
  status: string;
  error_message: string | null;
  alert_data: {
    ordersCount?: number;
    ordersValue?: number;
    lowStockItems?: number;
    stockTurnover?: number;
  } | null;
  sent_at: string;
}

const PerformanceAlertLog = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('performance_alert_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setLogs(data as AlertLog[]);
    }
    setIsLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {isArabic ? 'سجل تنبيهات الأداء' : 'Performance Alert Log'}
          <Badge variant="outline" className="mr-auto">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? 'لا توجد تنبيهات مرسلة بعد' : 'No alerts sent yet'}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.status === 'sent' 
                      ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900' 
                      : 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {log.status === 'sent' ? (
                        <CheckCircle className="h-5 w-5 text-orange-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {isArabic ? 'تنبيه أداء' : 'Performance Alert'}
                          </span>
                          <Badge variant="secondary" className={`text-xs ${getScoreColor(log.score)}`}>
                            {log.score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
                      </div>
                    </div>
                    <div className="text-left text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.sent_at), 'PPp', { locale: dateLocale })}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {isArabic ? 'الحد:' : 'Threshold:'} {log.threshold}
                    </Badge>
                    {log.alert_data?.ordersCount !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {isArabic ? 'الطلبات:' : 'Orders:'} {log.alert_data.ordersCount}
                      </Badge>
                    )}
                    {log.alert_data?.lowStockItems !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {isArabic ? 'مخزون منخفض:' : 'Low stock:'} {log.alert_data.lowStockItems}
                      </Badge>
                    )}
                    {log.alert_data?.stockTurnover !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {isArabic ? 'الدوران:' : 'Turnover:'} {log.alert_data.stockTurnover}%
                      </Badge>
                    )}
                  </div>

                  {log.error_message && (
                    <p className="mt-2 text-sm text-red-600">
                      {isArabic ? 'خطأ:' : 'Error:'} {log.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceAlertLog;
