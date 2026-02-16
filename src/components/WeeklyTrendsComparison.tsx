import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Loader2, BarChart3, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface WeekData {
  weekLabel: string;
  orders: number;
  ordersValue: number;
  autoReorders: number;
  avgStock: number;
}

const WeeklyTrendsComparison = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [weeksCount, setWeeksCount] = useState('4');
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchWeeklyData();
    }
  }, [user, weeksCount]);

  const fetchWeeklyData = async () => {
    setIsLoading(true);
    const weeks = parseInt(weeksCount);
    const data: WeekData[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });

      // Fetch orders for this week
      const { data: orders } = await supabase
        .from('orders')
        .select('quantity_kg, total_price, notes')
        .gte('order_date', weekStart.toISOString().split('T')[0])
        .lte('order_date', weekEnd.toISOString().split('T')[0]);

      // Fetch inventory snapshot
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity_kg');

      const totalOrders = orders?.length || 0;
      const ordersValue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const autoReorders = orders?.filter(o => o.notes?.includes('طلب تلقائي') || o.notes?.includes('auto')).length || 0;
      const avgStock = inventory?.reduce((sum, i) => sum + (i.quantity_kg || 0), 0) / (inventory?.length || 1) || 0;

      data.push({
        weekLabel: format(weekStart, 'dd MMM', { locale: dateLocale }),
        orders: totalOrders,
        ordersValue: Math.round(ordersValue),
        autoReorders,
        avgStock: Math.round(avgStock * 10) / 10,
      });
    }

    setWeeklyData(data);
    setIsLoading(false);
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
  };

  const exportToCSV = () => {
    if (weeklyData.length === 0) return;

    const headers = isArabic 
      ? ['الأسبوع', 'الطلبات', 'قيمة الطلبات', 'طلبات تلقائية', 'متوسط المخزون (كجم)']
      : ['Week', 'Orders', 'Orders Value', 'Auto Orders', 'Avg Stock (kg)'];

    const csvContent = [
      '\uFEFF' + headers.join(','),
      ...weeklyData.map(week => 
        [week.weekLabel, week.orders, week.ordersValue, week.autoReorders, week.avgStock].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-comparison-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: isArabic ? 'تم التصدير' : 'Exported',
      description: isArabic ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
    });
  };

  const generateSVGChart = (data: WeekData[], metric: keyof WeekData, color: string, label: string) => {
    if (data.length === 0) return '';
    
    const width = 400;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const values = data.map(d => Number(d[metric]));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;
    
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = height - padding - ((Number(d[metric]) - minValue) / range) * chartHeight;
      return { x, y, value: Number(d[metric]), label: d.weekLabel };
    });
    
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #8B4513; font-size: 14px; margin-bottom: 10px;">${label}</h3>
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: #faf8f5; border-radius: 8px;">
          <!-- Grid lines -->
          ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - padding - ratio * chartHeight;
            const value = Math.round(minValue + ratio * range);
            return `
              <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e0d5c5" stroke-dasharray="3,3"/>
              <text x="${padding - 5}" y="${y + 4}" fill="#888" font-size="10" text-anchor="end">${value}</text>
            `;
          }).join('')}
          
          <!-- Area fill -->
          <path d="${areaPath}" fill="${color}" fill-opacity="0.2"/>
          
          <!-- Line -->
          <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2"/>
          
          <!-- Points and labels -->
          ${points.map((p, i) => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="${p.x}" y="${height - 10}" fill="#666" font-size="9" text-anchor="middle">${p.label}</text>
            <text x="${p.x}" y="${p.y - 10}" fill="${color}" font-size="10" font-weight="bold" text-anchor="middle">${p.value}</text>
          `).join('')}
        </svg>
      </div>
    `;
  };

  const generateBarChart = (data: WeekData[]) => {
    if (data.length === 0) return '';
    
    const width = 500;
    const height = 250;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxOrders = Math.max(...data.map(d => d.orders), 1);
    const maxAuto = Math.max(...data.map(d => d.autoReorders), 1);
    const maxValue = Math.max(maxOrders, maxAuto);
    
    const barWidth = chartWidth / (data.length * 3);
    const gap = barWidth * 0.5;
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #8B4513; font-size: 14px; margin-bottom: 10px;">${isArabic ? 'مقارنة الطلبات' : 'Orders Comparison'}</h3>
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: #faf8f5; border-radius: 8px;">
          <!-- Grid lines -->
          ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - padding - ratio * chartHeight;
            const value = Math.round(ratio * maxValue);
            return `
              <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e0d5c5" stroke-dasharray="3,3"/>
              <text x="${padding - 5}" y="${y + 4}" fill="#888" font-size="10" text-anchor="end">${value}</text>
            `;
          }).join('')}
          
          <!-- Bars -->
          ${data.map((d, i) => {
            const groupX = padding + (i / data.length) * chartWidth + barWidth;
            const ordersHeight = (d.orders / maxValue) * chartHeight;
            const autoHeight = (d.autoReorders / maxValue) * chartHeight;
            
            return `
              <rect x="${groupX}" y="${height - padding - ordersHeight}" width="${barWidth}" height="${ordersHeight}" fill="#8B4513" rx="2"/>
              <rect x="${groupX + barWidth + gap}" y="${height - padding - autoHeight}" width="${barWidth}" height="${autoHeight}" fill="#D4A574" rx="2"/>
              <text x="${groupX + barWidth}" y="${height - 10}" fill="#666" font-size="9" text-anchor="middle">${d.weekLabel}</text>
            `;
          }).join('')}
          
          <!-- Legend -->
          <rect x="${width - 120}" y="10" width="12" height="12" fill="#8B4513" rx="2"/>
          <text x="${width - 105}" y="20" fill="#666" font-size="10">${isArabic ? 'الطلبات' : 'Orders'}</text>
          <rect x="${width - 120}" y="28" width="12" height="12" fill="#D4A574" rx="2"/>
          <text x="${width - 105}" y="38" fill="#666" font-size="10">${isArabic ? 'تلقائية' : 'Auto'}</text>
        </svg>
      </div>
    `;
  };

  const exportToPDF = () => {
    if (weeklyData.length === 0) return;

    const currentWeekData = weeklyData[weeklyData.length - 1];
    const previousWeekData = weeklyData[weeklyData.length - 2];

    const getChangeIndicator = (current: number, previous: number) => {
      if (!previous) return '';
      const change = ((current - previous) / previous) * 100;
      const arrow = change >= 0 ? '↑' : '↓';
      return `${arrow} ${Math.abs(Math.round(change))}%`;
    };

    const ordersChart = generateSVGChart(weeklyData, 'orders', '#8B4513', isArabic ? 'اتجاه الطلبات' : 'Orders Trend');
    const valueChart = generateSVGChart(weeklyData, 'ordersValue', '#D4A574', isArabic ? 'اتجاه القيمة' : 'Value Trend');
    const stockChart = generateSVGChart(weeklyData, 'avgStock', '#6B8E23', isArabic ? 'اتجاه المخزون' : 'Stock Trend');
    const barChart = generateBarChart(weeklyData);

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${isArabic ? 'تقرير مقارنة الأداء الأسبوعي' : 'Weekly Performance Comparison Report'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #fff;
            color: #1a1a1a;
            direction: ${isArabic ? 'rtl' : 'ltr'};
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #8B4513;
          }
          .header h1 {
            color: #8B4513;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          .summary-card {
            background: #f8f5f0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e0d5c5;
          }
          .summary-card .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          .summary-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #8B4513;
          }
          .summary-card .change {
            font-size: 12px;
            margin-top: 8px;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
          }
          .summary-card .change.positive { background: #dcfce7; color: #166534; }
          .summary-card .change.negative { background: #fee2e2; color: #991b1b; }
          .charts-section {
            margin-bottom: 40px;
          }
          .charts-section h2 {
            color: #8B4513;
            font-size: 18px;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0d5c5;
          }
          .charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .table-section {
            margin-bottom: 40px;
          }
          .table-section h2 {
            color: #8B4513;
            font-size: 18px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0d5c5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 14px 16px;
            text-align: ${isArabic ? 'right' : 'left'};
            border-bottom: 1px solid #e5e5e5;
          }
          th {
            background: #8B4513;
            color: white;
            font-weight: 600;
          }
          tr:nth-child(even) { background: #faf8f5; }
          tr:hover { background: #f5f0e8; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0d5c5;
            text-align: center;
            color: #888;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            .charts-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${isArabic ? 'تقرير مقارنة الأداء الأسبوعي' : 'Weekly Performance Comparison Report'}</h1>
          <p>${isArabic ? 'تاريخ التقرير:' : 'Report Date:'} ${format(new Date(), 'dd MMMM yyyy', { locale: dateLocale })}</p>
          <p>${isArabic ? 'عدد الأسابيع:' : 'Weeks Analyzed:'} ${weeksCount}</p>
        </div>

        ${currentWeekData && previousWeekData ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">${isArabic ? 'الطلبات (هذا الأسبوع)' : 'Orders (This Week)'}</div>
            <div class="value">${currentWeekData.orders}</div>
            <div class="change ${currentWeekData.orders >= previousWeekData.orders ? 'positive' : 'negative'}">
              ${getChangeIndicator(currentWeekData.orders, previousWeekData.orders)}
            </div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? 'قيمة الطلبات' : 'Orders Value'}</div>
            <div class="value">${currentWeekData.ordersValue.toLocaleString()}</div>
            <div class="change ${currentWeekData.ordersValue >= previousWeekData.ordersValue ? 'positive' : 'negative'}">
              ${getChangeIndicator(currentWeekData.ordersValue, previousWeekData.ordersValue)}
            </div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? 'طلبات تلقائية' : 'Auto Orders'}</div>
            <div class="value">${currentWeekData.autoReorders}</div>
            <div class="change ${currentWeekData.autoReorders >= previousWeekData.autoReorders ? 'positive' : 'negative'}">
              ${getChangeIndicator(currentWeekData.autoReorders, previousWeekData.autoReorders)}
            </div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? 'متوسط المخزون' : 'Avg Stock'}</div>
            <div class="value">${currentWeekData.avgStock} kg</div>
            <div class="change ${currentWeekData.avgStock >= previousWeekData.avgStock ? 'positive' : 'negative'}">
              ${getChangeIndicator(currentWeekData.avgStock, previousWeekData.avgStock)}
            </div>
          </div>
        </div>
        ` : ''}

        <div class="charts-section">
          <h2>${isArabic ? 'الرسوم البيانية' : 'Charts'}</h2>
          <div class="charts-grid">
            ${ordersChart}
            ${valueChart}
            ${stockChart}
            ${barChart}
          </div>
        </div>

        <div class="table-section">
          <h2>${isArabic ? 'تفاصيل الأسابيع' : 'Weekly Details'}</h2>
          <table>
            <thead>
              <tr>
                <th>${isArabic ? 'الأسبوع' : 'Week'}</th>
                <th>${isArabic ? 'الطلبات' : 'Orders'}</th>
                <th>${isArabic ? 'قيمة الطلبات' : 'Value'}</th>
                <th>${isArabic ? 'طلبات تلقائية' : 'Auto Orders'}</th>
                <th>${isArabic ? 'متوسط المخزون (كجم)' : 'Avg Stock (kg)'}</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyData.map(week => `
                <tr>
                  <td><strong>${week.weekLabel}</strong></td>
                  <td>${week.orders}</td>
                  <td>${week.ordersValue.toLocaleString()}</td>
                  <td>${week.autoReorders}</td>
                  <td>${week.avgStock}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>${isArabic ? 'تم إنشاء هذا التقرير تلقائياً بواسطة نظام دال للقهوة' : 'This report was automatically generated by Dal Coffee System'}</p>
          <p>${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast({
      title: isArabic ? 'جاري التصدير' : 'Exporting',
      description: isArabic ? 'تم فتح نافذة الطباعة' : 'Print dialog opened',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">
            {isArabic ? 'جاري تحليل البيانات...' : 'Analyzing data...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeek = weeklyData[weeklyData.length - 2];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isArabic ? 'مقارنة الأسابيع' : 'Weekly Comparison'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={weeklyData.length === 0}>
              <FileText className="h-4 w-4 ml-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={weeklyData.length === 0}>
              <Download className="h-4 w-4 ml-1" />
              CSV
            </Button>
            <Select value={weeksCount} onValueChange={setWeeksCount}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">{isArabic ? '4 أسابيع' : '4 weeks'}</SelectItem>
                <SelectItem value="8">{isArabic ? '8 أسابيع' : '8 weeks'}</SelectItem>
                <SelectItem value="12">{isArabic ? '12 أسبوع' : '12 weeks'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        {currentWeek && previousWeek && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isArabic ? 'الطلبات' : 'Orders'}
                </span>
                {getTrendIcon(currentWeek.orders, previousWeek.orders)}
              </div>
              <div className="text-2xl font-bold">{currentWeek.orders}</div>
              <Badge variant="outline" className="mt-1 text-xs">
                {getPercentChange(currentWeek.orders, previousWeek.orders)}
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isArabic ? 'القيمة' : 'Value'}
                </span>
                {getTrendIcon(currentWeek.ordersValue, previousWeek.ordersValue)}
              </div>
              <div className="text-2xl font-bold">{currentWeek.ordersValue.toLocaleString()}</div>
              <Badge variant="outline" className="mt-1 text-xs">
                {getPercentChange(currentWeek.ordersValue, previousWeek.ordersValue)}
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isArabic ? 'طلبات تلقائية' : 'Auto Orders'}
                </span>
                {getTrendIcon(currentWeek.autoReorders, previousWeek.autoReorders)}
              </div>
              <div className="text-2xl font-bold">{currentWeek.autoReorders}</div>
              <Badge variant="outline" className="mt-1 text-xs">
                {getPercentChange(currentWeek.autoReorders, previousWeek.autoReorders)}
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isArabic ? 'متوسط المخزون' : 'Avg Stock'}
                </span>
                {getTrendIcon(currentWeek.avgStock, previousWeek.avgStock)}
              </div>
              <div className="text-2xl font-bold">{currentWeek.avgStock} kg</div>
              <Badge variant="outline" className="mt-1 text-xs">
                {getPercentChange(currentWeek.avgStock, previousWeek.avgStock)}
              </Badge>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="weekLabel" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="orders"
                name={isArabic ? 'الطلبات' : 'Orders'}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line
                type="monotone"
                dataKey="autoReorders"
                name={isArabic ? 'طلبات تلقائية' : 'Auto Orders'}
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
              />
              <Line
                type="monotone"
                dataKey="avgStock"
                name={isArabic ? 'متوسط المخزون' : 'Avg Stock'}
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-3))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyTrendsComparison;
