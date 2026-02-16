import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";

export function ExportPerformanceData() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    if (!user) return;

    setExporting(true);
    try {
      // Fetch performance alert logs
      const { data: logs, error } = await supabase
        .from("performance_alert_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد سجلات أداء للتصدير",
          variant: "destructive",
        });
        return;
      }

      // Transform data for Excel
      const excelData = logs.map((log) => ({
        "التاريخ": format(new Date(log.sent_at), "yyyy-MM-dd HH:mm", { locale: ar }),
        "مؤشر الأداء": log.score,
        "الحد الأدنى": log.threshold,
        "البريد المستلم": log.recipient_email,
        "الحالة": log.status === "sent" ? "ناجح" : "فاشل",
        "رسالة الخطأ": log.error_message || "-",
        "عدد الطلبات": (log.alert_data as any)?.ordersCount || 0,
        "عناصر منخفضة": (log.alert_data as any)?.lowStockItems || 0,
        "معدل الدوران": (log.alert_data as any)?.stockTurnover || 0,
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 20 }, // التاريخ
        { wch: 12 }, // مؤشر الأداء
        { wch: 12 }, // الحد الأدنى
        { wch: 30 }, // البريد المستلم
        { wch: 10 }, // الحالة
        { wch: 30 }, // رسالة الخطأ
        { wch: 12 }, // عدد الطلبات
        { wch: 14 }, // عناصر منخفضة
        { wch: 14 }, // معدل الدوران
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "سجل الأداء");

      // Generate filename with date
      const fileName = `تقرير_الأداء_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "تم التصدير",
        description: "تم تصدير بيانات الأداء بنجاح",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "خطأ",
        description: "فشل تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportToExcel} disabled={exporting}>
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin ml-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 ml-2" />
      )}
      تصدير Excel
    </Button>
  );
}
