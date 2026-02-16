import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useLiveCuppingSessions, LiveCuppingSession } from '@/hooks/useLiveCuppingSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import VideoRoom from '@/components/VideoRoom';
import { ArrowLeft, Video, VideoOff, Calendar, Clock, Users, Play, Coffee, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const LiveCuppingSessions = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    sessions, 
    isLoading, 
    createSession, 
    registerForSession, 
    unregisterFromSession,
    startSession,
    joinSession,
    leaveSession 
  } = useLiveCuppingSessions();
  
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{ roomId: string; session: LiveCuppingSession } | null>(null);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    coffeeName: '',
    origin: '',
    duration: 60,
  });

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.scheduledAt) return;
    
    setIsCreating(true);
    const result = await createSession({
      title: newSession.title,
      description: newSession.description,
      coffee_name: newSession.coffeeName,
      coffee_origin: newSession.origin,
      scheduled_at: new Date(newSession.scheduledAt).toISOString(),
      duration_minutes: newSession.duration,
    });
    
    setIsCreating(false);
    if (result) {
      setShowCreateDialog(false);
      setNewSession({ title: '', description: '', scheduledAt: '', coffeeName: '', origin: '', duration: 60 });
    }
  };

  const handleRegister = async (session: LiveCuppingSession) => {
    if (session.is_registered) {
      await unregisterFromSession(session.id);
    } else {
      await registerForSession(session.id);
    }
  };

  const handleJoinSession = async (session: LiveCuppingSession) => {
    if (session.status !== 'live') return;
    
    const rtcConfig = await joinSession(session.id);
    if (rtcConfig) {
      setActiveRoom({ roomId: rtcConfig.roomId, session });
    }
  };

  const handleStartSession = async (session: LiveCuppingSession) => {
    await startSession(session.id);
  };

  const handleLeaveRoom = async () => {
    if (activeRoom) {
      await leaveSession(activeRoom.session.id);
      setActiveRoom(null);
    }
  };

  const filteredSessions = sessions.filter(session => {
    // Only show approved sessions to regular users, or their own sessions
    const sessionApprovalStatus = (session as any).approval_status;
    const isOwnSession = session.host_id === user?.id;
    
    if (sessionApprovalStatus !== 'approved' && !isOwnSession) {
      return false;
    }
    
    if (filter === 'all') return true;
    return session.status === filter;
  });

  const getStatusBadge = (status: LiveCuppingSession['status']) => {
    switch (status) {
      case 'live':
        return { label: language === 'ar' ? 'مباشر الآن' : 'Live Now', variant: 'destructive' as const, icon: Video };
      case 'upcoming':
        return { label: language === 'ar' ? 'قادم' : 'Upcoming', variant: 'secondary' as const, icon: Calendar };
      default:
        return { label: language === 'ar' ? 'انتهت' : 'Ended', variant: 'outline' as const, icon: VideoOff };
    }
  };

  const getApprovalBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'approved':
        return { label: language === 'ar' ? 'معتمدة' : 'Approved', className: 'bg-green-500' };
      case 'rejected':
        return { label: language === 'ar' ? 'مرفوضة' : 'Rejected', className: 'bg-red-500' };
      default:
        return { label: language === 'ar' ? 'قيد المراجعة' : 'Pending', className: 'bg-yellow-500' };
    }
  };

  // Show video room if active
  if (activeRoom) {
    return (
      <VideoRoom
        roomId={activeRoom.roomId}
        sessionTitle={language === 'ar' ? activeRoom.session.title_ar || activeRoom.session.title : activeRoom.session.title}
        isHost={activeRoom.session.host_id === user?.id}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Video className="h-8 w-8 text-destructive animate-pulse" />
                {language === 'ar' ? 'جلسات التحميص المباشرة' : 'Live Roasting Sessions'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'انضم لجلسات تحميص مباشرة مع خبراء القهوة' 
                  : 'Join live roasting sessions with coffee experts'}
              </p>
            </div>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button disabled={!user}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إنشاء جلسة' : 'Create Session'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إنشاء جلسة تحميص جديدة' : 'Create New Roasting Session'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'عنوان الجلسة' : 'Session Title'} *</label>
                  <Input
                    value={newSession.title}
                    onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل عنوان الجلسة' : 'Enter session title'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <Textarea
                    value={newSession.description}
                    onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ar' ? 'وصف الجلسة' : 'Session description'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{language === 'ar' ? 'اسم القهوة' : 'Coffee Name'}</label>
                    <Input
                      value={newSession.coffeeName}
                      onChange={(e) => setNewSession(prev => ({ ...prev, coffeeName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{language === 'ar' ? 'المنشأ' : 'Origin'}</label>
                    <Input
                      value={newSession.origin}
                      onChange={(e) => setNewSession(prev => ({ ...prev, origin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'} *</label>
                    <Input
                      type="datetime-local"
                      value={newSession.scheduledAt}
                      onChange={(e) => setNewSession(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{language === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)'}</label>
                    <Input
                      type="number"
                      value={newSession.duration}
                      onChange={(e) => setNewSession(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-700 dark:text-yellow-400">
                  {language === 'ar' 
                    ? '⚠️ ملاحظة: الجلسة ستكون قيد المراجعة من الإدارة قبل أن تصبح مرئية للآخرين'
                    : '⚠️ Note: Session will be pending admin approval before becoming visible to others'}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateSession}
                  disabled={isCreating || !newSession.title || !newSession.scheduledAt}
                >
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إنشاء الجلسة' : 'Create Session'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'live', 'upcoming'] as const).map(filterOption => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterOption)}
            >
              {filterOption === 'all' && (language === 'ar' ? 'الكل' : 'All')}
              {filterOption === 'live' && (
                <>
                  <Video className="h-4 w-4 mr-1 text-destructive" />
                  {language === 'ar' ? 'مباشر' : 'Live'}
                </>
              )}
              {filterOption === 'upcoming' && (language === 'ar' ? 'قادم' : 'Upcoming')}
            </Button>
          ))}
        </div>

        {/* Live Session Banner */}
        {sessions.some(s => s.status === 'live') && (
          <Card className="mb-6 bg-gradient-to-r from-destructive/10 to-accent/10 border-destructive/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Video className="h-8 w-8 text-destructive" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="font-semibold">{language === 'ar' ? 'جلسة مباشرة الآن!' : 'Session Live Now!'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? sessions.find(s => s.status === 'live')?.title_ar || sessions.find(s => s.status === 'live')?.title
                      : sessions.find(s => s.status === 'live')?.title}
                  </p>
                </div>
                <Button 
                  className="ml-auto"
                  onClick={() => {
                    const liveSession = sessions.find(s => s.status === 'live');
                    if (liveSession) handleJoinSession(liveSession);
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <Card className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">
              {language === 'ar' ? 'لا توجد جلسات حالياً' : 'No sessions available'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'كن أول من ينشئ جلسة تحميص مباشرة!' 
                : 'Be the first to create a live roasting session!'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)} disabled={!user}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إنشاء جلسة' : 'Create Session'}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map(session => {
              const statusBadge = getStatusBadge(session.status);
              const StatusIcon = statusBadge.icon;
              const isHost = session.host_id === user?.id;
              const approvalStatus = (session as any).approval_status || 'pending';
              const approvalBadge = getApprovalBadge(approvalStatus);
              const isPendingApproval = approvalStatus === 'pending';
              const isRejected = approvalStatus === 'rejected';
              
              return (
                <Card key={session.id} className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  session.status === 'live' ? 'ring-2 ring-destructive' : ''
                } ${isPendingApproval ? 'opacity-75 border-yellow-500/50' : ''} ${isRejected ? 'opacity-50 border-red-500/50' : ''}`}>
                  {/* Thumbnail Placeholder */}
                  <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Coffee className="h-16 w-16 text-primary/50" />
                    <Badge 
                      variant={statusBadge.variant} 
                      className="absolute top-3 right-3 flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusBadge.label}
                    </Badge>
                    {isHost && (
                      <Badge className={`absolute top-3 left-3 ${approvalBadge.className}`}>
                        {approvalBadge.label}
                      </Badge>
                    )}
                    {session.is_registered && !isHost && (
                      <Badge className="absolute top-3 left-3 bg-success">
                        {language === 'ar' ? 'مسجل' : 'Registered'}
                      </Badge>
                    )}
                    {isHost && (
                      <Badge className="absolute bottom-3 right-3" variant="default">
                        {language === 'ar' ? 'أنت المضيف' : 'You are host'}
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {language === 'ar' ? session.title_ar || session.title : session.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {language === 'ar' ? session.description_ar || session.description : session.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {session.coffee_name && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Coffee className="h-4 w-4" />
                            {session.coffee_name}
                          </span>
                          {session.coffee_origin && (
                            <Badge variant="outline">{session.coffee_origin}</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(session.scheduled_at), 'dd MMM', { locale: language === 'ar' ? ar : enUS })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(session.scheduled_at), 'HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {session.participants_count}/{session.max_participants}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'المضيف:' : 'Host:'} {session.host_name}
                      </p>

                      <div className="flex gap-2 pt-2">
                        {isPendingApproval && isHost ? (
                          <div className="flex-1 text-center p-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
                            {language === 'ar' ? 'قيد مراجعة الإدارة' : 'Awaiting admin approval'}
                          </div>
                        ) : isRejected && isHost ? (
                          <div className="flex-1 text-center p-2 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
                            {language === 'ar' ? 'تم رفض الجلسة من الإدارة' : 'Session rejected by admin'}
                          </div>
                        ) : session.status === 'live' ? (
                          <Button 
                            className="flex-1 bg-destructive hover:bg-destructive/90"
                            onClick={() => handleJoinSession(session)}
                            disabled={!user}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                          </Button>
                        ) : isHost ? (
                          <Button 
                            className="flex-1"
                            onClick={() => handleStartSession(session)}
                            disabled={approvalStatus !== 'approved'}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'بدء البث' : 'Start Stream'}
                          </Button>
                        ) : (
                          <Button 
                            variant={session.is_registered ? 'outline' : 'default'}
                            className="flex-1"
                            onClick={() => handleRegister(session)}
                            disabled={!user || (session.participants_count || 0) >= session.max_participants}
                          >
                            {session.is_registered 
                              ? (language === 'ar' ? 'إلغاء التسجيل' : 'Unregister')
                              : (language === 'ar' ? 'سجل الآن' : 'Register')
                            }
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCuppingSessions;
