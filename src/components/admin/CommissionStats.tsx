import { useState, useEffect, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Flame,
  Loader2,
  Calendar,
  PieChart,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

interface Commission {
  id: string;
  order_total: number;
  supplier_commission: number;
  roaster_commission: number;
  total_commission: number;
  status: string;
  created_at: string;
}

interface CommissionSummary {
  totalCommissions: number;
  supplierCommissions: number;
  roasterCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  ordersCount: number;
  avgCommissionPerOrder: number;
}

const COLORS = ["#8B4513", "#D4A574", "#22c55e", "#3b82f6", "#f59e0b"];

const CommissionStats = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({
    totalCommissions: 0,
    supplierCommissions: 0,
    roasterCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    ordersCount: 0,
    avgCommissionPerOrder: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState("month");
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const isArabic = language === "ar";

  useEffect(() => {
    fetchCommissions();
  }, [period]);

  const fetchCommissions = async () => {
    setIsLoading(true);
    try {
      let startDate = new Date();
      
      switch (period) {
        case "week":
          startDate = subDays(new Date(), 7);
          break;
        case "month":
          startDate = startOfMonth(new Date());
          break;
        case "quarter":
          startDate = subMonths(startOfMonth(new Date()), 3);
          break;
        case "year":
          startDate = subMonths(startOfMonth(new Date()), 12);
          break;
      }

      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      setCommissions(data || []);
      calculateSummary(data || []);
      calculateMonthlyData(data || []);
    } catch (error) {
      console.error("Error fetching commissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = (data: Commission[]) => {
    const totalCommissions = data.reduce((sum, c) => sum + c.total_commission, 0);
    const supplierCommissions = data.reduce((sum, c) => sum + c.supplier_commission, 0);
    const roasterCommissions = data.reduce((sum, c) => sum + c.roaster_commission, 0);
    const pendingCommissions = data
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + c.total_commission, 0);
    const paidCommissions = data
      .filter(c => c.status === "paid")
      .reduce((sum, c) => sum + c.total_commission, 0);

    setSummary({
      totalCommissions,
      supplierCommissions,
      roasterCommissions,
      pendingCommissions,
      paidCommissions,
      ordersCount: data.length,
      avgCommissionPerOrder: data.length > 0 ? totalCommissions / data.length : 0,
    });
  };

  const calculateMonthlyData = (data: Commission[]) => {
    const grouped: Record<string, { supplier: number; roaster: number; total: number }> = {};

    data.forEach(commission => {
      const month = format(new Date(commission.created_at), "MMM yyyy", {
        locale: isArabic ? ar : undefined,
      });

      if (!grouped[month]) {
        grouped[month] = { supplier: 0, roaster: 0, total: 0 };
      }

      grouped[month].supplier += commission.supplier_commission;
      grouped[month].roaster += commission.roaster_commission;
      grouped[month].total += commission.total_commission;
    });

    setMonthlyData(
      Object.entries(grouped).map(([month, values]) => ({
        month,
        ...values,
      }))
    );
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "week": return isArabic ? "هذا الأسبوع" : "This Week";
      case "month": return isArabic ? "هذا الشهر" : "This Month";
      case "quarter": return isArabic ? "آخر 3 أشهر" : "Last 3 Months";
      case "year": return isArabic ? "هذا العام" : "This Year";
      default: return "";
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // Prepare data for Excel
      const excelData = commissions.map((c, index) => ({
        [isArabic ? "رقم" : "#"]: index + 1,
        [isArabic ? "التاريخ" : "Date"]: format(new Date(c.created_at), "dd/MM/yyyy"),
        [isArabic ? "إجمالي الطلب" : "Order Total"]: c.order_total.toFixed(2),
        [isArabic ? "عمولة المورد" : "Supplier Commission"]: c.supplier_commission.toFixed(2),
        [isArabic ? "عمولة المحمصة" : "Roaster Commission"]: c.roaster_commission.toFixed(2),
        [isArabic ? "إجمالي العمولة" : "Total Commission"]: c.total_commission.toFixed(2),
        [isArabic ? "الحالة" : "Status"]: c.status === "paid" 
          ? (isArabic ? "مدفوعة" : "Paid") 
          : (isArabic ? "معلقة" : "Pending"),
      }));

      // Add summary row
      excelData.push({
        [isArabic ? "رقم" : "#"]: "",
        [isArabic ? "التاريخ" : "Date"]: isArabic ? "الإجمالي" : "Total",
        [isArabic ? "إجمالي الطلب" : "Order Total"]: commissions.reduce((sum, c) => sum + c.order_total, 0).toFixed(2),
        [isArabic ? "عمولة المورد" : "Supplier Commission"]: summary.supplierCommissions.toFixed(2),
        [isArabic ? "عمولة المحمصة" : "Roaster Commission"]: summary.roasterCommissions.toFixed(2),
        [isArabic ? "إجمالي العمولة" : "Total Commission"]: summary.totalCommissions.toFixed(2),
        [isArabic ? "الحالة" : "Status"]: "",
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, isArabic ? "العمولات" : "Commissions");

      // Generate filename with date
      const filename = `${isArabic ? "تقرير_العمولات" : "commission_report"}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تصدير التقرير" : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Create a printable document
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="${isArabic ? 'rtl' : 'ltr'}">
          <head>
            <title>${isArabic ? "تقرير العمولات" : "Commission Report"}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { 
                margin: 0; 
                padding: 20px;
                font-family: 'Segoe UI', Tahoma, sans-serif;
                direction: ${isArabic ? 'rtl' : 'ltr'};
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #8B4513;
              }
              .header h1 { color: #8B4513; margin: 0; }
              .header p { color: #666; margin: 5px 0; }
              .summary {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                padding: 15px;
                background: #f8f4f0;
                border-radius: 8px;
              }
              .summary-item { text-align: center; }
              .summary-item .value { font-size: 24px; font-weight: bold; color: #8B4513; }
              .summary-item .label { font-size: 12px; color: #666; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: ${isArabic ? 'right' : 'left'};
              }
              th { background: #8B4513; color: white; }
              tr:nth-child(even) { background: #f9f9f9; }
              .footer {
                margin-top: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>☕ ${isArabic ? "تقرير العمولات" : "Commission Report"}</h1>
              <p>${getPeriodLabel()} - ${format(new Date(), "dd/MM/yyyy")}</p>
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <div class="value">${summary.totalCommissions.toFixed(2)}</div>
                <div class="label">${isArabic ? "إجمالي العمولات (ر.س)" : "Total Commissions (SAR)"}</div>
              </div>
              <div class="summary-item">
                <div class="value">${summary.supplierCommissions.toFixed(2)}</div>
                <div class="label">${isArabic ? "عمولة الموردين (ر.س)" : "Supplier Commissions (SAR)"}</div>
              </div>
              <div class="summary-item">
                <div class="value">${summary.roasterCommissions.toFixed(2)}</div>
                <div class="label">${isArabic ? "عمولة المحامص (ر.س)" : "Roaster Commissions (SAR)"}</div>
              </div>
              <div class="summary-item">
                <div class="value">${summary.ordersCount}</div>
                <div class="label">${isArabic ? "عدد الطلبات" : "Orders Count"}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isArabic ? "التاريخ" : "Date"}</th>
                  <th>${isArabic ? "إجمالي الطلب" : "Order Total"}</th>
                  <th>${isArabic ? "عمولة المورد" : "Supplier"}</th>
                  <th>${isArabic ? "عمولة المحمصة" : "Roaster"}</th>
                  <th>${isArabic ? "الإجمالي" : "Total"}</th>
                  <th>${isArabic ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                ${commissions.map((c, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${format(new Date(c.created_at), "dd/MM/yyyy")}</td>
                    <td>${c.order_total.toFixed(2)}</td>
                    <td>${c.supplier_commission.toFixed(2)}</td>
                    <td>${c.roaster_commission.toFixed(2)}</td>
                    <td>${c.total_commission.toFixed(2)}</td>
                    <td>${c.status === "paid" ? (isArabic ? "مدفوعة" : "Paid") : (isArabic ? "معلقة" : "Pending")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="footer">
              <p>${isArabic ? "تم إنشاء هذا التقرير تلقائياً من منصة دال للقهوة" : "This report was generated automatically from Dal Coffee Platform"}</p>
              <p>© ${new Date().getFullYear()} ${isArabic ? "دال - جميع الحقوق محفوظة" : "Dal - All Rights Reserved"}</p>
            </div>

            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }

      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم فتح نافذة الطباعة" : "Print window opened",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تصدير التقرير" : "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const pieData = [
    {
      name: isArabic ? "عمولة الموردين" : "Supplier Commission",
      value: summary.supplierCommissions,
    },
    {
      name: isArabic ? "عمولة المحامص" : "Roaster Commission",
      value: summary.roasterCommissions,
    },
  ];

  const statusPieData = [
    {
      name: isArabic ? "معلقة" : "Pending",
      value: summary.pendingCommissions,
    },
    {
      name: isArabic ? "مدفوعة" : "Paid",
      value: summary.paidCommissions,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Period Selector & Export Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-500" />
          {isArabic ? "إحصائيات العمولات" : "Commission Statistics"}
        </h2>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{isArabic ? "هذا الأسبوع" : "This Week"}</SelectItem>
              <SelectItem value="month">{isArabic ? "هذا الشهر" : "This Month"}</SelectItem>
              <SelectItem value="quarter">{isArabic ? "آخر 3 أشهر" : "Last 3 Months"}</SelectItem>
              <SelectItem value="year">{isArabic ? "هذا العام" : "This Year"}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={isExporting || commissions.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={isExporting || commissions.length === 0}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-500" />
              <Badge className="bg-green-500">
                {isArabic ? "إجمالي" : "Total"}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{summary.totalCommissions.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "ر.س" : "SAR"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-amber-600" />
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                {isArabic ? "موردين" : "Suppliers"}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{summary.supplierCommissions.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "ر.س" : "SAR"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-8 h-8 text-orange-500" />
              <Badge variant="outline" className="text-orange-600 border-orange-500">
                {isArabic ? "محامص" : "Roasters"}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{summary.roasterCommissions.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "ر.س" : "SAR"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <Badge variant="outline" className="text-blue-600 border-blue-500">
                {summary.ordersCount}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{summary.avgCommissionPerOrder.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "متوسط/طلب" : "Avg/Order"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Area Chart - Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {isArabic ? "تطور العمولات" : "Commission Trend"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "العمولات حسب الفترة" : "Commissions over time"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="supplier"
                    name={isArabic ? "موردين" : "Suppliers"}
                    stackId="1"
                    stroke="#8B4513"
                    fill="#8B4513"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="roaster"
                    name={isArabic ? "محامص" : "Roasters"}
                    stackId="1"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {isArabic ? "توزيع العمولات" : "Commission Distribution"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "نسبة كل فئة" : "Percentage by category"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.totalCommissions > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} ر.س`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {isArabic ? "حالة العمولات" : "Commission Status"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "المعلقة vs المدفوعة" : "Pending vs Paid"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: isArabic ? "معلقة" : "Pending",
                    value: summary.pendingCommissions,
                    fill: "#f59e0b",
                  },
                  {
                    name: isArabic ? "مدفوعة" : "Paid",
                    value: summary.paidCommissions,
                    fill: "#22c55e",
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} ر.س`} />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                  {[
                    { fill: "#f59e0b" },
                    { fill: "#22c55e" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isArabic ? "آخر العمولات" : "Recent Commissions"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "آخر 5 عمولات مسجلة" : "Last 5 recorded commissions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commissions.slice(-5).reverse().map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {commission.order_total.toFixed(2)} {isArabic ? "ر.س" : "SAR"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(commission.created_at), "dd/MM/yyyy", {
                        locale: isArabic ? ar : undefined,
                      })}
                    </p>
                  </div>
                  <div className="text-left">
                    <Badge className={commission.status === "paid" ? "bg-green-500" : "bg-amber-500"}>
                      {commission.total_commission.toFixed(2)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {commission.status === "paid"
                        ? (isArabic ? "مدفوعة" : "Paid")
                        : (isArabic ? "معلقة" : "Pending")}
                    </p>
                  </div>
                </div>
              ))}
              {commissions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {isArabic ? "لا توجد عمولات" : "No commissions"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionStats;
