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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Flame, Plus, Star, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RoastProfile {
  id: string;
  coffee_id: string | null;
  profile_name: string;
  roast_date: string;
  roast_level: string | null;
  first_crack_time: string | null;
  second_crack_time: string | null;
  total_roast_time: string | null;
  end_temperature: string | null;
  batch_size_kg: number | null;
  notes: string | null;
  rating: number | null;
  coffee_offerings: { name: string; origin: string | null } | null;
}

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
}

const roastLevels = [
  { value: "light", label: "فاتح" },
  { value: "medium-light", label: "فاتح متوسط" },
  { value: "medium", label: "متوسط" },
  { value: "medium-dark", label: "متوسط داكن" },
  { value: "dark", label: "داكن" },
];

const RoastProfiles = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<RoastProfile[]>([]);
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({
    coffee_id: "",
    profile_name: "",
    roast_date: format(new Date(), "yyyy-MM-dd"),
    roast_level: "",
    first_crack_time: "",
    second_crack_time: "",
    total_roast_time: "",
    end_temperature: "",
    batch_size_kg: "",
    notes: "",
    rating: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchCoffees();
    }
  }, [user]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("roast_profiles")
      .select(`*, coffee_offerings (name, origin)`)
      .order("roast_date", { ascending: false });

    if (!error) setProfiles(data as unknown as RoastProfile[] || []);
    setIsLoading(false);
  };

  const fetchCoffees = async () => {
    const { data } = await supabase.from("coffee_offerings").select("id, name, origin");
    setCoffees(data || []);
  };

  const createProfile = async () => {
    if (!user || !newProfile.profile_name) return;

    const { error } = await supabase.from("roast_profiles").insert({
      user_id: user.id,
      coffee_id: newProfile.coffee_id || null,
      profile_name: newProfile.profile_name,
      roast_date: newProfile.roast_date,
      roast_level: newProfile.roast_level || null,
      first_crack_time: newProfile.first_crack_time || null,
      second_crack_time: newProfile.second_crack_time || null,
      total_roast_time: newProfile.total_roast_time || null,
      end_temperature: newProfile.end_temperature || null,
      batch_size_kg: newProfile.batch_size_kg ? Number(newProfile.batch_size_kg) : null,
      notes: newProfile.notes || null,
      rating: newProfile.rating ? Number(newProfile.rating) : null,
    });

    if (error) {
      toast({ title: "خطأ", description: "فشل في إنشاء ملف التحميص", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم إنشاء ملف التحميص بنجاح" });
      setIsDialogOpen(false);
      setNewProfile({ coffee_id: "", profile_name: "", roast_date: format(new Date(), "yyyy-MM-dd"), roast_level: "", first_crack_time: "", second_crack_time: "", total_roast_time: "", end_temperature: "", batch_size_kg: "", notes: "", rating: "" });
      fetchProfiles();
    }
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from("roast_profiles").delete().eq("id", id);
    if (!error) {
      toast({ title: "تم", description: "تم حذف ملف التحميص" });
      fetchProfiles();
    }
  };

  const getRoastLevelLabel = (level: string | null) => {
    return roastLevels.find(l => l.value === level)?.label || level;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ملاحظات التحميص</h1>
            <p className="text-muted-foreground mt-1">سجل ملفات التحميص الخاصة بك</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" />ملف تحميص جديد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة ملف تحميص جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>اسم الملف *</Label>
                      <Input value={newProfile.profile_name} onChange={(e) => setNewProfile({ ...newProfile, profile_name: e.target.value })} placeholder="مثال: إثيوبيا يرغاتشيف - فاتح" />
                    </div>
                    <div>
                      <Label>القهوة الخضراء</Label>
                      <Select value={newProfile.coffee_id} onValueChange={(v) => setNewProfile({ ...newProfile, coffee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر القهوة" /></SelectTrigger>
                        <SelectContent>
                          {coffees.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} - {c.origin}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>تاريخ التحميص</Label>
                      <Input type="date" value={newProfile.roast_date} onChange={(e) => setNewProfile({ ...newProfile, roast_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>درجة التحميص</Label>
                      <Select value={newProfile.roast_level} onValueChange={(v) => setNewProfile({ ...newProfile, roast_level: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>
                          {roastLevels.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>حجم الدفعة (كجم)</Label>
                      <Input type="number" value={newProfile.batch_size_kg} onChange={(e) => setNewProfile({ ...newProfile, batch_size_kg: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>First Crack</Label>
                      <Input value={newProfile.first_crack_time} onChange={(e) => setNewProfile({ ...newProfile, first_crack_time: e.target.value })} placeholder="8:30" />
                    </div>
                    <div>
                      <Label>Second Crack</Label>
                      <Input value={newProfile.second_crack_time} onChange={(e) => setNewProfile({ ...newProfile, second_crack_time: e.target.value })} placeholder="10:45" />
                    </div>
                    <div>
                      <Label>إجمالي الوقت</Label>
                      <Input value={newProfile.total_roast_time} onChange={(e) => setNewProfile({ ...newProfile, total_roast_time: e.target.value })} placeholder="11:30" />
                    </div>
                    <div>
                      <Label>درجة الحرارة النهائية</Label>
                      <Input value={newProfile.end_temperature} onChange={(e) => setNewProfile({ ...newProfile, end_temperature: e.target.value })} placeholder="205°C" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>التقييم (1-5)</Label>
                      <Input type="number" min="1" max="5" value={newProfile.rating} onChange={(e) => setNewProfile({ ...newProfile, rating: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea value={newProfile.notes} onChange={(e) => setNewProfile({ ...newProfile, notes: e.target.value })} rows={3} placeholder="ملاحظات حول النتيجة، النكهات، التعديلات المقترحة..." />
                  </div>
                  <Button onClick={createProfile} className="w-full" disabled={!newProfile.profile_name}>حفظ ملف التحميص</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowRight className="ml-2 h-4 w-4" />العودة
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {profiles.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد ملفات تحميص مسجلة</p>
              </CardContent>
            </Card>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{profile.profile_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(profile.roast_date), "PPP", { locale: ar })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span>{profile.rating}</span>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteProfile(profile.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.coffee_offerings && (
                    <p className="text-sm text-muted-foreground mb-2">
                      القهوة: {profile.coffee_offerings.name} - {profile.coffee_offerings.origin}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.roast_level && <Badge variant="secondary">{getRoastLevelLabel(profile.roast_level)}</Badge>}
                    {profile.batch_size_kg && <Badge variant="outline">{profile.batch_size_kg} كجم</Badge>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-center">
                    {profile.first_crack_time && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">First Crack</p>
                        <p className="font-semibold">{profile.first_crack_time}</p>
                      </div>
                    )}
                    {profile.second_crack_time && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Second Crack</p>
                        <p className="font-semibold">{profile.second_crack_time}</p>
                      </div>
                    )}
                    {profile.total_roast_time && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">إجمالي الوقت</p>
                        <p className="font-semibold">{profile.total_roast_time}</p>
                      </div>
                    )}
                    {profile.end_temperature && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">الحرارة النهائية</p>
                        <p className="font-semibold">{profile.end_temperature}</p>
                      </div>
                    )}
                  </div>
                  {profile.notes && (
                    <p className="mt-2 text-sm text-muted-foreground bg-muted/30 rounded p-2">{profile.notes}</p>
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

export default RoastProfiles;
