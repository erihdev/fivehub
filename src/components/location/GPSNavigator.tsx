import { useGPS } from '@/hooks/useGPS';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * مكون GPS Navigator
 * يعرض الموقع الحالي مع خريطة تفاعلية
 */

export function GPSNavigator() {
    const { toast } = useToast();

    const {
        position,
        error,
        loading,
        supported,
        getCurrentPosition,
        getDistanceTo,
    } = useGPS({
        enableHighAccuracy: true,
        watch: false, // يمكن تفعيل التتبع المستمر
        onSuccess: (pos) => {
            toast({
                title: 'تم تحديد الموقع',
                description: `الدقة: ${Math.round(pos.accuracy)} متر`,
            });
        },
        onError: (err) => {
            toast({
                title: 'خطأ في تحديد الموقع',
                description: err.message,
                variant: 'destructive',
            });
        },
    });

    if (!supported) {
        return (
            <Card className="p-6 glass-effect">
                <div className="flex items-center gap-3 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                    <div>
                        <h3 className="font-semibold">GPS غير مدعوم</h3>
                        <p className="text-sm text-muted-foreground">
                            متصفحك لا يدعم خدمات تحديد الموقع
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 glass-effect space-y-4 animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-gradient-accent">
                        <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">موقعك الحالي</h2>
                        <p className="text-sm text-muted-foreground">
                            GPS عالي الدقة
                        </p>
                    </div>
                </div>

                <Button
                    onClick={getCurrentPosition}
                    disabled={loading}
                    className="hover-scale"
                >
                    {loading ? (
                        <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري التحديد...
                        </>
                    ) : (
                        <>
                            <Navigation className="ml-2 h-4 w-4" />
                            تحديد الموقع
                        </>
                    )}
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <div>
                            <p className="font-semibold">فشل في تحديد الموقع</p>
                            <p className="text-sm">{error.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Position Data */}
            {position && (
                <div className="space-y-3">
                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground mb-1">خط العرض</p>
                            <p className="text-lg font-mono font-semibold">
                                {position.latitude.toFixed(6)}°
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground mb-1">خط الطول</p>
                            <p className="text-lg font-mono font-semibold">
                                {position.longitude.toFixed(6)}°
                            </p>
                        </div>
                    </div>

                    {/* Accuracy */}
                    <div className="p-4 rounded-lg border glass-effect">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">دقة الموقع</p>
                                <p className="text-2xl font-bold text-gradient-premium">
                                    {Math.round(position.accuracy)} متر
                                </p>
                            </div>
                            <div className={`h-3 w-3 rounded-full ${position.accuracy < 10 ? 'bg-green-500' :
                                    position.accuracy < 50 ? 'bg-yellow-500' :
                                        'bg-orange-500'
                                } animate-pulse`} />
                        </div>
                    </div>

                    {/* Additional Data */}
                    {(position.altitude !== null || position.speed !== null) && (
                        <div className="grid grid-cols-2 gap-3">
                            {position.altitude !== null && (
                                <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                                    <p className="text-xs text-muted-foreground">الارتفاع</p>
                                    <p className="text-base font-semibold">
                                        {Math.round(position.altitude)} م
                                    </p>
                                </div>
                            )}
                            {position.speed !== null && (
                                <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                                    <p className="text-xs text-muted-foreground">السرعة</p>
                                    <p className="text-base font-semibold">
                                        {Math.round(position.speed * 3.6)} كم/س
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Map Preview - يمكن إضافة خريطة حقيقية لاحقاً */}
                    <div className="aspect-video rounded-lg bg-gradient-card border overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="h-12 w-12 mx-auto mb-2 text-primary" />
                                <p className="text-sm text-muted-foreground">
                                    يمكن إضافة خريطة Google Maps هنا
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                const url = `https://www.google.com/maps?q=${position.latitude},${position.longitude}`;
                                window.open(url, '_blank');
                            }}
                        >
                            فتح في خرائط Google
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    `${position.latitude}, ${position.longitude}`
                                );
                                toast({
                                    title: 'تم النسخ',
                                    description: 'تم نسخ الإحداثيات',
                                });
                            }}
                        >
                            نسخ الإحداثيات
                        </Button>
                    </div>
                </div>
            )}

            {/* Info */}
            {!position && !error && !loading && (
                <div className="text-center py-8">
                    <Navigation className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        اضغط على "تحديد الموقع" للحصول على موقعك الحالي
                    </p>
                </div>
            )}
        </Card>
    );
}
