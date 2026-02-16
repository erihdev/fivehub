import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Coffee, Plus, RotateCcw, Save, Loader2, Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import StatsWidget from '@/components/dashboard/widgets/StatsWidget';
import LowStockWidget from '@/components/dashboard/widgets/LowStockWidget';
import RecentOrdersWidget from '@/components/dashboard/widgets/RecentOrdersWidget';
import QuickActionsWidget from '@/components/dashboard/widgets/QuickActionsWidget';
import PerformanceWidget from '@/components/dashboard/widgets/PerformanceWidget';
import MessagesWidget from '@/components/dashboard/widgets/MessagesWidget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart3,
  AlertTriangle,
  ShoppingCart,
  Zap,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

interface WidgetConfig {
  id: string;
  type: string;
  title: { ar: string; en: string };
  icon: any;
  isExpanded: boolean;
  isVisible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', type: 'stats', title: { ar: 'الإحصائيات', en: 'Statistics' }, icon: BarChart3, isExpanded: false, isVisible: true },
  { id: 'quick-actions', type: 'quick-actions', title: { ar: 'إجراءات سريعة', en: 'Quick Actions' }, icon: Zap, isExpanded: false, isVisible: true },
  { id: 'low-stock', type: 'low-stock', title: { ar: 'مخزون منخفض', en: 'Low Stock' }, icon: AlertTriangle, isExpanded: false, isVisible: true },
  { id: 'recent-orders', type: 'recent-orders', title: { ar: 'الطلبات الأخيرة', en: 'Recent Orders' }, icon: ShoppingCart, isExpanded: false, isVisible: true },
  { id: 'performance', type: 'performance', title: { ar: 'الأداء', en: 'Performance' }, icon: TrendingUp, isExpanded: false, isVisible: true },
  { id: 'messages', type: 'messages', title: { ar: 'الرسائل', en: 'Messages' }, icon: MessageSquare, isExpanded: false, isVisible: true },
];

const CustomDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isArabic = language === 'ar';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const loadLayout = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('layout')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.layout && Array.isArray(data.layout)) {
        const savedLayout = data.layout as unknown as WidgetConfig[];
        // Merge saved layout with default widgets to handle new widgets
        const mergedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
          const savedWidget = savedLayout.find(w => w.id === defaultWidget.id);
          return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
        });
        setWidgets(mergedWidgets);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const saveLayout = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const layoutData = widgets.map(({ id, type, isExpanded, isVisible }) => ({
        id,
        type,
        isExpanded,
        isVisible,
      }));

      const { error } = await supabase
        .from('dashboard_layouts')
        .upsert({
          user_id: user.id,
          layout: layoutData,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: isArabic ? 'تم الحفظ' : 'Saved',
        description: isArabic ? 'تم حفظ تخطيط لوحة التحكم' : 'Dashboard layout saved',
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل حفظ التخطيط' : 'Failed to save layout',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetLayout = () => {
    setWidgets(DEFAULT_WIDGETS);
    setHasChanges(true);
    toast({
      title: isArabic ? 'تم إعادة التعيين' : 'Reset',
      description: isArabic ? 'تم إعادة تعيين التخطيط الافتراضي' : 'Default layout restored',
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newWidgets = Array.from(widgets);
    const [reorderedItem] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, reorderedItem);

    setWidgets(newWidgets);
    setHasChanges(true);
  };

  const toggleWidgetExpand = (widgetId: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === widgetId ? { ...w, isExpanded: !w.isExpanded } : w))
    );
    setHasChanges(true);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w))
    );
    setHasChanges(true);
  };

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'stats':
        return <StatsWidget />;
      case 'low-stock':
        return <LowStockWidget />;
      case 'recent-orders':
        return <RecentOrdersWidget />;
      case 'quick-actions':
        return <QuickActionsWidget />;
      case 'performance':
        return <PerformanceWidget />;
      case 'messages':
        return <MessagesWidget />;
      default:
        return null;
    }
  };

  const visibleWidgets = widgets.filter(w => w.isVisible);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">
              {isArabic ? 'لوحة التحكم المخصصة' : 'Custom Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? 'اسحب وأفلت الـ widgets لتخصيص لوحة التحكم'
                : 'Drag and drop widgets to customize your dashboard'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 me-1" />
                  {isArabic ? 'إدارة Widgets' : 'Manage Widgets'}
                </Button>
              </DialogTrigger>
              <DialogContent dir={dir}>
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? 'إظهار/إخفاء Widgets' : 'Show/Hide Widgets'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {widgets.map(widget => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <widget.icon className="w-5 h-5 text-coffee-gold" />
                        <span className="font-medium">
                          {widget.title[isArabic ? 'ar' : 'en']}
                        </span>
                      </div>
                      <Checkbox
                        checked={widget.isVisible}
                        onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                      />
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={resetLayout}>
              <RotateCcw className="w-4 h-4 me-1" />
              {isArabic ? 'إعادة تعيين' : 'Reset'}
            </Button>
            <Button
              size="sm"
              onClick={saveLayout}
              disabled={!hasChanges || isSaving}
              className={hasChanges ? 'bg-coffee-gold hover:bg-coffee-gold/90' : ''}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 me-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 me-1" />
              )}
              {isArabic ? 'حفظ التخطيط' : 'Save Layout'}
            </Button>
          </div>
        </div>

        {/* Widgets Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="widgets" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {visibleWidgets.map((widget, index) => (
                  <Draggable key={widget.id} draggableId={widget.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          widget.isExpanded ? 'md:col-span-2' : ''
                        } ${snapshot.isDragging ? 'z-50' : ''}`}
                      >
                        <DashboardWidget
                          id={widget.id}
                          title={widget.title[isArabic ? 'ar' : 'en']}
                          icon={<widget.icon className="w-4 h-4 text-coffee-gold" />}
                          isExpanded={widget.isExpanded}
                          onToggleExpand={toggleWidgetExpand}
                          onRemove={toggleWidgetVisibility}
                          dragHandleProps={provided.dragHandleProps}
                        >
                          {renderWidgetContent(widget)}
                        </DashboardWidget>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {visibleWidgets.length === 0 && (
          <div className="text-center py-12">
            <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {isArabic
                ? 'لم تقم بإضافة أي widgets. اضغط على "إدارة Widgets" لإضافة البعض.'
                : 'No widgets added. Click "Manage Widgets" to add some.'}
            </p>
            <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isArabic ? 'إضافة Widgets' : 'Add Widgets'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CustomDashboard;
