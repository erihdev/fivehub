import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Users, Clock, Play, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TastingSession {
  id: string;
  host_id: string;
  host_type: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  scheduled_at: string;
  duration_minutes: number;
  max_participants: number;
  status: string;
  video_url: string;
  registrations_count?: number;
  is_registered?: boolean;
}

const VirtualTasting = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TastingSession[]>([]);
  const [mySessions, setMySessions] = useState<TastingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    setLoading(true);

    // Fetch all upcoming sessions
    const { data: allSessions } = await supabase
      .from("virtual_tasting_sessions")
      .select("*")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (allSessions) {
      // Check registrations
      const { data: myRegs } = await supabase
        .from("virtual_tasting_registrations")
        .select("session_id")
        .eq("cafe_id", user?.id);

      const myRegIds = new Set(myRegs?.map(r => r.session_id) || []);

      const sessionsWithInfo = await Promise.all(
        allSessions.map(async (session) => {
          const { count } = await supabase
            .from("virtual_tasting_registrations")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id);

          return {
            ...session,
            registrations_count: count || 0,
            is_registered: myRegIds.has(session.id),
          };
        })
      );

      setSessions(sessionsWithInfo.filter(s => !s.is_registered));
      setMySessions(sessionsWithInfo.filter(s => s.is_registered));
    }

    setLoading(false);
  };

  const registerForSession = async (sessionId: string) => {
    const { error } = await supabase.from("virtual_tasting_registrations").insert({
      session_id: sessionId,
      cafe_id: user?.id,
    });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error registering");
    } else {
      toast.success(language === "ar" ? "تم التسجيل بنجاح!" : "Registered successfully!");
      fetchSessions();
    }
  };

  const unregister = async (sessionId: string) => {
    const { error } = await supabase
      .from("virtual_tasting_registrations")
      .delete()
      .eq("session_id", sessionId)
      .eq("cafe_id", user?.id);

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error unregistering");
    } else {
      toast.success(language === "ar" ? "تم إلغاء التسجيل" : "Unregistered");
      fetchSessions();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500 animate-pulse">{language === "ar" ? "مباشر" : "LIVE"}</Badge>;
      case "scheduled":
        return <Badge variant="secondary">{language === "ar" ? "قادم" : "Upcoming"}</Badge>;
      case "completed":
        return <Badge variant="outline">{language === "ar" ? "منتهي" : "Completed"}</Badge>;
      default:
        return null;
    }
  };

  const SessionCard = ({ session, registered = false }: { session: TastingSession; registered?: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
        <Video className="w-12 h-12 text-white opacity-50" />
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {getStatusBadge(session.status)}
          <span className="text-sm text-muted-foreground">
            {session.host_type === "supplier" ? (language === "ar" ? "مورد" : "Supplier") : (language === "ar" ? "محمصة" : "Roaster")}
          </span>
        </div>

        <h3 className="font-semibold mb-2">
          {language === "ar" ? session.title_ar || session.title : session.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {language === "ar" ? session.description_ar || session.description : session.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {format(new Date(session.scheduled_at), "MMM d, yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {session.duration_minutes} {language === "ar" ? "دقيقة" : "min"}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4" />
            {session.registrations_count}/{session.max_participants}
          </div>

          {registered ? (
            <div className="flex gap-2">
              {session.status === "live" && session.video_url && (
                <Button size="sm" className="bg-red-500 hover:bg-red-600">
                  <Play className="w-4 h-4 mr-1" />
                  {language === "ar" ? "انضمام" : "Join"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => unregister(session.id)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => registerForSession(session.id)}
              disabled={(session.registrations_count || 0) >= session.max_participants}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {language === "ar" ? "تسجيل" : "Register"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">
            {language === "ar" ? "جلسات التذوق الافتراضية" : "Virtual Tasting Sessions"}
          </h2>
          <p className="text-muted-foreground">
            {language === "ar" ? "شارك في جلسات تذوق مباشرة مع الخبراء" : "Join live tasting sessions with experts"}
          </p>
        </div>
      </div>

      {/* My Registered Sessions */}
      {mySessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            {language === "ar" ? "جلساتي المسجلة" : "My Registered Sessions"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySessions.map((session) => (
              <SessionCard key={session.id} session={session} registered />
            ))}
          </div>
        </div>
      )}

      {/* Available Sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === "ar" ? "الجلسات القادمة" : "Upcoming Sessions"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}

          {sessions.length === 0 && !loading && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              {language === "ar" ? "لا توجد جلسات قادمة حالياً" : "No upcoming sessions available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTasting;
