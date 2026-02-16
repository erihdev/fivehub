import { useRef } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';

interface PredictionData {
  coffee_name: string;
  predicted_days_until_empty: number;
  predicted_daily_consumption: number;
  actual_stock_at_prediction: number;
  prediction_accuracy: number | null;
  was_accurate: boolean | null;
  created_at: string;
}

interface ExportPredictionsPDFProps {
  predictions: PredictionData[];
  overallAccuracy: number;
  totalPredictions: number;
  accuratePredictions: number;
}

const ExportPredictionsPDF = ({ 
  predictions, 
  overallAccuracy, 
  totalPredictions, 
  accuratePredictions 
}: ExportPredictionsPDFProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const printRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${isArabic ? 'تقرير التنبؤات والدقة' : 'Predictions & Accuracy Report'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            padding: 40px; 
            background: white;
            color: #333;
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
          .summary { 
            display: flex; 
            justify-content: center; 
            gap: 30px; 
            margin-bottom: 40px;
            flex-wrap: wrap;
          }
          .stat { 
            background: #f8f9fa; 
            padding: 20px 30px; 
            border-radius: 12px; 
            text-align: center;
            min-width: 150px;
          }
          .stat-value { 
            font-size: 32px; 
            font-weight: bold; 
            color: #8B4513;
          }
          .stat-value.green { color: #22c55e; }
          .stat-value.amber { color: #f59e0b; }
          .stat-label { 
            font-size: 12px; 
            color: #666; 
            margin-top: 5px;
          }
          .section { margin-bottom: 30px; }
          .section h2 { 
            color: #333; 
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
          }
          th { 
            background: #8B4513; 
            color: white; 
            padding: 12px 10px;
            text-align: ${isArabic ? 'right' : 'left'};
            font-weight: 600;
          }
          td { 
            padding: 12px 10px; 
            border-bottom: 1px solid #eee;
          }
          tr:hover { background: #f8f9fa; }
          .accuracy-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .accuracy-high { background: #dcfce7; color: #166534; }
          .accuracy-medium { background: #fef3c7; color: #92400e; }
          .accuracy-low { background: #fee2e2; color: #991b1b; }
          .status-icon { font-size: 16px; }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          @media print {
            body { padding: 20px; }
            .summary { gap: 15px; }
            .stat { padding: 15px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>☕ ${isArabic ? 'تقرير التنبؤات ودقة المخزون' : 'Inventory Predictions & Accuracy Report'}</h1>
          <p>${isArabic ? 'تاريخ التقرير:' : 'Report Date:'} ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</p>
        </div>

        <div class="summary">
          <div class="stat">
            <div class="stat-value">${overallAccuracy.toFixed(0)}%</div>
            <div class="stat-label">${isArabic ? 'الدقة الإجمالية' : 'Overall Accuracy'}</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalPredictions}</div>
            <div class="stat-label">${isArabic ? 'إجمالي التنبؤات' : 'Total Predictions'}</div>
          </div>
          <div class="stat">
            <div class="stat-value green">${accuratePredictions}</div>
            <div class="stat-label">${isArabic ? 'تنبؤات صحيحة' : 'Accurate'}</div>
          </div>
          <div class="stat">
            <div class="stat-value amber">${totalPredictions - accuratePredictions}</div>
            <div class="stat-label">${isArabic ? 'تنبؤات خاطئة' : 'Inaccurate'}</div>
          </div>
        </div>

        <div class="section">
          <h2>${isArabic ? 'تفاصيل التنبؤات' : 'Prediction Details'}</h2>
          <table>
            <thead>
              <tr>
                <th>${isArabic ? 'القهوة' : 'Coffee'}</th>
                <th>${isArabic ? 'التاريخ' : 'Date'}</th>
                <th>${isArabic ? 'المخزون' : 'Stock (kg)'}</th>
                <th>${isArabic ? 'الاستهلاك/يوم' : 'Daily Use'}</th>
                <th>${isArabic ? 'أيام للنفاد' : 'Days Left'}</th>
                <th>${isArabic ? 'الدقة' : 'Accuracy'}</th>
                <th>${isArabic ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${predictions.map(pred => {
                const accuracy = pred.prediction_accuracy;
                const accuracyClass = accuracy === null ? '' : 
                  accuracy >= 70 ? 'accuracy-high' : 
                  accuracy >= 50 ? 'accuracy-medium' : 'accuracy-low';
                const statusIcon = pred.was_accurate === true ? '✓' : 
                  pred.was_accurate === false ? '✗' : '○';
                return `
                  <tr>
                    <td><strong>${pred.coffee_name}</strong></td>
                    <td>${new Date(pred.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</td>
                    <td>${pred.actual_stock_at_prediction}</td>
                    <td>${pred.predicted_daily_consumption}</td>
                    <td>${pred.predicted_days_until_empty}</td>
                    <td>
                      ${accuracy !== null 
                        ? `<span class="accuracy-badge ${accuracyClass}">${accuracy.toFixed(0)}%</span>`
                        : `<span style="color: #666;">${isArabic ? 'قيد التحقق' : 'Pending'}</span>`
                      }
                    </td>
                    <td class="status-icon">${statusIcon}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>${isArabic ? 'تم إنشاء هذا التقرير بواسطة منصة دال للقهوة' : 'Generated by Dal Coffee Platform'}</p>
          <p>© ${new Date().getFullYear()} ${isArabic ? 'دال - جميع الحقوق محفوظة' : 'Dal - All rights reserved'}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast({
        title: isArabic ? 'جاري التصدير' : 'Exporting',
        description: isArabic ? 'استخدم "حفظ كـ PDF" في نافذة الطباعة' : 'Use "Save as PDF" in the print dialog',
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <FileText className="h-4 w-4" />
      {isArabic ? 'تصدير PDF' : 'Export PDF'}
    </Button>
  );
};

export default ExportPredictionsPDF;
