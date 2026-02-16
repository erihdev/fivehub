import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const ExportRoastingLogs = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("roasting_logs")
      .select("*")
      .eq("roaster_id", user?.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const logs = await fetchLogs();

      const data = logs.map((log, index) => ({
        [isArabic ? "الرقم" : "#"]: index + 1,
        [isArabic ? "رقم الدفعة" : "Batch #"]: log.batch_number || `#${log.log_number}`,
        [isArabic ? "اسم البن" : "Coffee Name"]: log.green_coffee_name,
        [isArabic ? "درجة التحميص" : "Roast Level"]: log.roast_level || "-",
        [isArabic ? "كمية البن الأخضر (كجم)" : "Green Kg"]: log.total_green_kg,
        [isArabic ? "الكمية المحمصة (كجم)" : "Output Kg"]: log.output_kg || 0,
        [isArabic ? "نسبة الفاقد %" : "Loss %"]: log.loss_percentage?.toFixed(2) || "0",
        [isArabic ? "درجة الحرارة (°م)" : "Temp (°C)"]: log.roast_temperature_celsius || "-",
        [isArabic ? "المدة (دقيقة)" : "Duration (min)"]: log.roast_duration_minutes || "-",
        [isArabic ? "وقت الفرقعة الأولى" : "First Crack"]: log.first_crack_time ? `${log.first_crack_time} min` : "-",
        [isArabic ? "التقييم" : "Rating"]: log.batch_quality_rating ? `${log.batch_quality_rating}/5` : "-",
        [isArabic ? "المحمّص" : "Roaster"]: log.roaster_person_name,
        [isArabic ? "تاريخ التحميص" : "Roast Date"]: log.completed_at 
          ? format(new Date(log.completed_at), "yyyy/MM/dd HH:mm", { locale: dateLocale })
          : "-",
        [isArabic ? "ملاحظات الجودة" : "Quality Notes"]: log.quality_notes || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isArabic ? "سجلات التحميص" : "Roasting Logs");

      const fileName = `roasting-logs-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم تصدير السجلات بنجاح" : "Logs exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ أثناء التصدير" : "Export failed",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logs = await fetchLogs();

      // Create printable HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: isArabic ? "خطأ" : "Error",
          description: isArabic ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow popups",
          variant: "destructive",
        });
        return;
      }

      const tableRows = logs.map((log, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${log.batch_number || `#${log.log_number}`}</td>
          <td>${log.green_coffee_name}</td>
          <td>${log.roast_level || "-"}</td>
          <td>${log.total_green_kg}</td>
          <td>${log.output_kg || 0}</td>
          <td>${log.loss_percentage?.toFixed(1) || 0}%</td>
          <td>${log.batch_quality_rating ? `${log.batch_quality_rating}/5` : "-"}</td>
          <td>${log.completed_at ? format(new Date(log.completed_at), "yyyy/MM/dd") : "-"}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${isArabic ? 'rtl' : 'ltr'}">
        <head>
          <title>${isArabic ? 'سجلات التحميص' : 'Roasting Logs'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 8px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${isArabic ? '📋 سجلات التحميص' : '📋 Roasting Logs'}</h1>
          <p>${isArabic ? 'تاريخ التصدير:' : 'Export Date:'} ${format(new Date(), "yyyy/MM/dd HH:mm")}</p>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isArabic ? 'الدفعة' : 'Batch'}</th>
                <th>${isArabic ? 'البن' : 'Coffee'}</th>
                <th>${isArabic ? 'التحميص' : 'Roast'}</th>
                <th>${isArabic ? 'أخضر' : 'Green'}</th>
                <th>${isArabic ? 'محمص' : 'Output'}</th>
                <th>${isArabic ? 'فاقد' : 'Loss'}</th>
                <th>${isArabic ? 'تقييم' : 'Rating'}</th>
                <th>${isArabic ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary">
            <strong>${isArabic ? 'الملخص:' : 'Summary:'}</strong>
            ${isArabic ? 'إجمالي الدفعات:' : 'Total Batches:'} ${logs.length} | 
            ${isArabic ? 'إجمالي الأخضر:' : 'Total Green:'} ${logs.reduce((sum, l) => sum + (l.total_green_kg || 0), 0).toFixed(1)} kg |
            ${isArabic ? 'إجمالي المحمص:' : 'Total Output:'} ${logs.reduce((sum, l) => sum + (l.output_kg || 0), 0).toFixed(1)} kg
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();

      toast({
        title: isArabic ? "تم" : "Done",
        description: isArabic ? "جاري فتح نافذة الطباعة" : "Print dialog opened",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ أثناء التصدير" : "Export failed",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className="gap-2">
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isArabic ? "تصدير" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          {isArabic ? "تصدير PDF" : "Export PDF"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportRoastingLogs;
