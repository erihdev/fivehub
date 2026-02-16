import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flame, Package, Clock, CheckCircle, Truck, Plus } from "lucide-react";
import { toast } from "sonner";

interface RoastRequest {
  id: string;
  roaster_id: string;
  green_coffee_id: string;
  roast_level: string;
  quantity_kg: number;
  special_instructions: string;
  status: string;
  price_per_kg: number;
  total_price: number;
  expected_delivery: string;
  created_at: string;
}

interface Roaster {
  id: string;
  name: string;
}

interface GreenCoffee {
  id: string;
  name: string;
  origin: string;
  price: number;
}

const CustomRoastRequest = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoastRequest[]>([]);
  const [roasters, setRoasters] = useState<Roaster[]>([]);
  const [greenCoffees, setGreenCoffees] = useState<GreenCoffee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newRequest, setNewRequest] = useState({
    roaster_id: "",
    green_coffee_id: "",
    roast_level: "medium",
    quantity_kg: 10,
    special_instructions: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch requests
    const { data: requestsData } = await supabase
      .from("custom_roast_requests")
      .select("*")
      .eq("cafe_id", user?.id)
      .order("created_at", { ascending: false });

    if (requestsData) setRequests(requestsData);

    // Fetch roasters (users with roaster role)
    const { data: roasterRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "roaster")
      .eq("status", "approved");

    if (roasterRoles) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", roasterRoles.map(r => r.user_id));

      if (profiles) {
        setRoasters(profiles.map(p => ({ id: p.user_id, name: p.full_name || "Roaster" })));
      }
    }

    // Fetch available green coffees
    const { data: coffees } = await supabase
      .from("coffee_offerings")
      .select("id, name, origin, price")
      .eq("available", true);

    if (coffees) setGreenCoffees(coffees);

    setLoading(false);
  };

  const createRequest = async () => {
    if (!newRequest.roaster_id || !newRequest.green_coffee_id) {
      toast.error(language === "ar" ? "يرجى اختيار المحمصة والبن" : "Please select roaster and coffee");
      return;
    }

    const selectedCoffee = greenCoffees.find(c => c.id === newRequest.green_coffee_id);
    const roastingFee = 5; // Fee per kg
    const pricePerKg = (selectedCoffee?.price || 0) + roastingFee;

    const { error } = await supabase
      .from("custom_roast_requests")
      .insert({
        cafe_id: user?.id,
        ...newRequest,
        price_per_kg: pricePerKg,
        total_price: pricePerKg * newRequest.quantity_kg,
      });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error creating request");
    } else {
      toast.success(language === "ar" ? "تم إنشاء الطلب" : "Request created");
      setDialogOpen(false);
      fetchData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "accepted": return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "roasting": return <Flame className="w-4 h-4 text-orange-500" />;
      case "ready": return <Package className="w-4 h-4 text-green-500" />;
      case "shipped": return <Truck className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: "قيد الانتظار", en: "Pending" },
      accepted: { ar: "مقبول", en: "Accepted" },
      in_progress: { ar: "قيد التجهيز", en: "In Progress" },
      roasting: { ar: "قيد التحميص", en: "Roasting" },
      ready: { ar: "جاهز", en: "Ready" },
      shipped: { ar: "تم الشحن", en: "Shipped" },
      delivered: { ar: "تم التسليم", en: "Delivered" },
    };
    return labels[status]?.[language === "ar" ? "ar" : "en"] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "التحميص حسب الطلب" : "Custom Roast Requests"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "اطلب تحميص البن بالمواصفات التي تريدها" : "Order coffee roasted to your specifications"}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {language === "ar" ? "طلب جديد" : "New Request"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "طلب تحميص مخصص" : "Custom Roast Request"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "المحمصة" : "Roaster"}
                </label>
                <Select
                  value={newRequest.roaster_id}
                  onValueChange={(v) => setNewRequest({ ...newRequest, roaster_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر محمصة" : "Select roaster"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roasters.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "البن الأخضر" : "Green Coffee"}
                </label>
                <Select
                  value={newRequest.green_coffee_id}
                  onValueChange={(v) => setNewRequest({ ...newRequest, green_coffee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر البن" : "Select coffee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {greenCoffees.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.origin} (${c.price}/kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "درجة التحميص" : "Roast Level"}
                </label>
                <Select
                  value={newRequest.roast_level}
                  onValueChange={(v) => setNewRequest({ ...newRequest, roast_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{language === "ar" ? "فاتح" : "Light"}</SelectItem>
                    <SelectItem value="medium">{language === "ar" ? "متوسط" : "Medium"}</SelectItem>
                    <SelectItem value="medium-dark">{language === "ar" ? "متوسط داكن" : "Medium-Dark"}</SelectItem>
                    <SelectItem value="dark">{language === "ar" ? "داكن" : "Dark"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "الكمية (كجم)" : "Quantity (kg)"}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={newRequest.quantity_kg}
                  onChange={(e) => setNewRequest({ ...newRequest, quantity_kg: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "تعليمات خاصة" : "Special Instructions"}
                </label>
                <Textarea
                  placeholder={language === "ar" ? "أي ملاحظات للمحمصة..." : "Any notes for the roaster..."}
                  value={newRequest.special_instructions}
                  onChange={(e) => setNewRequest({ ...newRequest, special_instructions: e.target.value })}
                />
              </div>

              <Button onClick={createRequest} className="w-full">
                {language === "ar" ? "إرسال الطلب" : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(request.status)}
                  {getStatusLabel(request.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === "ar" ? "درجة التحميص" : "Roast Level"}</span>
                  <span className="font-medium">{request.roast_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === "ar" ? "الكمية" : "Quantity"}</span>
                  <span className="font-medium">{request.quantity_kg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === "ar" ? "السعر" : "Price"}</span>
                  <span className="font-medium text-primary">${request.total_price}</span>
                </div>
              </div>

              {request.special_instructions && (
                <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded">
                  {request.special_instructions}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {requests.length === 0 && !loading && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            {language === "ar" ? "لا توجد طلبات تحميص بعد" : "No roast requests yet"}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomRoastRequest;
