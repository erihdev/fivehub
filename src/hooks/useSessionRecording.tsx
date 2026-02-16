import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseSessionRecordingProps {
  sessionId: string;
  stream: MediaStream | null;
  language: string;
}

export const useSessionRecording = ({ sessionId, stream, language }: UseSessionRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    if (!stream) {
      toast.error(language === 'ar' ? 'لا يوجد بث للتسجيل' : 'No stream to record');
      return;
    }

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        await saveRecording(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setIsRecording(true);
      toast.success(language === 'ar' ? 'بدأ التسجيل' : 'Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(language === 'ar' ? 'فشل بدء التسجيل' : 'Failed to start recording');
    }
  }, [stream, language, sessionId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsRecording(false);
      setRecordingTime(0);
    }
  }, [isRecording]);

  const saveRecording = async (blob: Blob) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${sessionId}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      await supabase.from('session_recordings').insert({
        session_id: sessionId,
        recorded_by: user.id,
        file_path: fileName,
        file_size: blob.size,
        duration_seconds: duration
      });

      toast.success(language === 'ar' ? 'تم حفظ التسجيل بنجاح' : 'Recording saved successfully');
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error(language === 'ar' ? 'فشل حفظ التسجيل' : 'Failed to save recording');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    startRecording,
    stopRecording
  };
};
