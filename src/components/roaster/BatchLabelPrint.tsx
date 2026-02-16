import { useRef } from "react";
import DOMPurify from "dompurify";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface BatchLabelPrintProps {
  log: {
    id: string;
    log_number: number;
    batch_number: string | null;
    green_coffee_name: string;
    roast_level: string | null;
    output_kg: number | null;
    completed_at: string | null;
    roaster_person_name: string;
    loss_percentage: number | null;
  };
}

const BatchLabelPrint = ({ log }: BatchLabelPrintProps) => {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <title>${isArabic ? 'ملصق الدفعة' : 'Batch Label'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            direction: ${isArabic ? 'rtl' : 'ltr'};
          }
          .label {
            border: 2px solid #333;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
            border-radius: 8px;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .batch-number {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .coffee-name {
            font-size: 18px;
            color: #666;
            margin-top: 5px;
          }
          .qr-container {
            text-align: center;
            margin: 15px 0;
          }
          .details {
            font-size: 14px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #eee;
          }
          .label-title {
            color: #666;
          }
          .label-value {
            font-weight: bold;
          }
          @media print {
            body { margin: 0; }
            .label { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const qrData = JSON.stringify({
    id: log.id,
    batch: log.batch_number || `#${log.log_number}`,
    coffee: log.green_coffee_name,
    roastDate: log.completed_at,
    weight: log.output_kg
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          {isArabic ? "طباعة" : "Print"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {isArabic ? "ملصق الدفعة" : "Batch Label"}
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div ref={printRef}>
          <div className="label border-2 border-foreground/20 rounded-lg p-4">
            <div className="header text-center border-b pb-3 mb-3">
              <div className="batch-number text-2xl font-bold">
                {log.batch_number || `#${log.log_number}`}
              </div>
              <div className="coffee-name text-lg text-muted-foreground mt-1">
                {log.green_coffee_name}
              </div>
            </div>

            <div className="qr-container flex justify-center my-4">
              <QRCode value={qrData} size={120} />
            </div>

            <div className="details space-y-2 text-sm">
              <div className="details-row flex justify-between border-b border-dotted pb-1">
                <span className="label-title text-muted-foreground">
                  {isArabic ? "درجة التحميص" : "Roast Level"}
                </span>
                <span className="label-value font-semibold">
                  {log.roast_level || "-"}
                </span>
              </div>
              <div className="details-row flex justify-between border-b border-dotted pb-1">
                <span className="label-title text-muted-foreground">
                  {isArabic ? "الوزن" : "Weight"}
                </span>
                <span className="label-value font-semibold">
                  {log.output_kg} kg
                </span>
              </div>
              <div className="details-row flex justify-between border-b border-dotted pb-1">
                <span className="label-title text-muted-foreground">
                  {isArabic ? "نسبة الفاقد" : "Loss"}
                </span>
                <span className="label-value font-semibold">
                  {log.loss_percentage?.toFixed(1)}%
                </span>
              </div>
              <div className="details-row flex justify-between border-b border-dotted pb-1">
                <span className="label-title text-muted-foreground">
                  {isArabic ? "تاريخ التحميص" : "Roast Date"}
                </span>
                <span className="label-value font-semibold">
                  {log.completed_at 
                    ? format(new Date(log.completed_at), "yyyy/MM/dd", { locale: dateLocale })
                    : "-"
                  }
                </span>
              </div>
              <div className="details-row flex justify-between">
                <span className="label-title text-muted-foreground">
                  {isArabic ? "المحمّص" : "Roaster"}
                </span>
                <span className="label-value font-semibold">
                  {log.roaster_person_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full gap-2">
          <Printer className="h-4 w-4" />
          {isArabic ? "طباعة الملصق" : "Print Label"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BatchLabelPrint;
