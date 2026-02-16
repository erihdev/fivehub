import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface TaskSetting {
  id: string;
  task_name: string;
  is_enabled: boolean;
  push_on_failure: boolean;
}

interface ScheduledTask {
  name: string;
  schedule: string;
  description: string;
  type: 'report' | 'check' | 'notification';
}

const DEFAULT_TASKS: ScheduledTask[] = [
  { name: 'weekly-success-rate-report', schedule: '0 9 * * 0', description: '', type: 'report' },
  { name: 'weekly-commission-report', schedule: '0 9 * * 0', description: '', type: 'report' },
  { name: 'scheduled-commission-report', schedule: '0 * * * *', description: '', type: 'check' },
  { name: 'daily-performance-summary', schedule: '0 9 * * *', description: '', type: 'report' },
  { name: 'scheduled-smart-check', schedule: '0 * * * *', description: '', type: 'check' },
  { name: 'weekly-smart-report', schedule: '0 9 * * 0', description: '', type: 'report' },
  { name: 'daily-favorite-offers-summary', schedule: '0 9 * * *', description: '', type: 'notification' },
  { name: 'weekly-favorite-offers-summary', schedule: '0 9 * * 0', description: '', type: 'notification' },
];

export const useScheduledTaskSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showNotification, isGranted } = usePushNotifications();
  
  const [taskSettings, setTaskSettings] = useState<TaskSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch task settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_task_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Merge with defaults for tasks that don't have settings yet
      const existingTaskNames = new Set(data?.map(s => s.task_name) || []);
      const defaultSettings: TaskSetting[] = DEFAULT_TASKS
        .filter(t => !existingTaskNames.has(t.name))
        .map(t => ({
          id: '',
          task_name: t.name,
          is_enabled: true,
          push_on_failure: true,
        }));

      setTaskSettings([...(data || []), ...defaultSettings]);
    } catch (error) {
      console.error('Error fetching task settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Toggle task enabled status
  const toggleTaskEnabled = async (taskName: string, enabled: boolean) => {
    if (!user) return;

    try {
      const existingSetting = taskSettings.find(s => s.task_name === taskName && s.id);
      
      if (existingSetting?.id) {
        const { error } = await supabase
          .from('scheduled_task_settings')
          .update({ is_enabled: enabled })
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_task_settings')
          .insert({
            user_id: user.id,
            task_name: taskName,
            is_enabled: enabled,
            push_on_failure: true,
          });

        if (error) throw error;
      }

      setTaskSettings(prev => 
        prev.map(s => s.task_name === taskName ? { ...s, is_enabled: enabled } : s)
      );

      toast({
        title: enabled ? 'تم التفعيل' : 'تم الإيقاف',
        description: `تم ${enabled ? 'تفعيل' : 'إيقاف'} المهمة بنجاح`,
      });
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة المهمة',
        variant: 'destructive',
      });
    }
  };

  // Toggle push on failure
  const togglePushOnFailure = async (taskName: string, enabled: boolean) => {
    if (!user) return;

    try {
      const existingSetting = taskSettings.find(s => s.task_name === taskName && s.id);
      
      if (existingSetting?.id) {
        const { error } = await supabase
          .from('scheduled_task_settings')
          .update({ push_on_failure: enabled })
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_task_settings')
          .insert({
            user_id: user.id,
            task_name: taskName,
            is_enabled: true,
            push_on_failure: enabled,
          });

        if (error) throw error;
      }

      setTaskSettings(prev => 
        prev.map(s => s.task_name === taskName ? { ...s, push_on_failure: enabled } : s)
      );

      toast({
        title: enabled ? 'تم التفعيل' : 'تم الإيقاف',
        description: `تم ${enabled ? 'تفعيل' : 'إيقاف'} إشعارات الفشل للمهمة`,
      });
    } catch (error) {
      console.error('Error toggling push on failure:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث إعدادات الإشعارات',
        variant: 'destructive',
      });
    }
  };

  // Send failure notification
  const sendFailureNotification = async (taskName: string, errorMessage: string) => {
    const setting = taskSettings.find(s => s.task_name === taskName);
    
    if (!setting?.push_on_failure || !isGranted) return;

    await showNotification('فشل في تنفيذ المهمة المجدولة', {
      body: `فشلت المهمة "${taskName}": ${errorMessage}`,
      tag: `task-failure-${taskName}`,
      url: '/scheduled-tasks-monitor',
    });
  };

  // Get task setting by name
  const getTaskSetting = (taskName: string): TaskSetting | undefined => {
    return taskSettings.find(s => s.task_name === taskName);
  };

  // Check if task is enabled
  const isTaskEnabled = (taskName: string): boolean => {
    const setting = taskSettings.find(s => s.task_name === taskName);
    return setting?.is_enabled ?? true;
  };

  return {
    taskSettings,
    isLoading,
    toggleTaskEnabled,
    togglePushOnFailure,
    sendFailureNotification,
    getTaskSetting,
    isTaskEnabled,
    refetch: fetchSettings,
  };
};
