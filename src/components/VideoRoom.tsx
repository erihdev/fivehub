import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { useSessionRecording } from '@/hooks/useSessionRecording';
import SessionChat from '@/components/SessionChat';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  Users, MessageCircle, Circle, Square
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoRoomProps {
  roomId: string;
  sessionTitle: string;
  isHost: boolean;
  onLeave: () => void;
}

interface Participant {
  id: string;
  stream: MediaStream | null;
  name: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

const VideoRoom = ({ roomId, sessionTitle, isHost, onLeave }: VideoRoomProps) => {
  const { language } = useLanguage();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { isRecording, formattedTime, startRecording, stopRecording } = useSessionRecording({
    sessionId: roomId,
    stream: localStream,
    language
  });

  useEffect(() => {
    startLocalMedia();
    
    return () => {
      stopLocalMedia();
    };
  }, []);

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add self as participant
      setParticipants([{
        id: 'local',
        stream,
        name: language === 'ar' ? 'أنت' : 'You',
        isVideoOn: true,
        isAudioOn: true,
      }]);

      toast.success(language === 'ar' ? 'تم تفعيل الكاميرا والميكروفون' : 'Camera and microphone enabled');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error(language === 'ar' ? 'لا يمكن الوصول للكاميرا أو الميكروفون' : 'Cannot access camera or microphone');
    }
  };

  const stopLocalMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const handleLeave = () => {
    stopLocalMedia();
    onLeave();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="animate-pulse">
              <Video className="w-3 h-3 mr-1" />
              {language === 'ar' ? 'مباشر' : 'LIVE'}
            </Badge>
            <h2 className="font-semibold text-lg">{sessionTitle}</h2>
            {isRecording && (
              <Badge variant="destructive" className="gap-1">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                {formattedTime}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Users className="w-3 h-3 mr-1" />
              {participants.length}
            </Badge>
            {isHost && (
              <Badge variant="default">
                {language === 'ar' ? 'المضيف' : 'Host'}
              </Badge>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={`grid gap-4 h-full ${
            participants.length === 1 ? 'grid-cols-1' :
            participants.length <= 4 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {/* Local Video */}
            <Card className="relative overflow-hidden bg-muted aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <Badge variant="secondary" className="bg-background/80">
                  {language === 'ar' ? 'أنت' : 'You'}
                  {isHost && ` (${language === 'ar' ? 'المضيف' : 'Host'})`}
                </Badge>
                <div className="flex gap-1">
                  {!isAudioOn && <MicOff className="w-4 h-4 text-destructive" />}
                  {!isVideoOn && <VideoOff className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            </Card>

            {/* Placeholder for other participants */}
            {participants.length === 1 && !isChatOpen && (
              <Card className="relative overflow-hidden bg-muted/50 aspect-video flex items-center justify-center border-dashed">
                <div className="text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{language === 'ar' ? 'في انتظار المشاركين...' : 'Waiting for participants...'}</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t bg-card">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={isAudioOn ? 'secondary' : 'destructive'}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={toggleAudio}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'destructive'}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            {isHost && (
              <Button
                variant={isRecording ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={handleLeave}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>

            <Button
              variant={isChatOpen ? 'default' : 'outline'}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div className="w-80 border-s border-border">
          <SessionChat sessionId={roomId} isOpen={isChatOpen} />
        </div>
      )}
    </div>
  );
};

export default VideoRoom;
