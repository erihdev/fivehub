import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";

interface MonthlyMetrics {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  alertsCount: number;
  successfulAlerts: number;
  failedAlerts: number;
  dailyScores: { date: string; score: number }[];
}

export function MonthlyPerformanceReport() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch performance logs for the month
      const { data: logs, error } = await supabase
        .from("performance_alert_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("sent_at", monthStart.toISOString())
        .lte("sent_at", monthEnd.toISOString())
        .order("sent_at", { ascending: true });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد سجلات أداء لهذا الشهر",
          variant: "destructive",
        });
        return;
      }

      // Calculate metrics
      const scores = logs.map(l => l.score);
      const metrics: MonthlyMetrics = {
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        alertsCount: logs.length,
        successfulAlerts: logs.filter(l => l.status === "sent").length,
        failedAlerts: logs.filter(l => l.status === "failed").length,
        dailyScores: logs.map(l => ({
          date: format(new Date(l.sent_at), "dd/MM", { locale: ar }),
          score: l.score,
        })),
      };

      // Generate HTML content for PDF
      const monthName = format(now, "MMMM yyyy", { locale: ar });
      const scoreColor = (score: number) => 
        score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير الأداء الشهري - ${monthName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, sans-serif; 
              padding: 40px; 
              direction: rtl; 
              background: #fff;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              padding-bottom: 20px;
              border-bottom: 3px solid #6366f1;
            }
            .header h1 { 
              font-size: 28px; 
              color: #6366f1; 
              margin-bottom: 10px;
            }
            .header p { 
              color: #666; 
              font-size: 16px;
            }
            .score-highlight {
              text-align: center;
              margin: 30px 0;
              padding: 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 16px;
            }
            .score-highlight .score {
              font-size: 72px;
              font-weight: bold;
              color: ${scoreColor(metrics.averageScore)};
            }
            .score-highlight .label {
              font-size: 18px;
              color: #666;
              margin-top: 10px;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin: 30px 0;
            }
            .metric-card {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
            }
            .metric-card .value {
              font-size: 32px;
              font-weight: bold;
              color: #333;
            }
            .metric-card .label {
              font-size: 14px;
              color: #666;
              margin-top: 8px;
            }
            .metric-card.success .value { color: #22c55e; }
            .metric-card.danger .value { color: #ef4444; }
            .metric-card.warning .value { color: #eab308; }
            .section {
              margin: 40px 0;
            }
            .section h2 {
              font-size: 20px;
              color: #333;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e9ecef;
            }
            .chart-container {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 12px;
            }
            .bar-chart {
              display: flex;
              align-items: flex-end;
              justify-content: space-around;
              height: 200px;
              gap: 8px;
            }
            .bar-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              flex: 1;
              max-width: 40px;
            }
            .bar {
              width: 100%;
              background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
              border-radius: 4px 4px 0 0;
              min-height: 4px;
            }
            .bar-label {
              font-size: 10px;
              color: #666;
              margin-top: 8px;
              text-align: center;
            }
            .summary {
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              padding: 30px;
              border-radius: 16px;
              margin-top: 40px;
            }
            .summary h3 {
              font-size: 18px;
              margin-bottom: 15px;
            }
            .summary ul {
              list-style: none;
              padding: 0;
            }
            .summary li {
              padding: 8px 0;
              border-bottom: 1px solid rgba(255,255,255,0.2);
            }
            .summary li:last-child { border: none; }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 تقرير الأداء الشهري</h1>
            <p>${monthName}</p>
          </div>

          <div class="score-highlight">
            <div class="score">${metrics.averageScore}</div>
            <div class="label">متوسط مؤشر الأداء</div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card success">
              <div class="value">${metrics.highestScore}</div>
              <div class="label">أعلى مؤشر</div>
            </div>
            <div class="metric-card danger">
              <div class="value">${metrics.lowestScore}</div>
              <div class="label">أدنى مؤشر</div>
            </div>
            <div class="metric-card">
              <div class="value">${metrics.alertsCount}</div>
              <div class="label">إجمالي التنبيهات</div>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card success">
              <div class="value">${metrics.successfulAlerts}</div>
              <div class="label">تنبيهات ناجحة</div>
            </div>
            <div class="metric-card danger">
              <div class="value">${metrics.failedAlerts}</div>
              <div class="label">تنبيهات فاشلة</div>
            </div>
            <div class="metric-card">
              <div class="value">${metrics.alertsCount > 0 ? Math.round((metrics.successfulAlerts / metrics.alertsCount) * 100) : 0}%</div>
              <div class="label">نسبة النجاح</div>
            </div>
          </div>

          <div class="section">
            <h2>📈 تطور الأداء خلال الشهر</h2>
            <div class="chart-container">
              <div class="bar-chart">
                ${metrics.dailyScores.slice(-15).map(item => `
                  <div class="bar-item">
                    <div class="bar" style="height: ${item.score * 1.8}px"></div>
                    <div class="bar-label">${item.date}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="summary">
            <h3>📋 ملخص الشهر</h3>
            <ul>
              <li>متوسط الأداء: ${metrics.averageScore} من 100</li>
              <li>أفضل أداء: ${metrics.highestScore} - أضعف أداء: ${metrics.lowestScore}</li>
              <li>عدد التنبيهات المرسلة: ${metrics.alertsCount}</li>
              <li>نسبة نجاح الإرسال: ${metrics.alertsCount > 0 ? Math.round((metrics.successfulAlerts / metrics.alertsCount) * 100) : 0}%</li>
            </ul>
          </div>

          <div class="footer">
            <p>تم إنشاء هذا التقرير بتاريخ ${format(now, "dd MMMM yyyy - HH:mm", { locale: ar })}</p>
            <p>Dal Coffee Platform</p>
          </div>
        </body>
        </html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast({
        title: "تم إنشاء التقرير",
        description: "يمكنك طباعة أو حفظ التقرير كملف PDF",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "خطأ",
        description: "فشل إنشاء التقرير",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" onClick={generatePDF} disabled={generating}>
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin ml-2" />
      ) : (
        <FileText className="h-4 w-4 ml-2" />
      )}
      تقرير PDF شهري
    </Button>
  );
}
