import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

export const useReportFailureAlerts = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const checkFailedReports = useCallback(async () => {
    if (!user) return;

    // Check for failed reports in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: failedReports, error } = await supabase
      .from('sent_reports')
      .select('*')
      .eq('status', 'failed')
      .gte('sent_at', oneDayAgo.toISOString())
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error checking failed reports:', error);
      return;
    }

    if (failedReports && failedReports.length > 0) {
      const latestFailure = failedReports[0];
      
      toast({
        variant: "destructive",
        title: isArabic ? 'فشل إرسال التقرير' : 'Report Sending Failed',
        description: isArabic 
          ? `فشل إرسال ${failedReports.length} تقرير. آخر خطأ: ${latestFailure.error_message || 'خطأ غير معروف'}`
          : `${failedReports.length} report(s) failed. Last error: ${latestFailure.error_message || 'Unknown error'}`,
        duration: 10000,
      });
    }
  }, [user, isArabic]);

  useEffect(() => {
    if (!user) return;

    // Check on mount
    checkFailedReports();

    // Subscribe to real-time changes for failed reports
    const channel = supabase
      .channel('report-failures')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sent_reports',
          filter: 'status=eq.failed',
        },
        (payload) => {
          const report = payload.new as { error_message?: string; recipient_email?: string };
          
          toast({
            variant: "destructive",
            title: isArabic ? 'فشل إرسال التقرير' : 'Report Sending Failed',
            description: isArabic 
              ? `فشل الإرسال إلى ${report.recipient_email}. ${report.error_message || ''}`
              : `Failed to send to ${report.recipient_email}. ${report.error_message || ''}`,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isArabic, checkFailedReports]);

  return { checkFailedReports };
};
