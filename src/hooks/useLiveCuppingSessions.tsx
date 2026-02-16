import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

export interface LiveCuppingSession {
  id: string;
  host_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  coffee_name: string | null;
  coffee_origin: string | null;
  scheduled_at: string;
  duration_minutes: number;
  max_participants: number;
  status: 'upcoming' | 'live' | 'ended' | 'cancelled';
  thumbnail_url: string | null;
  room_id: string | null;
  created_at: string;
  participants_count?: number;
  is_registered?: boolean;
  host_name?: string;
}

export const useLiveCuppingSessions = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<LiveCuppingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('live_cupping_sessions')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('scheduled_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch participants count for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          // Check if current user is registered
          let isRegistered = false;
          if (user) {
            const { data: registration } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', session.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isRegistered = !!registration;
          }

          // Get host name from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', session.host_id)
            .maybeSingle();

          return {
            ...session,
            status: session.status as 'upcoming' | 'live' | 'ended' | 'cancelled',
            participants_count: count || 0,
            is_registered: isRegistered,
            host_name: profile?.full_name || (language === 'ar' ? 'مستخدم' : 'User'),
          };
        })
      );

      setSessions(sessionsWithCounts as LiveCuppingSession[]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل الجلسات' : 'Error loading sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async (sessionData: {
    title: string;
    description?: string;
    coffee_name?: string;
    coffee_origin?: string;
    scheduled_at: string;
    duration_minutes?: number;
    max_participants?: number;
  }) => {
    if (!user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('live_cupping_sessions')
        .insert({
          host_id: user.id,
          title: sessionData.title,
          title_ar: sessionData.title,
          description: sessionData.description,
          description_ar: sessionData.description,
          coffee_name: sessionData.coffee_name,
          coffee_origin: sessionData.coffee_origin,
          scheduled_at: sessionData.scheduled_at,
          duration_minutes: sessionData.duration_minutes || 45,
          max_participants: sessionData.max_participants || 20,
          room_id: `room-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إنشاء الجلسة بنجاح!' : 'Session created successfully!');
      await fetchSessions();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(language === 'ar' ? 'خطأ في إنشاء الجلسة' : 'Error creating session');
      return null;
    }
  };

  const registerForSession = async (sessionId: string) => {
    if (!user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return false;
    }

    try {
      const { error } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم التسجيل بنجاح!' : 'Successfully registered!');
      await fetchSessions();
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info(language === 'ar' ? 'أنت مسجل بالفعل' : 'Already registered');
      } else {
        console.error('Error registering:', error);
        toast.error(language === 'ar' ? 'خطأ في التسجيل' : 'Error registering');
      }
      return false;
    }
  };

  const unregisterFromSession = async (sessionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إلغاء التسجيل' : 'Registration cancelled');
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error unregistering:', error);
      toast.error(language === 'ar' ? 'خطأ في إلغاء التسجيل' : 'Error unregistering');
      return false;
    }
  };

  const startSession = async (sessionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('live_cupping_sessions')
        .update({ status: 'live' })
        .eq('id', sessionId)
        .eq('host_id', user.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'بدأت الجلسة!' : 'Session started!');
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error(language === 'ar' ? 'خطأ في بدء الجلسة' : 'Error starting session');
      return false;
    }
  };

  const endSession = async (sessionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('live_cupping_sessions')
        .update({ status: 'ended' })
        .eq('id', sessionId)
        .eq('host_id', user.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'انتهت الجلسة' : 'Session ended');
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error(language === 'ar' ? 'خطأ في إنهاء الجلسة' : 'Error ending session');
      return false;
    }
  };

  const joinSession = async (sessionId: string) => {
    if (!user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return null;
    }

    try {
      // Update participant status
      await supabase
        .from('session_participants')
        .update({ 
          joined_at: new Date().toISOString(),
          is_active: true 
        })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      // Get RTC config
      const { data, error } = await supabase.functions.invoke('cupping-session-rtc', {
        body: { sessionId, userId: user.id }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error(language === 'ar' ? 'خطأ في الانضمام للجلسة' : 'Error joining session');
      return null;
    }
  };

  const leaveSession = async (sessionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('session_participants')
        .update({ 
          left_at: new Date().toISOString(),
          is_active: false 
        })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-cupping-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_cupping_sessions' },
        () => fetchSessions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    sessions,
    isLoading,
    createSession,
    registerForSession,
    unregisterFromSession,
    startSession,
    endSession,
    joinSession,
    leaveSession,
    refetch: fetchSessions,
  };
};
