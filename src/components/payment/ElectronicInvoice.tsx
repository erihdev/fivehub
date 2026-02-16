import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import QRCode from "react-qr-code";
import { 
  Receipt, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Hash
} from "lucide-react";

interface InvoiceItem {
  name: string;
  nameAr?: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  invoiceId: string;
  orderDate: Date;
  supplierName: string;
  supplierVatNumber: string;
  customerName: string;
  items: InvoiceItem[];
  currency?: string;
}

interface ElectronicInvoiceProps {
  data: InvoiceData;
  onDownload?: () => void;
  onPrint?: () => void;
}

const VAT_RATE = 0.15;

const ElectronicInvoice = ({ data, onDownload, onPrint }: ElectronicInvoiceProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const currency = data.currency || 'SAR';

  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const vatAmount = subtotal * VAT_RATE;
  const total = subtotal + vatAmount;

  // Generate QR Code data (ZATCA format simplified)
  const qrData = JSON.stringify({
    seller: data.supplierName,
    vat: data.supplierVatNumber,
    timestamp: data.orderDate.toISOString(),
    total: total.toFixed(2),
    vat_amount: vatAmount.toFixed(2)
  });

  return (
    <Card className="max-w-2xl mx-auto border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-fivehub-gold/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {isArabic ? 'فاتورة إلكترونية' : 'Electronic Invoice'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}
              </p>
            </div>
          </div>
          <Badge className="bg-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {isArabic ? 'متوافقة مع هيئة الزكاة' : 'ZATCA Compliant'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'رقم الفاتورة' : 'Invoice Number'}
                </p>
                <p className="font-mono font-bold">{data.invoiceId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'التاريخ' : 'Date'}
                </p>
                <p className="font-medium">
                  {format(data.orderDate, 'dd/MM/yyyy HH:mm', { 
                    locale: isArabic ? ar : undefined 
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'المورد' : 'Supplier'}
                </p>
                <p className="font-medium">{data.supplierName}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'الرقم الضريبي: ' : 'VAT #: '}
                  {data.supplierVatNumber}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'العميل' : 'Customer'}
                </p>
                <p className="font-medium">{data.customerName}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Items Table */}
        <div className="space-y-4">
          <h4 className="font-semibold">
            {isArabic ? 'تفاصيل الطلب' : 'Order Details'}
          </h4>
          
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {isArabic ? 'الصنف' : 'Item'}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium">
                    {isArabic ? 'الكمية' : 'Qty'}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium">
                    {isArabic ? 'السعر' : 'Price'}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium">
                    {isArabic ? 'الإجمالي' : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 text-sm">
                      {isArabic && item.nameAr ? item.nameAr : item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-end">
                      {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-end font-medium">
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? 'المجموع الفرعي' : 'Subtotal'}
            </span>
            <span>{subtotal.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}
            </span>
            <span>{vatAmount.toFixed(2)} {currency}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>{isArabic ? 'الإجمالي' : 'Total'}</span>
            <span className="text-primary">{total.toFixed(2)} {currency}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="p-4 bg-white rounded-lg">
            <QRCode value={qrData} size={120} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {isArabic 
              ? 'امسح رمز QR للتحقق من صحة الفاتورة' 
              : 'Scan QR code to verify invoice authenticity'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            {isArabic ? 'تحميل PDF' : 'Download PDF'}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onPrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            {isArabic ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>
            {isArabic 
              ? 'هذه فاتورة إلكترونية صادرة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك' 
              : 'This is an electronic invoice issued according to ZATCA requirements'}
          </p>
          <p className="mt-1 font-medium text-primary">
            FIVE HUB - {isArabic ? 'منصة سلسلة توريد القهوة' : 'Coffee Supply Chain Platform'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ElectronicInvoice;
