import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Calendar, Clock, Users, Coffee, Plus, Play, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Session {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  scheduled_at: string;
  status: string;
  coffee_name: string | null;
  coffee_origin: string | null;
  max_participants: number;
  host_id: string;
}

const SupplierLiveSessions = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch sessions where user is host
      const { data, error } = await supabase
        .from('live_cupping_sessions')
        .select('*')
        .eq('host_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">{language === 'ar' ? 'مباشر' : 'Live'}</Badge>;
      case 'upcoming':
        return <Badge className="bg-dal-orange">{language === 'ar' ? 'قادم' : 'Upcoming'}</Badge>;
      default:
        return <Badge variant="outline">{language === 'ar' ? 'انتهت' : 'Ended'}</Badge>;
    }
  };

  const liveSessions = sessions.filter(s => s.status === 'live');
  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-dal-orange" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="salmani-border overflow-hidden">
      <CardHeader className="bg-gradient-to-l from-red-600 to-dal-orange text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {language === 'ar' ? 'جلساتي المباشرة' : 'My Live Sessions'}
            </CardTitle>
            <CardDescription className="text-white/90">
              {language === 'ar' ? 'أنشئ جلسات تحميص حية لعرض منتجاتك' : 'Create live roasting sessions to showcase your products'}
            </CardDescription>
          </div>
          <Link to="/cupping-live">
            <Button size="sm" variant="secondary" className="gap-1">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'جلسة جديدة' : 'New Session'}
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <Video className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{liveSessions.length}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مباشر الآن' : 'Live Now'}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-dal-orange/10 border border-dal-orange/20">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-dal-orange" />
            <p className="text-2xl font-bold">{upcomingSessions.length}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قادمة' : 'Upcoming'}</p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {language === 'ar' ? 'لم تنشئ أي جلسة بعد' : 'No sessions created yet'}
              </p>
              <Link to="/cupping-live">
                <Button variant="coffee" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'إنشاء جلسة' : 'Create Session'}
                </Button>
              </Link>
            </div>
          ) : (
            sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  session.status === 'live' ? 'border-red-500/50 bg-red-500/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    session.status === 'live' ? 'bg-red-500/20' : 'bg-dal-orange/20'
                  }`}>
                    {session.status === 'live' ? (
                      <Video className="w-5 h-5 text-red-500" />
                    ) : (
                      <Coffee className="w-5 h-5 text-dal-orange" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {language === 'ar' ? session.title_ar || session.title : session.title}
                      </p>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(session.scheduled_at), 'dd MMM', { locale: language === 'ar' ? ar : enUS })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(session.scheduled_at), 'HH:mm')}
                      </span>
                      {session.coffee_name && (
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3 h-3" />
                          {session.coffee_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {session.status === 'live' && (
                  <Link to="/cupping-live">
                    <Button size="sm" className="bg-red-500 hover:bg-red-600">
                      <Play className="w-4 h-4 mr-1" />
                      {language === 'ar' ? 'انضم' : 'Join'}
                    </Button>
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        {/* View All Link */}
        {sessions.length > 4 && (
          <div className="mt-4 text-center">
            <Link to="/cupping-live">
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'عرض جميع الجلسات' : 'View All Sessions'}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierLiveSessions;
