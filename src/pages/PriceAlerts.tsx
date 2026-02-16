import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Trash2, ArrowDown, ArrowUp, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const PriceAlerts = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const { alerts, loading, toggleAlert, deleteAlert, refetch } = usePriceAlerts();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'below':
        return <ArrowDown className="h-4 w-4 text-success" />;
      case 'above':
        return <ArrowUp className="h-4 w-4 text-destructive" />;
      default:
        return <RefreshCw className="h-4 w-4 text-info" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    if (language === 'ar') {
      switch (type) {
        case 'below':
          return 'انخفاض السعر';
        case 'above':
          return 'ارتفاع السعر';
        default:
          return 'أي تغيير';
      }
    }
    switch (type) {
      case 'below':
        return 'Price Drop';
      case 'above':
        return 'Price Increase';
      default:
        return 'Any Change';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6 text-warning" />
          <h1 className="text-xl font-bold">
            {language === 'ar' ? 'تنبيهات الأسعار' : 'Price Alerts'}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {language === 'ar' ? 'تنبيهاتي' : 'My Alerts'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'إدارة تنبيهات الأسعار الخاصة بك' 
                : 'Manage your price alerts'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}</p>
                <p className="text-sm mt-2">
                  {language === 'ar' 
                    ? 'أضف تنبيهات من صفحة البحث أو تفاصيل القهوة' 
                    : 'Add alerts from search or coffee details page'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        {getAlertTypeIcon(alert.alert_type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{alert.coffee?.name || 'Unknown'}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{alert.coffee?.origin || ''}</span>
                          {alert.coffee?.supplier && (
                            <>
                              <span>•</span>
                              <span>{alert.coffee.supplier.name}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                          {alert.alert_type !== 'any_change' && (
                            <span className="text-sm font-medium">
                              ${alert.target_price}
                            </span>
                          )}
                          {alert.coffee?.price && (
                            <span className="text-xs text-muted-foreground">
                              ({language === 'ar' ? 'الحالي: ' : 'Current: '}${alert.coffee.price})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={alert.is_active}
                        onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PriceAlerts;
