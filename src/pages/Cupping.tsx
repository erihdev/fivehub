import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Coffee, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CuppingSession {
  id: string;
  coffee_id: string | null;
  session_date: string;
  aroma_score: number | null;
  flavor_score: number | null;
  aftertaste_score: number | null;
  acidity_score: number | null;
  body_score: number | null;
  balance_score: number | null;
  overall_score: number | null;
  total_score: number | null;
  notes: string | null;
  coffee_offerings: {
    name: string;
    origin: string | null;
  } | null;
}

interface CoffeeOption {
  id: string;
  name: string;
  origin: string | null;
}

const scoreFields = [
  { key: "aroma_score", label: "الرائحة" },
  { key: "flavor_score", label: "النكهة" },
  { key: "aftertaste_score", label: "الطعم المتبقي" },
  { key: "acidity_score", label: "الحموضة" },
  { key: "body_score", label: "الجسم" },
  { key: "balance_score", label: "التوازن" },
  { key: "overall_score", label: "التقييم العام" },
];

const Cupping = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CuppingSession[]>([]);
  const [coffees, setCoffees] = useState<CoffeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    coffee_id: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    aroma_score: "",
    flavor_score: "",
    aftertaste_score: "",
    acidity_score: "",
    body_score: "",
    balance_score: "",
    overall_score: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchCoffees();
    }
  }, [user]);

  const fetchSessions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("cupping_sessions")
      .select(`*, coffee_offerings (name, origin)`)
      .order("session_date", { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل جلسات التذوق", variant: "destructive" });
    } else {
      setSessions(data as unknown as CuppingSession[] || []);
    }
    setIsLoading(false);
  };

  const fetchCoffees = async () => {
    const { data } = await supabase
      .from("coffee_offerings")
      .select("id, name, origin");
    setCoffees(data || []);
  };

  const createSession = async () => {
    if (!user) return;

    const sessionData = {
      coffee_id: newSession.coffee_id || null,
      user_id: user.id,
      session_date: newSession.session_date,
      aroma_score: newSession.aroma_score ? Number(newSession.aroma_score) : null,
      flavor_score: newSession.flavor_score ? Number(newSession.flavor_score) : null,
      aftertaste_score: newSession.aftertaste_score ? Number(newSession.aftertaste_score) : null,
      acidity_score: newSession.acidity_score ? Number(newSession.acidity_score) : null,
      body_score: newSession.body_score ? Number(newSession.body_score) : null,
      balance_score: newSession.balance_score ? Number(newSession.balance_score) : null,
      overall_score: newSession.overall_score ? Number(newSession.overall_score) : null,
      notes: newSession.notes || null,
    };

    const { error } = await supabase.from("cupping_sessions").insert(sessionData);

    if (error) {
      toast({ title: "خطأ", description: "فشل في إنشاء جلسة التذوق", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم إنشاء جلسة التذوق بنجاح" });
      setIsDialogOpen(false);
      setNewSession({
        coffee_id: "",
        session_date: format(new Date(), "yyyy-MM-dd"),
        aroma_score: "",
        flavor_score: "",
        aftertaste_score: "",
        acidity_score: "",
        body_score: "",
        balance_score: "",
        overall_score: "",
        notes: "",
      });
      fetchSessions();
    }
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("cupping_sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: "فشل في حذف الجلسة", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف الجلسة" });
      fetchSessions();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">سجل التحميص</h1>
            <p className="text-muted-foreground mt-1">تسجيل وتتبع جلسات تحميص القهوة</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  جلسة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة جلسة تحميص جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>القهوة (اختياري)</Label>
                      <Select value={newSession.coffee_id} onValueChange={(v) => setNewSession({ ...newSession, coffee_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر قهوة" />
                        </SelectTrigger>
                        <SelectContent>
                          {coffees.map((coffee) => (
                            <SelectItem key={coffee.id} value={coffee.id}>
                              {coffee.name} - {coffee.origin || "غير محدد"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>تاريخ الجلسة</Label>
                      <Input
                        type="date"
                        value={newSession.session_date}
                        onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {scoreFields.map((field) => (
                      <div key={field.key}>
                        <Label>{field.label} (0-10)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          step="0.25"
                          value={newSession[field.key as keyof typeof newSession]}
                          onChange={(e) => setNewSession({ ...newSession, [field.key]: e.target.value })}
                          placeholder="0-10"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                      placeholder="ملاحظات حول النكهات والروائح..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={createSession} className="w-full">
                    حفظ الجلسة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coffee className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد جلسات تحميص مسجلة</p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {session.coffee_offerings?.name || "قهوة غير محددة"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.session_date), "PPP", { locale: ar })}
                        {session.coffee_offerings?.origin && ` • ${session.coffee_offerings.origin}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{session.total_score?.toFixed(1) || "—"}</p>
                        <p className="text-xs text-muted-foreground">المجموع</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteSession(session.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center text-sm">
                    {scoreFields.map((field) => (
                      <div key={field.key} className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground text-xs">{field.label}</p>
                        <p className="font-semibold">{String(session[field.key as keyof CuppingSession] ?? "—")}</p>
                      </div>
                    ))}
                  </div>
                  {session.notes && (
                    <p className="mt-3 text-sm text-muted-foreground bg-muted/30 rounded p-2">{session.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
};

export default Cupping;
