import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import { Calendar, Plus, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface ScheduleItem {
  id: string;
  green_coffee_id: string | null;
  green_coffee_name: string;
  planned_quantity_kg: number;
  planned_date: string;
  planned_time: string | null;
  roast_level: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface GreenCoffee {
  id: string;
  name: string;
  remaining: number;
}

const RoastingSchedule = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [greenCoffees, setGreenCoffees] = useState<GreenCoffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCoffee, setSelectedCoffee] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState<number>(5);
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");
  const [roastLevel, setRoastLevel] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchGreenCoffees();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("roasting_schedule")
        .select("*")
        .eq("roaster_id", user?.id)
        .in("status", ["scheduled", "in_progress"])
        .order("planned_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGreenCoffees = async () => {
    try {
      const { data, error } = await supabase
        .from("coffee_offerings")
        .select("id, name, total_quantity_kg, sold_quantity_kg")
        .eq("available", true);

      if (error) throw error;
      
      const coffees = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        remaining: (c.total_quantity_kg || 0) - (c.sold_quantity_kg || 0)
      })).filter(c => c.remaining > 0);
      
      setGreenCoffees(coffees);
    } catch (error) {
      console.error("Error fetching green coffees:", error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedCoffee || !plannedDate || !plannedQuantity) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields",
        variant: "destructive",
      });
      return;
    }

    const coffee = greenCoffees.find(c => c.id === selectedCoffee);

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("roasting_schedule").insert({
        roaster_id: user?.id,
        green_coffee_id: selectedCoffee,
        green_coffee_name: coffee?.name || "",
        planned_quantity_kg: plannedQuantity,
        planned_date: plannedDate,
        planned_time: plannedTime || null,
        roast_level: roastLevel || null,
        priority,
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: isArabic ? "تم" : "Success",
        description: isArabic ? "تمت جدولة التحميص" : "Roasting scheduled",
      });

      setShowNewDialog(false);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ" : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("roasting_schedule")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      fetchSchedules();
      
      toast({
        title: isArabic ? "تم التحديث" : "Updated",
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const resetForm = () => {
    setSelectedCoffee("");
    setPlannedQuantity(5);
    setPlannedDate("");
    setPlannedTime("");
    setRoastLevel("");
    setPriority("normal");
    setNotes("");
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "normal": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return isArabic ? "اليوم" : "Today";
    if (isTomorrow(date)) return isArabic ? "غداً" : "Tomorrow";
    if (isPast(date)) return isArabic ? "متأخر!" : "Overdue!";
    return format(date, "EEE, MMM d", { locale: dateLocale });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isArabic ? "جدول التحميص" : "Roasting Schedule"}
        </CardTitle>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {isArabic ? "إضافة" : "Add"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isArabic ? "جدولة تحميص جديد" : "Schedule New Roast"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isArabic ? "البن الأخضر *" : "Green Coffee *"}</Label>
                <Select value={selectedCoffee} onValueChange={setSelectedCoffee}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "اختر البن" : "Select coffee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {greenCoffees.map((coffee) => (
                      <SelectItem key={coffee.id} value={coffee.id}>
                        {coffee.name} ({coffee.remaining.toFixed(1)} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الكمية (كجم) *" : "Quantity (kg) *"}</Label>
                  <Input
                    type="number"
                    value={plannedQuantity}
                    onChange={(e) => setPlannedQuantity(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "درجة التحميص" : "Roast Level"}</Label>
                  <Select value={roastLevel} onValueChange={setRoastLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{isArabic ? "فاتح" : "Light"}</SelectItem>
                      <SelectItem value="medium">{isArabic ? "متوسط" : "Medium"}</SelectItem>
                      <SelectItem value="medium-dark">{isArabic ? "متوسط غامق" : "Medium-Dark"}</SelectItem>
                      <SelectItem value="dark">{isArabic ? "غامق" : "Dark"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "التاريخ *" : "Date *"}</Label>
                  <Input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوقت" : "Time"}</Label>
                  <Input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "الأولوية" : "Priority"}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isArabic ? "منخفضة" : "Low"}</SelectItem>
                    <SelectItem value="normal">{isArabic ? "عادية" : "Normal"}</SelectItem>
                    <SelectItem value="high">{isArabic ? "عالية" : "High"}</SelectItem>
                    <SelectItem value="urgent">{isArabic ? "عاجل" : "Urgent"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                />
              </div>

              <Button 
                onClick={handleCreateSchedule} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  isArabic ? "جدولة" : "Schedule"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد تحميصات مجدولة" : "No scheduled roasts"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{item.green_coffee_name}</span>
                    <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                      {item.priority === "urgent" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {isArabic 
                        ? { low: "منخفض", normal: "عادي", high: "عالي", urgent: "عاجل" }[item.priority]
                        : item.priority
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {getDateLabel(item.planned_date)}
                    </span>
                    {item.planned_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.planned_time}
                      </span>
                    )}
                    <span>{item.planned_quantity_kg} kg</span>
                    {item.roast_level && <Badge variant="outline">{item.roast_level}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(item.id, "completed")}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoastingSchedule;
