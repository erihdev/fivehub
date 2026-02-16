import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Flame, Plus, Loader2, CheckCircle, Clock, Package, 
  FileText, User, Calendar, Scale, Coffee, Share2, Hash,
  Thermometer, Timer, Percent, FileCheck, History, Printer
} from "lucide-react";
import html2canvas from "html2canvas";
import SignaturePad from "@/components/SignaturePad";
import BatchLabelPrint from "@/components/roaster/BatchLabelPrint";

interface RoastingLogEntry {
  id: string;
  log_number: number;
  green_coffee_id: string | null;
  green_coffee_name: string;
  bags_count: number;
  kg_per_bag: number;
  total_green_kg: number;
  roast_level: string | null;
  roaster_person_name: string;
  roaster_signature: string | null;
  started_at: string;
  completed_at: string | null;
  output_kg: number | null;
  roasted_product_id: string | null;
  notes: string | null;
  status: string;
  roast_temperature_celsius: number | null;
  roast_duration_minutes: number | null;
  loss_percentage: number | null;
  batch_number: string | null;
  quality_notes: string | null;
  review_status: string | null;
  first_crack_time: number | null;
  machine_number: string | null;
}

interface GreenCoffee {
  id: string;
  name: string;
  origin: string | null;
  remaining: number;
}

interface RoastedProduct {
  id: string;
  name: string;
}

const RoastingLog = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [logs, setLogs] = useState<RoastingLogEntry[]>([]);
  const [greenCoffees, setGreenCoffees] = useState<GreenCoffee[]>([]);
  const [roastedProducts, setRoastedProducts] = useState<RoastedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RoastingLogEntry | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  
  // New log form state
  const [selectedGreenCoffee, setSelectedGreenCoffee] = useState<string>("");
  const [bagsCount, setBagsCount] = useState<number>(1);
  const [kgPerBag, setKgPerBag] = useState<number>(60);
  const [roastLevel, setRoastLevel] = useState<string>("");
  const [roasterPersonName, setRoasterPersonName] = useState<string>("");
  const [roasterSignature, setRoasterSignature] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [roastTemperature, setRoastTemperature] = useState<number | "">("");
  const [roastDuration, setRoastDuration] = useState<number | "">("");
  
  // Complete log form state
  const [outputKg, setOutputKg] = useState<number>(0);
  const [selectedRoastedProduct, setSelectedRoastedProduct] = useState<string>("");
  const [newProductName, setNewProductName] = useState<string>("");
  const [qualityNotes, setQualityNotes] = useState<string>("");
  const [firstCrackTime, setFirstCrackTime] = useState<number | "">("");

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchLogs();
      fetchGreenCoffees();
      fetchRoastedProducts();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("roasting_logs")
        .select("*")
        .eq("roaster_id", user?.id)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching roasting logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGreenCoffees = async () => {
    try {
      // Get all green coffees with available stock
      const { data, error } = await supabase
        .from("coffee_offerings")
        .select("id, name, origin, total_quantity_kg, sold_quantity_kg")
        .eq("available", true);

      if (error) throw error;
      
      const coffees = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        origin: c.origin,
        remaining: (c.total_quantity_kg || 0) - (c.sold_quantity_kg || 0)
      })).filter(c => c.remaining > 0);
      
      setGreenCoffees(coffees);
    } catch (error) {
      console.error("Error fetching green coffees:", error);
    }
  };

  const fetchRoastedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("roasted_coffee_products")
        .select("id, name")
        .eq("roaster_id", user?.id);

      if (error) throw error;
      setRoastedProducts(data || []);
    } catch (error) {
      console.error("Error fetching roasted products:", error);
    }
  };

  // Generate auto batch number (date + sequence)
  const generateBatchNumber = async (): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Count today's logs to get next sequence
    const { count } = await supabase
      .from("roasting_logs")
      .select("*", { count: 'exact', head: true })
      .eq("roaster_id", user?.id)
      .gte("started_at", `${dateStr}T00:00:00`)
      .lt("started_at", `${dateStr}T23:59:59`);
    
    const sequence = (count || 0) + 1;
    return `${dateStr}-${String(sequence).padStart(2, '0')}`;
  };

  const handleCreateLog = async () => {
    if (!selectedGreenCoffee || !roasterPersonName || !roasterSignature) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى ملء جميع الحقول المطلوبة والتوقيع" : "Please fill all required fields and sign",
        variant: "destructive",
      });
      return;
    }

    const selectedCoffee = greenCoffees.find(c => c.id === selectedGreenCoffee);
    if (!selectedCoffee) return;

    const totalGreenKg = bagsCount * kgPerBag;

    if (totalGreenKg > selectedCoffee.remaining) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الكمية المطلوبة أكبر من المتوفر" : "Requested quantity exceeds available stock",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate batch number automatically
      const autoBatchNumber = await generateBatchNumber();
      
      const { error } = await supabase.from("roasting_logs").insert({
        roaster_id: user?.id,
        green_coffee_id: selectedGreenCoffee,
        green_coffee_name: selectedCoffee.name,
        bags_count: bagsCount,
        kg_per_bag: kgPerBag,
        total_green_kg: totalGreenKg,
        roast_level: roastLevel || null,
        roaster_person_name: roasterPersonName,
        roaster_signature: roasterSignature,
        notes: notes || null,
        status: "in_progress",
        roast_temperature_celsius: roastTemperature || null,
        roast_duration_minutes: roastDuration || null,
        batch_number: autoBatchNumber,
      });

      if (error) throw error;

      toast({
        title: isArabic ? "تم بنجاح" : "Success",
        description: isArabic ? "تم إنشاء سجل التحميص" : "Roasting log created",
      });

      setShowNewDialog(false);
      resetForm();
      fetchLogs();
    } catch (error) {
      console.error("Error creating roasting log:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ أثناء إنشاء السجل" : "Error creating log",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteLog = async () => {
    if (!selectedLog || !outputKg) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى إدخال الكمية الناتجة" : "Please enter output quantity",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // The trigger will auto-create roasted product if none selected
      const { error } = await supabase
        .from("roasting_logs")
        .update({
          status: "completed",
          output_kg: outputKg,
          roasted_product_id: selectedRoastedProduct || null,
          quality_notes: qualityNotes || null,
          first_crack_time: firstCrackTime || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedLog.id);

      if (error) throw error;

      toast({
        title: isArabic ? "تم بنجاح" : "Success",
        description: isArabic 
          ? `تم إكمال التحميص وإضافة ${outputKg} كجم للمخزون المحمص` 
          : `Roasting completed and ${outputKg}kg added to roasted inventory`,
      });

      setShowCompleteDialog(false);
      setSelectedLog(null);
      setOutputKg(0);
      setSelectedRoastedProduct("");
      setQualityNotes("");
      setFirstCrackTime("");
      fetchLogs();
      fetchGreenCoffees();
      fetchRoastedProducts();
    } catch (error) {
      console.error("Error completing roasting log:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ أثناء إكمال السجل" : "Error completing log",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedGreenCoffee("");
    setBagsCount(1);
    setKgPerBag(60);
    setRoastLevel("");
    setRoasterPersonName("");
    setRoasterSignature("");
    setNotes("");
    setShowSignaturePad(false);
    setRoastTemperature("");
    setRoastDuration("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generatePDF = async (log: RoastingLogEntry) => {
    const pdfContent = document.createElement("div");
    pdfContent.style.cssText = "padding: 40px; background: white; width: 800px; font-family: Arial, sans-serif;";
    
    // Sanitize all user-controlled inputs to prevent XSS
    const safeCoffeeName = DOMPurify.sanitize(log.green_coffee_name || '');
    const safeRoasterName = DOMPurify.sanitize(log.roaster_person_name || '');
    const safeNotes = DOMPurify.sanitize(log.notes || '');
    const safeRoastLevel = DOMPurify.sanitize(log.roast_level || '-');
    // Validate signature is a proper data URL before using
    const safeSignature = log.roaster_signature && log.roaster_signature.startsWith('data:image/') 
      ? log.roaster_signature 
      : '';
    
    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #D97706; margin: 0;">${isArabic ? "سجل التحميص" : "Roasting Log"}</h1>
        <p style="color: #666; font-size: 14px;">${isArabic ? "رقم التعميد" : "Log #"}: ${log.log_number}</p>
      </div>
      
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">${isArabic ? "التاريخ" : "Date"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatDate(log.started_at)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "نوع البن" : "Coffee Type"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeCoffeeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "عدد الخيش" : "Bags Count"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.bags_count}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "الكمية الإجمالية" : "Total Quantity"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.total_green_kg} ${isArabic ? "كجم" : "kg"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "درجة التحميص" : "Roast Level"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeRoastLevel}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "اسم الحمّاص" : "Roaster Name"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeRoasterName}</td>
          </tr>
          ${log.output_kg ? `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "الكمية الناتجة" : "Output Quantity"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: green; font-weight: bold;">${log.output_kg} ${isArabic ? "كجم" : "kg"}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${isArabic ? "الحالة" : "Status"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <span style="background: ${log.status === 'completed' ? '#22c55e' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                ${log.status === 'completed' ? (isArabic ? 'مكتمل' : 'Completed') : (isArabic ? 'قيد التحميص' : 'In Progress')}
              </span>
            </td>
          </tr>
          ${safeNotes ? `
          <tr>
            <td style="padding: 10px; font-weight: bold;">${isArabic ? "ملاحظات" : "Notes"}</td>
            <td style="padding: 10px;">${safeNotes}</td>
          </tr>
          ` : ""}
        </table>
      </div>
      
      ${safeSignature ? `
      <div style="margin-top: 30px; text-align: center;">
        <p style="color: #666; margin-bottom: 10px;">${isArabic ? "توقيع الحمّاص" : "Roaster Signature"}</p>
        <img src="${safeSignature}" style="max-height: 80px;" />
      </div>
      ` : ""}
    `;

    document.body.appendChild(pdfContent);

    try {
      const canvas = await html2canvas(pdfContent, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      // Create download link
      const link = document.createElement("a");
      link.download = `roasting-log-${log.log_number}.png`;
      link.href = imgData;
      link.click();

      toast({
        title: isArabic ? "تم التصدير" : "Exported",
        description: isArabic ? "تم تصدير سجل التحميص بنجاح" : "Roasting log exported successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تصدير السجل" : "Failed to export log",
        variant: "destructive",
      });
    } finally {
      document.body.removeChild(pdfContent);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="w-3 h-3 ml-1" />
          {isArabic ? "مكتمل" : "Completed"}
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500">
        <Clock className="w-3 h-3 ml-1" />
        {isArabic ? "قيد التحميص" : "In Progress"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              {isArabic ? "سجل التحميص" : "Roasting Log"}
            </CardTitle>
            <CardDescription>
              {isArabic 
                ? "تتبع عمليات التحميص وتحديث المخزون تلقائياً" 
                : "Track roasting operations and auto-update inventory"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowHistoryDialog(true)}>
              <History className="w-4 h-4 ml-2" />
              {isArabic ? "سجلات سابقة" : "History"}
            </Button>
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  {isArabic ? "تعميد جديد" : "New Roast"}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isArabic ? "تعميد تحميص جديد" : "New Roasting Order"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Green Coffee Selection */}
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع البن الأخضر *" : "Green Coffee Type *"}</Label>
                  <Select value={selectedGreenCoffee} onValueChange={setSelectedGreenCoffee}>
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر البن" : "Select coffee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {greenCoffees.map((coffee) => (
                        <SelectItem key={coffee.id} value={coffee.id}>
                          {coffee.name} - {coffee.origin} ({coffee.remaining} {isArabic ? "كجم متاح" : "kg available"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bags Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "عدد الخيش *" : "Bags Count *"}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={bagsCount}
                      onChange={(e) => setBagsCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "كجم/خيشة" : "Kg/Bag"}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={kgPerBag}
                      onChange={(e) => setKgPerBag(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isArabic ? "إجمالي الكمية" : "Total Quantity"}
                    </span>
                    <span className="font-bold text-lg">
                      {bagsCount * kgPerBag} {isArabic ? "كجم" : "kg"}
                    </span>
                  </div>
                </div>

                {/* Roast Level */}
                <div className="space-y-2">
                  <Label>{isArabic ? "درجة التحميص" : "Roast Level"}</Label>
                  <Select value={roastLevel} onValueChange={setRoastLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر الدرجة" : "Select level"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{isArabic ? "فاتح" : "Light"}</SelectItem>
                      <SelectItem value="medium-light">{isArabic ? "فاتح متوسط" : "Medium Light"}</SelectItem>
                      <SelectItem value="medium">{isArabic ? "متوسط" : "Medium"}</SelectItem>
                      <SelectItem value="medium-dark">{isArabic ? "متوسط غامق" : "Medium Dark"}</SelectItem>
                      <SelectItem value="dark">{isArabic ? "غامق" : "Dark"}</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                {/* Temperature and Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {isArabic ? "درجة الحرارة (°C)" : "Temperature (°C)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={300}
                      value={roastTemperature}
                      onChange={(e) => setRoastTemperature(e.target.value ? parseInt(e.target.value) : "")}
                      placeholder="200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {isArabic ? "مدة التحميص (دقيقة)" : "Duration (min)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={roastDuration}
                      onChange={(e) => setRoastDuration(e.target.value ? parseInt(e.target.value) : "")}
                      placeholder="12"
                    />
                  </div>
                </div>

                {/* Roaster Person Name */}
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم الحمّاص المسؤول *" : "Roaster Name *"}</Label>
                  <Input
                    value={roasterPersonName}
                    onChange={(e) => setRoasterPersonName(e.target.value)}
                    placeholder={isArabic ? "اسم الشخص المسؤول" : "Responsible person name"}
                  />
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <Label>{isArabic ? "التوقيع الإلكتروني *" : "Electronic Signature *"}</Label>
                  {roasterSignature ? (
                    <div className="border rounded-lg p-2 bg-white">
                      <img src={roasterSignature} alt="Signature" className="h-20 mx-auto" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowSignaturePad(true)}
                      >
                        {isArabic ? "تغيير التوقيع" : "Change Signature"}
                      </Button>
                    </div>
                  ) : showSignaturePad ? (
                    <SignaturePad
                      onSave={(sig) => {
                        setRoasterSignature(sig);
                        setShowSignaturePad(false);
                      }}
                      onCancel={() => setShowSignaturePad(false)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <User className="w-4 h-4 ml-2" />
                      {isArabic ? "إضافة التوقيع" : "Add Signature"}
                    </Button>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                    rows={2}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  onClick={handleCreateLog}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Flame className="w-4 h-4 ml-2" />
                  )}
                  {isArabic ? "بدء التحميص" : "Start Roasting"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? "لا توجد سجلات تحميص" : "No roasting logs yet"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "رقم التعميد" : "Log #"}</TableHead>
                  <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isArabic ? "البن" : "Coffee"}</TableHead>
                  <TableHead>{isArabic ? "الكمية" : "Quantity"}</TableHead>
                  <TableHead>{isArabic ? "الحمّاص" : "Roaster"}</TableHead>
                  <TableHead>{isArabic ? "الناتج" : "Output"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "إجراء" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono font-bold text-primary">
                        <Hash className="w-3 h-3" />
                        {log.log_number}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(log.started_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-amber-600" />
                        {log.green_coffee_name}
                      </div>
                      {log.roast_level && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {log.roast_level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{log.bags_count}</span> {isArabic ? "خيشة" : "bags"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.total_green_kg} {isArabic ? "كجم" : "kg"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {log.roaster_person_name}
                      </div>
                      {log.roaster_signature && (
                        <img src={log.roaster_signature} alt="sig" className="h-6 mt-1" />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.output_kg ? (
                        <div className="flex items-center gap-1">
                          <Scale className="w-3 h-3 text-green-600" />
                          <span className="font-medium text-green-600">{log.output_kg} {isArabic ? "كجم" : "kg"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowCompleteDialog(true);
                            }}
                          >
                            <CheckCircle className="w-3 h-3 ml-1" />
                            {isArabic ? "إكمال" : "Complete"}
                          </Button>
                        )}
                        {log.status === "completed" && (
                          <BatchLabelPrint log={log} />
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generatePDF(log)}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Complete Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isArabic ? "إكمال عملية التحميص" : "Complete Roasting"}
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    {isArabic ? "البن الأخضر المستخدم" : "Green Coffee Used"}
                  </div>
                  <div className="font-medium">{selectedLog.green_coffee_name}</div>
                  <div className="text-sm">{selectedLog.total_green_kg} {isArabic ? "كجم" : "kg"}</div>
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "الكمية الناتجة (كجم) *" : "Output Quantity (kg) *"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={outputKg}
                    onChange={(e) => setOutputKg(parseFloat(e.target.value) || 0)}
                    placeholder={isArabic ? "أدخل الكمية" : "Enter quantity"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isArabic 
                      ? "سيتم إنشاء منتج محمص تلقائياً وإضافة الكمية الناتجة له"
                      : "A roasted product will be created automatically with the output quantity"}
                  </p>
                </div>

                {/* First Crack Time */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {isArabic ? "وقت الطقطقة الأولى (ثانية)" : "First Crack Time (sec)"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={firstCrackTime}
                    onChange={(e) => setFirstCrackTime(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder={isArabic ? "مثال: 480" : "e.g., 480"}
                  />
                </div>

                {roastedProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label>{isArabic ? "أو أضف لمنتج موجود (اختياري)" : "Or Add to Existing Product (optional)"}</Label>
                    <Select value={selectedRoastedProduct} onValueChange={setSelectedRoastedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? "اتركه فارغاً لإنشاء منتج جديد" : "Leave empty to create new"} />
                      </SelectTrigger>
                      <SelectContent>
                        {roastedProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                  </div>
                )}

                {/* Quality Notes */}
                <div className="space-y-2">
                  <Label>{isArabic ? "ملاحظات الجودة" : "Quality Notes"}</Label>
                  <Textarea
                    value={qualityNotes}
                    onChange={(e) => setQualityNotes(e.target.value)}
                    placeholder={isArabic ? "تقييم النكهة، الرائحة، اللون..." : "Flavor, aroma, color evaluation..."}
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCompleteLog}
                  disabled={isSubmitting || !outputKg}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 ml-2" />
                  )}
                  {isArabic ? "إكمال وتحديث المخزون" : "Complete & Update Inventory"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                {isArabic ? "سجلات التعميد السابقة" : "Previous Roasting Logs"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {logs.filter(l => l.status === 'completed').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isArabic ? "لا توجد سجلات مكتملة" : "No completed logs yet"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.filter(l => l.status === 'completed').map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">#{log.log_number}</Badge>
                          {log.batch_number && (
                            <Badge variant="secondary">{log.batch_number}</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{formatDate(log.started_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BatchLabelPrint log={log} />
                          <Button size="sm" variant="outline" onClick={() => generatePDF(log)}>
                            <Share2 className="w-3 h-3 ml-1" />
                            {isArabic ? "تصدير" : "Export"}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{isArabic ? "البن:" : "Coffee:"}</span>
                          <p className="font-medium">{log.green_coffee_name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isArabic ? "الكمية الخام:" : "Green:"}</span>
                          <p className="font-medium">{log.total_green_kg} {isArabic ? "كجم" : "kg"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isArabic ? "الناتج:" : "Output:"}</span>
                          <p className="font-medium text-green-600">{log.output_kg} {isArabic ? "كجم" : "kg"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isArabic ? "نسبة الفاقد:" : "Loss:"}</span>
                          <p className="font-medium text-amber-600">{log.loss_percentage || ((log.total_green_kg - (log.output_kg || 0)) / log.total_green_kg * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {log.roast_temperature_celsius && (
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-red-500" />
                            <span>{log.roast_temperature_celsius}°C</span>
                          </div>
                        )}
                        {log.roast_duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-blue-500" />
                            <span>{log.roast_duration_minutes} {isArabic ? "دقيقة" : "min"}</span>
                          </div>
                        )}
                        {log.roast_level && (
                          <Badge variant="outline">{log.roast_level}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{log.roaster_person_name}</span>
                        {log.roaster_signature && (
                          <img src={log.roaster_signature} alt="sig" className="h-6 ml-auto" />
                        )}
                      </div>
                      
                      {log.quality_notes && (
                        <div className="text-sm p-2 bg-muted rounded">
                          <span className="text-muted-foreground">{isArabic ? "ملاحظات الجودة:" : "Quality:"}</span> {log.quality_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RoastingLog;
