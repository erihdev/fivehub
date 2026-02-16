import { Volume2, Play, Check, Volume1, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useNotificationSound, NOTIFICATION_TONES, NotificationTone } from '@/hooks/useNotificationSound';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export const NotificationToneSelector = () => {
  const { 
    isSoundEnabled, 
    selectedTone, 
    volume, 
    toggleSound, 
    changeTone, 
    changeVolume, 
    previewTone 
  } = useNotificationSound();
  const { language, dir } = useLanguage();
  
  const isArabic = language === 'ar';
  const isRtl = dir === 'rtl';

  const handleSelectTone = (tone: NotificationTone) => {
    changeTone(tone);
    previewTone(tone);
  };

  const handleVolumeChange = (values: number[]) => {
    changeVolume(values[0]);
  };

  const handleVolumePreview = () => {
    previewTone(selectedTone);
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const getVolumeLabel = () => {
    const percentage = Math.round(volume * 100);
    if (percentage === 0) return isArabic ? 'صامت' : 'Muted';
    if (percentage <= 30) return isArabic ? 'منخفض' : 'Low';
    if (percentage <= 70) return isArabic ? 'متوسط' : 'Medium';
    return isArabic ? 'مرتفع' : 'High';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isArabic ? 'نغمة الإشعارات' : 'Notification Tone'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'اختر نغمة الإشعارات المفضلة لديك' : 'Choose your preferred notification tone'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant={isSoundEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSound}
          >
            {isSoundEnabled 
              ? (isArabic ? 'مفعّل' : 'Enabled')
              : (isArabic ? 'معطّل' : 'Disabled')
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Control */}
        <div className={cn(
          "p-4 rounded-xl border bg-muted/30",
          !isSoundEnabled && "opacity-50"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getVolumeIcon()}
              <span className="text-sm font-medium">
                {isArabic ? 'مستوى الصوت' : 'Volume Level'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {getVolumeLabel()} ({Math.round(volume * 100)}%)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolumePreview}
                disabled={!isSoundEnabled}
                className="h-8 px-2"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <VolumeX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              onValueCommit={handleVolumePreview}
              min={0}
              max={1}
              step={0.05}
              disabled={!isSoundEnabled}
              className="flex-1"
            />
            <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </div>

        {/* Tone Selection Grid */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            {isArabic ? 'اختر النغمة' : 'Select Tone'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NOTIFICATION_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => handleSelectTone(tone.id)}
                disabled={!isSoundEnabled}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all duration-200",
                  "flex flex-col items-center gap-2 group",
                  "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedTone === tone.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
              >
                {/* Selected indicator */}
                {selectedTone === tone.id && (
                  <div className={cn(
                    "absolute top-2 bg-primary text-primary-foreground rounded-full p-0.5",
                    isRtl ? "left-2" : "right-2"
                  )}>
                    <Check className="w-3 h-3" />
                  </div>
                )}
                
                {/* Play button overlay */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  selectedTone === tone.id
                    ? "bg-primary/20"
                    : "bg-muted group-hover:bg-primary/10"
                )}>
                  <Play className={cn(
                    "w-5 h-5 transition-colors",
                    selectedTone === tone.id ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                </div>
                
                {/* Tone name */}
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  selectedTone === tone.id ? "text-primary" : "text-foreground"
                )}>
                  {isArabic ? tone.nameAr : tone.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {!isSoundEnabled && (
          <p className="text-sm text-muted-foreground text-center">
            {isArabic 
              ? 'فعّل الصوت لاختيار نغمة الإشعارات وضبط مستوى الصوت'
              : 'Enable sound to select a notification tone and adjust volume'
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationToneSelector;