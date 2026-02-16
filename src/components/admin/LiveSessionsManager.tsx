import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, VideoOff, Calendar, Clock, Users, Coffee, Eye, Trash2, Loader2,
  Check, X, AlertCircle, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
  approval_status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

const LiveSessionsManager = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_cupping_sessions')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (sessionId: string) => {
    setProcessingId(sessionId);
    try {
      const { error } = await supabase
        .from('live_cupping_sessions')
        .update({
          approval_status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تمت الموافقة' : 'Approved',
        description: language === 'ar' ? 'تم الموافقة على الجلسة' : 'Session approved successfully',
      });

      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, approval_status: 'approved' } : s
      ));
    } catch (error) {
      console.error('Error approving session:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في الموافقة على الجلسة' : 'Failed to approve session',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedSession) return;
    
    setProcessingId(selectedSession.id);
    try {
      const { error } = await supabase
        .from('live_cupping_sessions')
        .update({
          approval_status: 'rejected',
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الرفض' : 'Rejected',
        description: language === 'ar' ? 'تم رفض الجلسة' : 'Session rejected',
      });

      setSessions(sessions.map(s => 
        s.id === selectedSession.id ? { ...s, approval_status: 'rejected', admin_notes: adminNotes } : s
      ));
      setRejectDialogOpen(false);
      setSelectedSession(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting session:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في رفض الجلسة' : 'Failed to reject session',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const { error } = await supabase
        .from('live_cupping_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الجلسة بنجاح' : 'Session deleted successfully',
      });

      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل حذف الجلسة' : 'Failed to delete session',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
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

  const getApprovalBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'approved':
        return <Badge className="bg-green-500">{language === 'ar' ? 'معتمدة' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</Badge>;
      default:
        return <Badge className="bg-yellow-500">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</Badge>;
    }
  };

  const pendingSessions = sessions.filter(s => s.approval_status === 'pending');
  const approvedSessions = sessions.filter(s => s.approval_status === 'approved');
  const rejectedSessions = sessions.filter(s => s.approval_status === 'rejected');
  const liveSessions = sessions.filter(s => s.status === 'live' && s.approval_status === 'approved');

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
    <>
      <Card className="salmani-border overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-red-600 to-dal-orange text-white">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {language === 'ar' ? 'إدارة جلسات التحميص المباشرة' : 'Live Roasting Sessions Management'}
          </CardTitle>
          <CardDescription className="text-white/90">
            {language === 'ar' ? 'مراجعة والموافقة على جلسات التحميص' : 'Review and approve roasting sessions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{pendingSessions.length}</p>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{approvedSessions.length}</p>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'معتمدة' : 'Approved'}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <Video className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{liveSessions.length}</p>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مباشر الآن' : 'Live Now'}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted">
              <VideoOff className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{rejectedSessions.length}</p>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</p>
            </div>
          </div>

          {/* Pending Sessions First */}
          {pendingSessions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                {language === 'ar' ? 'طلبات جديدة تنتظر الموافقة' : 'New Requests Awaiting Approval'}
              </h3>
              <div className="space-y-3">
                {pendingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500/20">
                        <Coffee className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {language === 'ar' ? session.title_ar || session.title : session.title}
                          </p>
                          {getApprovalBadge(session.approval_status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.scheduled_at), 'dd MMM yyyy', { locale: language === 'ar' ? ar : enUS })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.scheduled_at), 'HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {session.max_participants}
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApprove(session.id)}
                        disabled={processingId === session.id}
                      >
                        {processingId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 ml-1" />
                            {language === 'ar' ? 'موافقة' : 'Approve'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setRejectDialogOpen(true);
                        }}
                        disabled={processingId === session.id}
                      >
                        <X className="w-4 h-4 ml-1" />
                        {language === 'ar' ? 'رفض' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Sessions List */}
          <h3 className="font-semibold mb-3">
            {language === 'ar' ? 'جميع الجلسات' : 'All Sessions'}
          </h3>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد جلسات حالياً' : 'No sessions available'}
                </p>
              </div>
            ) : (
              sessions.filter(s => s.approval_status !== 'pending').slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    session.status === 'live' && session.approval_status === 'approved' 
                      ? 'border-red-500/50 bg-red-500/5' 
                      : session.approval_status === 'rejected'
                      ? 'border-red-300/50 bg-red-50/5 opacity-60'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      session.status === 'live' ? 'bg-red-500/20' : 
                      session.approval_status === 'rejected' ? 'bg-red-300/20' :
                      'bg-dal-orange/20'
                    }`}>
                      {session.status === 'live' ? (
                        <Video className="w-5 h-5 text-red-500" />
                      ) : (
                        <Coffee className="w-5 h-5 text-dal-orange" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {language === 'ar' ? session.title_ar || session.title : session.title}
                        </p>
                        {getStatusBadge(session.status)}
                        {getApprovalBadge(session.approval_status)}
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
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {session.max_participants}
                        </span>
                      </div>
                      {session.admin_notes && (
                        <p className="text-xs text-red-500 mt-1">
                          {language === 'ar' ? 'ملاحظة: ' : 'Note: '}{session.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/cupping-live">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View All Link */}
          {sessions.length > 10 && (
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'رفض الجلسة' : 'Reject Session'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'ar' 
                ? 'يمكنك إضافة ملاحظة توضح سبب الرفض (اختياري):'
                : 'You can add a note explaining the rejection reason (optional):'}
            </p>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={language === 'ar' ? 'سبب الرفض...' : 'Rejection reason...'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processingId === selectedSession?.id}
            >
              {processingId === selectedSession?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                language === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveSessionsManager;
