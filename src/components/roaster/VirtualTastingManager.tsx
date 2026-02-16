import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Plus, Calendar, Users, Play, Trash2, Radio, StopCircle, Clock, CheckCircle, Coffee } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TastingSession {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  coffee_samples: any;
  scheduled_at: string;
  duration_minutes: number | null;
  max_participants: number | null;
  status: string | null;
  video_url: string | null;
  host_id: string;
  host_type: string;
  participants?: any[];
}

export const VirtualTastingManager = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TastingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Form state
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [videoUrl, setVideoUrl] = useState('');
  const [coffeeSamples, setCoffeeSamples] = useState<string>('');

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user?.id) fetchSessions();
  }, [user?.id]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_tasting_sessions')
        .select('*')
        .eq('host_id', user?.id)
        .eq('host_type', 'roaster')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      // Get participants for each session
      const enrichedSessions = await Promise.all((data || []).map(async (session) => {
        const { data: participants } = await supabase
          .from('virtual_tasting_registrations')
          .select('*')
          .eq('session_id', session.id);

        return { ...session, participants: participants || [] };
      }));

      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!title || !scheduledAt) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setCreating(true);
    try {
      const samples = coffeeSamples.split(',').filter(s => s.trim()).map(s => ({ name: s.trim() }));
      
      const { error } = await supabase
        .from('virtual_tasting_sessions')
        .insert({
          host_id: user?.id,
          host_type: 'roaster',
          title,
          title_ar: titleAr || null,
          description: description || null,
          description_ar: descriptionAr || null,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          max_participants: maxParticipants,
          video_url: videoUrl || null,
          coffee_samples: samples
        });

      if (error) throw error;

      toast.success(isArabic ? 'تم إنشاء الجلسة بنجاح!' : 'Session created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTitleAr('');
    setDescription('');
    setDescriptionAr('');
    setScheduledAt('');
    setDuration(30);
    setMaxParticipants(10);
    setVideoUrl('');
    setCoffeeSamples('');
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('virtual_tasting_sessions')
        .update({ status: 'live' })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success(isArabic ? '🔴 الجلسة مباشرة الآن!' : '🔴 Session is LIVE!');
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('virtual_tasting_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success(isArabic ? 'تم إنهاء الجلسة' : 'Session ended');
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(isArabic ? 'هل تريد حذف هذه الجلسة؟' : 'Delete this session?')) return;
    
    try {
      const { error } = await supabase
        .from('virtual_tasting_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      toast.success(isArabic ? 'تم الحذف' : 'Deleted');
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">🔴 {isArabic ? 'مباشر' : 'LIVE'}</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">{isArabic ? 'مجدولة' : 'Scheduled'}</Badge>;
      case 'completed':
        return <Badge variant="outline">{isArabic ? 'منتهية' : 'Completed'}</Badge>;
      default:
        return <Badge variant="secondary">{isArabic ? 'مجدولة' : 'Scheduled'}</Badge>;
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'upcoming') return s.status === 'scheduled' || s.status === 'live' || !s.status;
    if (activeTab === 'completed') return s.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">{isArabic ? '🎥 جلسات التذوق الافتراضية' : '🎥 Virtual Tasting Sessions'}</h3>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'اجعل المقاهي تثق بك من خلال جلسات تذوق مباشرة' : 'Build trust with cafes through live tasting sessions'}
              </p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {isArabic ? 'جلسة' : 'New'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? 'إنشاء جلسة تذوق' : 'Create Tasting Session'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'العنوان (إنجليزي)' : 'Title (English)'} *</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ethiopian Yirgacheffe Tasting" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                    <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="تذوق إثيوبي يرغاشيف" dir="rtl" />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">{isArabic ? 'الوصف' : 'Description'}</label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder={isArabic ? 'وصف الجلسة...' : 'Session description...'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'التاريخ والوقت' : 'Date & Time'} *</label>
                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'المدة (دقائق)' : 'Duration (min)'}</label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} max={120} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'الحد الأقصى للمشاركين' : 'Max Participants'}</label>
                    <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min={1} max={50} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{isArabic ? 'رابط الفيديو' : 'Video URL'}</label>
                    <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://meet.google.com/..." />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{isArabic ? 'عينات القهوة (مفصولة بفاصلة)' : 'Coffee Samples (comma-separated)'}</label>
                  <Input 
                    value={coffeeSamples} 
                    onChange={(e) => setCoffeeSamples(e.target.value)} 
                    placeholder="Ethiopian Yirgacheffe, Kenya AA, Colombia Huila"
                  />
                </div>

                <Button onClick={handleCreateSession} disabled={creating} className="w-full">
                  {creating ? (isArabic ? 'جاري الإنشاء...' : 'Creating...') : (isArabic ? 'إنشاء الجلسة' : 'Create Session')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <Radio className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-lg font-bold">{sessions.filter(s => s.status === 'live').length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'مباشر' : 'Live'}</p>
          </div>
          <div className="text-center p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{sessions.filter(s => s.status === 'scheduled' || !s.status).length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'مجدولة' : 'Scheduled'}</p>
          </div>
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{sessions.filter(s => s.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'منتهية' : 'Done'}</p>
          </div>
        </div>

        {/* Sessions List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">{isArabic ? 'القادمة' : 'Upcoming'}</TabsTrigger>
            <TabsTrigger value="completed">{isArabic ? 'المنتهية' : 'Completed'}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-6">
                <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isArabic ? 'لا توجد جلسات' : 'No sessions'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div key={session.id} className={`p-3 border rounded-lg ${session.status === 'live' ? 'border-red-500 border-2 bg-red-500/5' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(session.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.participants?.length || 0}/{session.max_participants || 10}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm">{isArabic ? (session.title_ar || session.title) : session.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.scheduled_at), 'PPp', { locale: isArabic ? ar : undefined })}
                          <Clock className="h-3 w-3 ml-2" />
                          {session.duration_minutes || 30} {isArabic ? 'د' : 'min'}
                        </p>

                        {/* Coffee samples */}
                        {session.coffee_samples && Array.isArray(session.coffee_samples) && session.coffee_samples.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {session.coffee_samples.map((sample: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0">
                                <Coffee className="h-2 w-2 mr-1" />
                                {sample.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 ml-2">
                        {(session.status === 'scheduled' || !session.status) && (
                          <Button size="sm" onClick={() => handleStartSession(session.id)} className="bg-red-500 hover:bg-red-600 h-7 px-2 text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            {isArabic ? 'ابدأ' : 'Start'}
                          </Button>
                        )}
                        {session.status === 'live' && (
                          <>
                            {session.video_url && (
                              <Button size="sm" variant="outline" onClick={() => window.open(session.video_url!, '_blank')} className="h-7 px-2 text-xs">
                                {isArabic ? 'افتح' : 'Open'}
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleEndSession(session.id)} className="h-7 px-2 text-xs">
                              <StopCircle className="h-3 w-3 mr-1" />
                              {isArabic ? 'إنهاء' : 'End'}
                            </Button>
                          </>
                        )}
                        {session.status !== 'live' && (
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSession(session.id)} className="h-7 px-2">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VirtualTastingManager;
