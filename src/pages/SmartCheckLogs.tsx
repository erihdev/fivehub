import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Filter,
  RefreshCw,
  Globe,
  Mail,
  TrendingDown,
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { format, subDays, startOfDay, endOfDay, parseISO, eachDayOfInterval } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SmartCheckLog {
  id: string;
  sent_at: string;
  recipient_email: string;
  score: number;
  threshold: number;
  status: string;
  error_message: string | null;
  alert_data: {
    type?: string;
    risk_level?: string;
    predictions?: {
      riskLevel?: string;
      averagePrediction?: number;
      predictedScores?: number[];
    };
    timezone?: string;
    local_time?: string;
  } | null;
}

const SmartCheckLogs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  const [logs, setLogs] = useState<SmartCheckLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('30');
  const [filterRisk, setFilterRisk] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    successRate: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchLogs();
  }, [user, navigate, filterDays]);

  const fetchLogs = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const daysAgo = parseInt(filterDays);
      const startDate = startOfDay(subDays(new Date(), daysAgo));

      const { data, error } = await supabase
        .from('performance_alert_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const alertLogs = (data || []) as SmartCheckLog[];
      setLogs(alertLogs);

      // Calculate stats
      const smartCheckLogs = alertLogs.filter(log => 
        (log.alert_data as any)?.type === 'smart_check'
      );
      
      const highRisk = smartCheckLogs.filter(log => 
        (log.alert_data as any)?.risk_level === 'high'
      ).length;
      
      const mediumRisk = smartCheckLogs.filter(log => 
        (log.alert_data as any)?.risk_level === 'medium'
      ).length;
      
      const successful = smartCheckLogs.filter(log => log.status === 'sent').length;

      setStats({
        total: smartCheckLogs.length,
        highRisk,
        mediumRisk,
        lowRisk: smartCheckLogs.length - highRisk - mediumRisk,
        successRate: smartCheckLogs.length > 0 ? Math.round((successful / smartCheckLogs.length) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs.filter(log => (log.alert_data as any)?.type === 'smart_check');
    
    if (filterRisk !== 'all') {
      filtered = filtered.filter(log => (log.alert_data as any)?.risk_level === filterRisk);
    }
    
    return filtered;
  };

  const getRiskIcon = (riskLevel: string | undefined) => {
    switch (riskLevel) {
      case 'high':
        return <ShieldAlert className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  const getRiskBadge = (riskLevel: string | undefined) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">{isArabic ? 'عالي' : 'High'}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">{isArabic ? 'متوسط' : 'Medium'}</Badge>;
      default:
        return <Badge className="bg-green-600">{isArabic ? 'منخفض' : 'Low'}</Badge>;
    }
  };

  // Prepare chart data - risk levels over time
  const chartData = useMemo(() => {
    const smartCheckLogs = logs.filter(log => (log.alert_data as any)?.type === 'smart_check');
    if (smartCheckLogs.length === 0) return [];

    const daysAgo = parseInt(filterDays);
    const startDate = startOfDay(subDays(new Date(), daysAgo));
    const endDate = endOfDay(new Date());
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = smartCheckLogs.filter(log => 
        format(parseISO(log.sent_at), 'yyyy-MM-dd') === dayStr
      );
      
      const high = dayLogs.filter(log => (log.alert_data as any)?.risk_level === 'high').length;
      const medium = dayLogs.filter(log => (log.alert_data as any)?.risk_level === 'medium').length;
      const low = dayLogs.filter(log => 
        (log.alert_data as any)?.risk_level !== 'high' && (log.alert_data as any)?.risk_level !== 'medium'
      ).length;
      
      return {
        date: format(day, 'dd MMM', { locale: dateLocale }),
        fullDate: dayStr,
        high,
        medium,
        low,
        total: dayLogs.length,
      };
    }).filter(d => d.total > 0 || days.length <= 14); // Show all days if period is short
  }, [logs, filterDays, dateLocale]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: isArabic ? 'عالي' : 'High', value: stats.highRisk, color: '#ef4444' },
      { name: isArabic ? 'متوسط' : 'Medium', value: stats.mediumRisk, color: '#eab308' },
      { name: isArabic ? 'منخفض' : 'Low', value: stats.lowRisk, color: '#22c55e' },
    ].filter(d => d.value > 0);
  }, [stats, isArabic]);

  const filteredLogs = getFilteredLogs();

  const COLORS = ['#ef4444', '#eab308', '#22c55e'];

  // Export to CSV
  const exportToCSV = () => {
    const exportData = filteredLogs.map(log => {
      const alertData = log.alert_data as any;
      const predictions = alertData?.predictions;
      return {
        [isArabic ? 'التاريخ' : 'Date']: format(new Date(log.sent_at), 'yyyy-MM-dd HH:mm'),
        [isArabic ? 'مستوى المخاطر' : 'Risk Level']: alertData?.risk_level === 'high' 
          ? (isArabic ? 'عالي' : 'High') 
          : alertData?.risk_level === 'medium' 
          ? (isArabic ? 'متوسط' : 'Medium') 
          : (isArabic ? 'منخفض' : 'Low'),
        [isArabic ? 'متوسط التوقع' : 'Avg Prediction']: predictions?.averagePrediction || log.score,
        [isArabic ? 'النقاط المتوقعة' : 'Predicted Scores']: predictions?.predictedScores?.join(', ') || '',
        [isArabic ? 'البريد الإلكتروني' : 'Email']: log.recipient_email,
        [isArabic ? 'الحالة' : 'Status']: log.status === 'sent' ? (isArabic ? 'تم الإرسال' : 'Sent') : (isArabic ? 'فشل' : 'Failed'),
        [isArabic ? 'المنطقة الزمنية' : 'Timezone']: alertData?.timezone || '',
        [isArabic ? 'رسالة الخطأ' : 'Error Message']: log.error_message || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'سجل الفحوصات' : 'Smart Checks');
    XLSX.writeFile(wb, `smart-check-logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${isArabic ? 'سجل الفحوصات الذكية' : 'Smart Check Logs'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
          h1 { color: #333; margin-bottom: 20px; }
          .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
          .stat-card { background: #f5f5f5; padding: 15px; border-radius: 8px; min-width: 120px; }
          .stat-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
          .stat-card p { margin: 0; font-size: 24px; font-weight: bold; }
          .high { color: #ef4444; }
          .medium { color: #eab308; }
          .low { color: #22c55e; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
          th { background: #f5f5f5; }
          .risk-high { background: #fef2f2; }
          .risk-medium { background: #fefce8; }
          .risk-low { background: #f0fdf4; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${isArabic ? 'سجل الفحوصات الذكية' : 'Smart Check Logs'}</h1>
        <p>${isArabic ? 'تاريخ التقرير:' : 'Report Date:'} ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
        <p>${isArabic ? 'الفترة:' : 'Period:'} ${isArabic ? `آخر ${filterDays} يوم` : `Last ${filterDays} days`}</p>
        
        <div class="stats">
          <div class="stat-card">
            <h3>${isArabic ? 'إجمالي الفحوصات' : 'Total Checks'}</h3>
            <p>${stats.total}</p>
          </div>
          <div class="stat-card">
            <h3>${isArabic ? 'مخاطر عالية' : 'High Risk'}</h3>
            <p class="high">${stats.highRisk}</p>
          </div>
          <div class="stat-card">
            <h3>${isArabic ? 'مخاطر متوسطة' : 'Medium Risk'}</h3>
            <p class="medium">${stats.mediumRisk}</p>
          </div>
          <div class="stat-card">
            <h3>${isArabic ? 'آمن' : 'Safe'}</h3>
            <p class="low">${stats.lowRisk}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'التاريخ' : 'Date'}</th>
              <th>${isArabic ? 'مستوى المخاطر' : 'Risk Level'}</th>
              <th>${isArabic ? 'متوسط التوقع' : 'Avg Prediction'}</th>
              <th>${isArabic ? 'النقاط المتوقعة' : 'Predicted Scores'}</th>
              <th>${isArabic ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLogs.map(log => {
              const alertData = log.alert_data as any;
              const predictions = alertData?.predictions;
              const riskLevel = alertData?.risk_level || 'low';
              return `
                <tr class="risk-${riskLevel}">
                  <td>${format(new Date(log.sent_at), 'yyyy-MM-dd HH:mm')}</td>
                  <td class="${riskLevel}">${
                    riskLevel === 'high' ? (isArabic ? 'عالي' : 'High') :
                    riskLevel === 'medium' ? (isArabic ? 'متوسط' : 'Medium') :
                    (isArabic ? 'منخفض' : 'Low')
                  }</td>
                  <td>${predictions?.averagePrediction || log.score}</td>
                  <td>${predictions?.predictedScores?.join(', ') || '-'}</td>
                  <td>${log.status === 'sent' ? (isArabic ? 'تم الإرسال' : 'Sent') : (isArabic ? 'فشل' : 'Failed')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container py-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">
            {isArabic ? 'سجل الفحوصات الذكية' : 'Smart Check Logs'}
          </h1>
        </div>
      </div>

      <main className="container py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الفحوصات' : 'Total Checks'}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'مخاطر عالية' : 'High Risk'}</p>
                  <p className="text-2xl font-bold text-destructive">{stats.highRisk}</p>
                </div>
                <ShieldAlert className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'مخاطر متوسطة' : 'Medium Risk'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.mediumRisk}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'آمن' : 'Safe'}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.lowRisk}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'نسبة النجاح' : 'Success Rate'}</p>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                </div>
                <Mail className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart - Risk over time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {isArabic ? 'توزيع المخاطر عبر الوقت' : 'Risk Distribution Over Time'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          direction: isArabic ? 'rtl' : 'ltr'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend 
                        wrapperStyle={{ direction: isArabic ? 'rtl' : 'ltr' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="high" 
                        name={isArabic ? 'عالي' : 'High'}
                        stackId="1"
                        stroke="#ef4444" 
                        fill="#ef4444" 
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="medium" 
                        name={isArabic ? 'متوسط' : 'Medium'}
                        stackId="1"
                        stroke="#eab308" 
                        fill="#eab308" 
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="low" 
                        name={isArabic ? 'منخفض' : 'Low'}
                        stackId="1"
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart - Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {isArabic ? 'نسبة المخاطر' : 'Risk Ratio'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {isArabic ? 'التصفية' : 'Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={filterDays} onValueChange={setFilterDays}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{isArabic ? 'آخر 7 أيام' : 'Last 7 days'}</SelectItem>
                    <SelectItem value="30">{isArabic ? 'آخر 30 يوم' : 'Last 30 days'}</SelectItem>
                    <SelectItem value="90">{isArabic ? 'آخر 90 يوم' : 'Last 90 days'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? 'جميع المستويات' : 'All Levels'}</SelectItem>
                    <SelectItem value="high">{isArabic ? 'عالي فقط' : 'High Only'}</SelectItem>
                    <SelectItem value="medium">{isArabic ? 'متوسط فقط' : 'Medium Only'}</SelectItem>
                    <SelectItem value="low">{isArabic ? 'منخفض فقط' : 'Low Only'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isArabic ? 'تحديث' : 'Refresh'}
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredLogs.length === 0}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                {isArabic ? 'تصدير CSV' : 'Export CSV'}
              </Button>

              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredLogs.length === 0}>
                <FileText className="h-4 w-4 ml-2" />
                {isArabic ? 'تصدير PDF' : 'Export PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isArabic ? 'سجل الفحوصات' : 'Check History'}
            </CardTitle>
            <CardDescription>
              {isArabic 
                ? `عرض ${filteredLogs.length} فحص من أصل ${stats.total}` 
                : `Showing ${filteredLogs.length} of ${stats.total} checks`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isArabic ? 'لا توجد فحوصات في هذه الفترة' : 'No checks in this period'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const alertData = log.alert_data as any;
                  const predictions = alertData?.predictions;
                  
                  return (
                    <div 
                      key={log.id} 
                      className={`p-4 rounded-lg border ${
                        alertData?.risk_level === 'high' 
                          ? 'border-destructive/30 bg-destructive/5' 
                          : alertData?.risk_level === 'medium'
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : 'border-green-500/30 bg-green-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {getRiskIcon(alertData?.risk_level)}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getRiskBadge(alertData?.risk_level)}
                              <Badge variant="outline" className="text-xs">
                                {log.status === 'sent' 
                                  ? (isArabic ? 'تم الإرسال' : 'Sent') 
                                  : (isArabic ? 'فشل' : 'Failed')}
                              </Badge>
                              {alertData?.timezone && (
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="h-3 w-3 ml-1" />
                                  {alertData.timezone}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium">
                              {isArabic ? 'متوسط التوقع:' : 'Avg Prediction:'}{' '}
                              <span className="font-bold">{predictions?.averagePrediction || log.score}</span>
                            </p>

                            {predictions?.predictedScores && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {predictions.predictedScores.map((score: number, i: number) => (
                                  <Badge 
                                    key={i} 
                                    variant={score < 40 ? 'destructive' : score < 60 ? 'secondary' : 'default'}
                                    className="text-xs"
                                  >
                                    {isArabic ? `يوم ${i + 1}` : `Day ${i + 1}`}: {score}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              <Mail className="h-3 w-3 inline ml-1" />
                              {log.recipient_email}
                            </p>

                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1">
                                {isArabic ? 'خطأ:' : 'Error:'} {log.error_message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-left text-sm text-muted-foreground whitespace-nowrap">
                          <p>{format(new Date(log.sent_at), 'dd MMM yyyy', { locale: dateLocale })}</p>
                          <p className="text-xs">{format(new Date(log.sent_at), 'HH:mm', { locale: dateLocale })}</p>
                          {alertData?.local_time && (
                            <p className="text-xs mt-1">
                              ({isArabic ? 'محلي:' : 'Local:'} {alertData.local_time})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link back */}
        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/performance-alert-settings')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            {isArabic ? 'العودة لإعدادات التنبيهات' : 'Back to Alert Settings'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SmartCheckLogs;
