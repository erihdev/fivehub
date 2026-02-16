import { useState, useEffect } from 'react';
import { History, Mail, CheckCircle, XCircle, Clock, Loader2, TestTube, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SentReport {
  id: string;
  report_type: string;
  sent_at: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  is_test: boolean;
  report_data: {
    totalOrders?: number;
    ordersValue?: number;
    autoReorders?: number;
    lowStockCount?: number;
    predictionsCount?: number;
  } | null;
}

const SentReportsLog = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [reports, setReports] = useState<SentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('sent_reports')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setReports(data as SentReport[]);
    }
    setIsLoading(false);
  };

  const retryReport = async (reportId: string) => {
    if (!user) return;

    setRetryingIds(prev => new Set(prev).add(reportId));

    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-report', {
        body: { testMode: true, userId: user.id },
      });

      if (error) throw error;

      // Update the failed report status in the UI
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: 'retrying', error_message: null }
          : r
      ));

      // Refresh the list after a short delay
      setTimeout(fetchReports, 2000);

      toast({
        title: isArabic ? 'تم إعادة الإرسال' : 'Retry Sent',
        description: isArabic 
          ? 'تم إرسال التقرير مرة أخرى بنجاح' 
          : 'Report has been resent successfully',
      });
    } catch (error) {
      console.error('Error retrying report:', error);
      toast({
        variant: 'destructive',
        title: isArabic ? 'فشل إعادة الإرسال' : 'Retry Failed',
        description: isArabic 
          ? 'فشلت إعادة إرسال التقرير' 
          : 'Failed to resend the report',
      });
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  };

  const retryAllFailed = async () => {
    const failedReports = reports.filter(r => r.status === 'failed');
    
    for (const report of failedReports) {
      await retryReport(report.id);
    }
  };

  const failedCount = reports.filter(r => r.status === 'failed').length;

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
          <History className="h-5 w-5 text-primary" />
          {isArabic ? 'سجل التقارير المرسلة' : 'Sent Reports Log'}
          <Badge variant="outline" className="mr-auto">{reports.length}</Badge>
          {failedCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryAllFailed}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 ml-1" />
              {isArabic ? `إعادة إرسال الفاشلة (${failedCount})` : `Retry Failed (${failedCount})`}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? 'لا توجد تقارير مرسلة بعد' : 'No reports sent yet'}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 rounded-lg border ${
                    report.status === 'sent' 
                      ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                      : 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {report.status === 'sent' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {isArabic ? 'تقرير أسبوعي' : 'Weekly Report'}
                          </span>
                          {report.is_test && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <TestTube className="h-3 w-3" />
                              {isArabic ? 'تجريبي' : 'Test'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{report.recipient_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryReport(report.id)}
                          disabled={retryingIds.has(report.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          {retryingIds.has(report.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 ml-1" />
                              {isArabic ? 'إعادة' : 'Retry'}
                            </>
                          )}
                        </Button>
                      )}
                      <div className="text-left text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(report.sent_at), 'PPp', { locale: dateLocale })}
                      </div>
                    </div>
                  </div>

                  {report.report_data && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.report_data.totalOrders !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {isArabic ? 'الطلبات:' : 'Orders:'} {report.report_data.totalOrders}
                        </Badge>
                      )}
                      {report.report_data.lowStockCount !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {isArabic ? 'مخزون منخفض:' : 'Low stock:'} {report.report_data.lowStockCount}
                        </Badge>
                      )}
                      {report.report_data.predictionsCount !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {isArabic ? 'تنبؤات:' : 'Predictions:'} {report.report_data.predictionsCount}
                        </Badge>
                      )}
                    </div>
                  )}

                  {report.error_message && (
                    <p className="mt-2 text-sm text-red-600">
                      {isArabic ? 'خطأ:' : 'Error:'} {report.error_message}
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

export default SentReportsLog;
