import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Gauge, 
  Truck, 
  CheckCircle2,
  Radio,
  Thermometer
} from "lucide-react";

interface GPSData {
  latitude: number;
  longitude: number;
  speed: number; // km/h
  distance: number; // km
  eta: number; // minutes
  lastUpdate: Date;
  status: 'preparing' | 'in_transit' | 'nearby' | 'arrived';
}

interface LiveGPSTrackerProps {
  orderId: string;
  destinationLat?: number;
  destinationLng?: number;
  onArrival?: () => void;
}

const LiveGPSTracker = ({ 
  orderId, 
  destinationLat = 24.7136, 
  destinationLng = 46.6753,
  onArrival 
}: LiveGPSTrackerProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [gpsData, setGpsData] = useState<GPSData>({
    latitude: 24.7000,
    longitude: 46.6500,
    speed: 0,
    distance: 5.2,
    eta: 8,
    lastUpdate: new Date(),
    status: 'preparing'
  });
  
  const [isLive, setIsLive] = useState(true);

  // Simulate GPS updates (in production, this would be real GPS data)
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setGpsData(prev => {
        const newDistance = Math.max(0, prev.distance - (prev.speed / 60 / 60 * 5)); // Update every 5 seconds
        const newSpeed = prev.status === 'in_transit' ? 35 + Math.random() * 20 : 0;
        const newEta = newSpeed > 0 ? Math.ceil((newDistance / newSpeed) * 60) : prev.eta;
        
        let newStatus = prev.status;
        if (newDistance <= 0.1) {
          newStatus = 'arrived';
          if (onArrival) onArrival();
        } else if (newDistance <= 0.5) {
          newStatus = 'nearby';
        } else if (newSpeed > 0) {
          newStatus = 'in_transit';
        }

        return {
          ...prev,
          latitude: prev.latitude + (Math.random() - 0.5) * 0.001,
          longitude: prev.longitude + (Math.random() - 0.5) * 0.001,
          speed: newSpeed,
          distance: newDistance,
          eta: newEta,
          lastUpdate: new Date(),
          status: newStatus
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive, onArrival]);

  const getStatusConfig = (status: GPSData['status']) => {
    const configs = {
      preparing: {
        label: isArabic ? 'جاري التحضير' : 'Preparing',
        color: 'bg-fivehub-gold',
        icon: Clock,
        progress: 25
      },
      in_transit: {
        label: isArabic ? 'في الطريق' : 'In Transit',
        color: 'bg-info',
        icon: Truck,
        progress: 50
      },
      nearby: {
        label: isArabic ? 'قريب جداً' : 'Nearby',
        color: 'bg-fivehub-orange',
        icon: MapPin,
        progress: 85
      },
      arrived: {
        label: isArabic ? 'تم الوصول' : 'Arrived',
        color: 'bg-success',
        icon: CheckCircle2,
        progress: 100
      }
    };
    return configs[status];
  };

  const statusConfig = getStatusConfig(gpsData.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-fivehub-gold/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary animate-pulse" />
            {isArabic ? 'التتبع الحي' : 'Live Tracking'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="outline" className="bg-success/10 text-success border-success animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                {isArabic ? 'مباشر' : 'Live'}
              </Badge>
            )}
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Live Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Distance */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-info" />
            <div className="text-2xl font-bold text-info">
              {gpsData.distance.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? 'كم' : 'KM'}
            </div>
          </div>

          {/* Speed */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-fivehub-orange/10 to-fivehub-orange/5 border border-fivehub-orange/20">
            <Gauge className="w-6 h-6 mx-auto mb-2 text-fivehub-orange" />
            <div className="text-2xl font-bold text-fivehub-orange">
              {Math.round(gpsData.speed)}
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? 'كم/س' : 'KPH'}
            </div>
          </div>

          {/* ETA */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <Clock className="w-6 h-6 mx-auto mb-2 text-success" />
            <div className="text-2xl font-bold text-success">
              {gpsData.eta}
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? 'دقيقة' : 'MIN'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? 'التقدم' : 'Progress'}
            </span>
            <span className="font-medium">{statusConfig.progress}%</span>
          </div>
          <Progress value={statusConfig.progress} className="h-3" />
        </div>

        {/* Coordinates Display */}
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">LAT: </span>
              <span className="text-primary font-medium">
                {gpsData.latitude.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">LNG: </span>
              <span className="text-primary font-medium">
                {gpsData.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Radio className="w-3 h-3 animate-pulse text-success" />
          {isArabic ? 'آخر تحديث: ' : 'Last update: '}
          {gpsData.lastUpdate.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveGPSTracker;
