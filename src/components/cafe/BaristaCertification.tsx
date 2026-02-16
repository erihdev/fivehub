import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Plus, GraduationCap, Download, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Certification {
  id: string;
  barista_name: string;
  barista_email: string;
  certification_type: string;
  score: number;
  passed: boolean;
  certificate_url: string;
  issued_at: string;
  expires_at: string;
}

interface TrainingSession {
  id: string;
  title: string;
  title_ar: string;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  price: number;
  is_free: boolean;
}

const BaristaCertification = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [newBarista, setNewBarista] = useState({
    name: "",
    email: "",
    certification_type: "basic",
    session_id: "",
  });

  const certificationTypes = [
    { id: "basic", ar: "أساسي", en: "Basic", color: "bg-blue-500" },
    { id: "intermediate", ar: "متوسط", en: "Intermediate", color: "bg-yellow-500" },
    { id: "advanced", ar: "متقدم", en: "Advanced", color: "bg-orange-500" },
    { id: "master", ar: "ماستر", en: "Master", color: "bg-purple-500" },
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch certifications
    const { data: certsData } = await supabase
      .from("barista_certifications")
      .select("*")
      .eq("cafe_id", user?.id)
      .order("created_at", { ascending: false });

    if (certsData) setCertifications(certsData);

    // Fetch available training sessions
    const { data: sessionsData } = await supabase
      .from("cafe_training_sessions")
      .select("*")
      .gte("scheduled_at", new Date().toISOString())
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });

    if (sessionsData) setTrainingSessions(sessionsData);

    setLoading(false);
  };

  const registerBarista = async () => {
    if (!newBarista.name) {
      toast.error(language === "ar" ? "يرجى إدخال اسم الباريستا" : "Please enter barista name");
      return;
    }

    const { error } = await supabase.from("barista_certifications").insert({
      cafe_id: user?.id,
      barista_name: newBarista.name,
      barista_email: newBarista.email,
      certification_type: newBarista.certification_type,
      course_id: newBarista.session_id || null,
    });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error registering barista");
    } else {
      toast.success(language === "ar" ? "تم التسجيل بنجاح!" : "Registration successful!");
      setRegisterOpen(false);
      setNewBarista({ name: "", email: "", certification_type: "basic", session_id: "" });
      fetchData();
    }
  };

  const getCertificationBadge = (type: string, passed: boolean) => {
    const cert = certificationTypes.find(c => c.id === type);
    return (
      <Badge className={`${cert?.color} ${!passed ? "opacity-50" : ""}`}>
        {language === "ar" ? cert?.ar : cert?.en}
        {passed && <CheckCircle className="w-3 h-3 ml-1" />}
      </Badge>
    );
  };

  const passedCount = certifications.filter(c => c.passed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "شهادات الباريستا" : "Barista Certifications"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "برنامج تدريب وشهادات معتمدة" : "Training program and certified certificates"}
            </p>
          </div>
        </div>

        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {language === "ar" ? "تسجيل باريستا" : "Register Barista"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "تسجيل باريستا للتدريب" : "Register Barista for Training"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "اسم الباريستا" : "Barista Name"}
                </label>
                <Input
                  value={newBarista.name}
                  onChange={(e) => setNewBarista({ ...newBarista, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "البريد الإلكتروني" : "Email"}
                </label>
                <Input
                  type="email"
                  value={newBarista.email}
                  onChange={(e) => setNewBarista({ ...newBarista, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "مستوى الشهادة" : "Certification Level"}
                </label>
                <Select
                  value={newBarista.certification_type}
                  onValueChange={(v) => setNewBarista({ ...newBarista, certification_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {certificationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {language === "ar" ? type.ar : type.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "جلسة التدريب (اختياري)" : "Training Session (optional)"}
                </label>
                <Select
                  value={newBarista.session_id}
                  onValueChange={(v) => setNewBarista({ ...newBarista, session_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر جلسة" : "Select session"} />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {language === "ar" ? session.title_ar || session.title : session.title}
                        {" - "}
                        {format(new Date(session.scheduled_at), "MMM d")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={registerBarista} className="w-full">
                {language === "ar" ? "تسجيل" : "Register"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {certificationTypes.map((type) => {
          const count = certifications.filter(c => c.certification_type === type.id && c.passed).length;
          return (
            <Card key={type.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${type.color} rounded-lg`}>
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? type.ar : type.en}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Certification Path */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            {language === "ar" ? "مسار الشهادات" : "Certification Path"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {certificationTypes.map((type, index) => (
              <div key={type.id} className="flex items-center">
                <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center text-white font-bold`}>
                  {index + 1}
                </div>
                {index < certificationTypes.length - 1 && (
                  <div className="w-16 h-1 bg-muted mx-2" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {certificationTypes.map((type) => (
              <span key={type.id} className="text-sm text-center">
                {language === "ar" ? type.ar : type.en}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "الباريستا المسجلين" : "Registered Baristas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Award className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{cert.barista_name}</h4>
                    <p className="text-sm text-muted-foreground">{cert.barista_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getCertificationBadge(cert.certification_type, cert.passed)}
                  {cert.passed && cert.score && (
                    <span className="text-sm font-medium">{cert.score}%</span>
                  )}
                  {cert.issued_at && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(cert.issued_at), "MMM d, yyyy")}
                    </div>
                  )}
                  {cert.certificate_url && (
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      {language === "ar" ? "تحميل" : "Download"}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {certifications.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {language === "ar" ? "لا يوجد باريستا مسجلين بعد" : "No baristas registered yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaristaCertification;
