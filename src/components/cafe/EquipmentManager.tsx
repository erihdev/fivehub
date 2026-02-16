import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, differenceInDays, addDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Wrench, Plus, AlertTriangle, CheckCircle, Clock,
  Calendar, Loader2, Settings, Bell, History,
  Phone, XCircle, Cog
} from 'lucide-react';

interface Equipment {
  id: string;
  cafe_id: string;
  name: string;
  name_ar: string | null;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_until: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  task_name: string;
  task_name_ar: string | null;
  description: string | null;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  reminder_days_before: number;
  is_critical: boolean;
  equipment_name?: string;
}

interface ServiceRequest {
  id: string;
  equipment_id: string;
  cafe_id: string;
  maintenance_provider_id: string | null;
  issue_title: string;
  issue_description: string | null;
  urgency: string;
  status: string;
  estimated_cost: number | null;
  final_cost: number | null;
  scheduled_visit_at: string | null;
  completed_at: string | null;
  created_at: string;
  equipment_name?: string;
}

const EQUIPMENT_TYPES = [
  { value: 'espresso_machine', en: 'Espresso Machine', ar: 'ماكينة إسبريسو' },
  { value: 'grinder', en: 'Coffee Grinder', ar: 'مطحنة قهوة' },
  { value: 'water_filter', en: 'Water Filter', ar: 'فلتر مياه' },
  { value: 'refrigerator', en: 'Refrigerator', ar: 'ثلاجة' },
  { value: 'ice_machine', en: 'Ice Machine', ar: 'ماكينة ثلج' },
  { value: 'blender', en: 'Blender', ar: 'خلاط' },
  { value: 'pos_system', en: 'POS System', ar: 'نظام نقاط البيع' },
  { value: 'other', en: 'Other', ar: 'أخرى' }
];

const EquipmentManager = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === 'ar';
  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Form states
  const [equipmentForm, setEquipmentForm] = useState({
    name: '', name_ar: '', equipment_type: 'espresso_machine',
    brand: '', model: '', serial_number: '',
    purchase_date: '', warranty_until: '', notes: ''
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    equipment_id: '', task_name: '', task_name_ar: '',
    description: '', frequency_days: '30', reminder_days_before: '3',
    is_critical: false
  });
  
  const [serviceForm, setServiceForm] = useState({
    equipment_id: '', issue_title: '', issue_description: '',
    urgency: 'medium'
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch equipment
      const { data: eqData, error: eqError } = await supabase
        .from('cafe_equipment')
        .select('*')
        .eq('cafe_id', user?.id)
        .order('created_at', { ascending: false });

      if (eqError) throw eqError;
      setEquipment(eqData || []);

      // Fetch schedules with equipment names
      if (eqData && eqData.length > 0) {
        const equipmentIds = eqData.map(e => e.id);
        const { data: schData, error: schError } = await supabase
          .from('equipment_maintenance_schedules')
          .select('*')
          .in('equipment_id', equipmentIds)
          .order('next_due_at', { ascending: true });

        if (schError) throw schError;
        
        const schedulesWithNames = (schData || []).map(sch => ({
          ...sch,
          equipment_name: eqData.find(e => e.id === sch.equipment_id)?.name
        }));
        setSchedules(schedulesWithNames);
      }

      // Fetch service requests
      const { data: srData, error: srError } = await supabase
        .from('equipment_service_requests')
        .select('*')
        .eq('cafe_id', user?.id)
        .order('created_at', { ascending: false });

      if (srError) throw srError;
      
      const requestsWithNames = (srData || []).map(req => ({
        ...req,
        equipment_name: eqData?.find(e => e.id === req.equipment_id)?.name
      }));
      setServiceRequests(requestsWithNames);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(isArabic ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!equipmentForm.name || !equipmentForm.equipment_type) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('cafe_equipment')
        .insert({
          cafe_id: user?.id,
          name: equipmentForm.name,
          name_ar: equipmentForm.name_ar || null,
          equipment_type: equipmentForm.equipment_type,
          brand: equipmentForm.brand || null,
          model: equipmentForm.model || null,
          serial_number: equipmentForm.serial_number || null,
          purchase_date: equipmentForm.purchase_date || null,
          warranty_until: equipmentForm.warranty_until || null,
          notes: equipmentForm.notes || null
        });

      if (error) throw error;

      toast.success(isArabic ? 'تمت إضافة الجهاز!' : 'Equipment added!');
      setShowAddEquipment(false);
      setEquipmentForm({
        name: '', name_ar: '', equipment_type: 'espresso_machine',
        brand: '', model: '', serial_number: '',
        purchase_date: '', warranty_until: '', notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error(isArabic ? 'خطأ في إضافة الجهاز' : 'Error adding equipment');
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleForm.equipment_id || !scheduleForm.task_name || !scheduleForm.frequency_days) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const nextDue = addDays(new Date(), parseInt(scheduleForm.frequency_days));
      
      const { error } = await supabase
        .from('equipment_maintenance_schedules')
        .insert({
          equipment_id: scheduleForm.equipment_id,
          task_name: scheduleForm.task_name,
          task_name_ar: scheduleForm.task_name_ar || null,
          description: scheduleForm.description || null,
          frequency_days: parseInt(scheduleForm.frequency_days),
          reminder_days_before: parseInt(scheduleForm.reminder_days_before),
          next_due_at: nextDue.toISOString(),
          is_critical: scheduleForm.is_critical
        });

      if (error) throw error;

      toast.success(isArabic ? 'تمت إضافة جدول الصيانة!' : 'Maintenance schedule added!');
      setShowAddSchedule(false);
      setScheduleForm({
        equipment_id: '', task_name: '', task_name_ar: '',
        description: '', frequency_days: '30', reminder_days_before: '3',
        is_critical: false
      });
      fetchData();
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error(isArabic ? 'خطأ في إضافة الجدول' : 'Error adding schedule');
    }
  };

  const handleCreateServiceRequest = async () => {
    if (!serviceForm.equipment_id || !serviceForm.issue_title) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment_service_requests')
        .insert({
          equipment_id: serviceForm.equipment_id,
          cafe_id: user?.id,
          issue_title: serviceForm.issue_title,
          issue_description: serviceForm.issue_description || null,
          urgency: serviceForm.urgency
        });

      if (error) throw error;

      // Update equipment status
      await supabase
        .from('cafe_equipment')
        .update({ status: 'needs_maintenance' })
        .eq('id', serviceForm.equipment_id);

      toast.success(isArabic ? 'تم إرسال طلب الصيانة!' : 'Service request sent!');
      setShowServiceRequest(false);
      setServiceForm({
        equipment_id: '', issue_title: '', issue_description: '',
        urgency: 'medium'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating service request:', error);
      toast.error(isArabic ? 'خطأ في إنشاء الطلب' : 'Error creating request');
    }
  };

  const handleCompleteTask = async (schedule: MaintenanceSchedule) => {
    try {
      const nextDue = addDays(new Date(), schedule.frequency_days);
      
      // Update schedule
      await supabase
        .from('equipment_maintenance_schedules')
        .update({
          last_completed_at: new Date().toISOString(),
          next_due_at: nextDue.toISOString()
        })
        .eq('id', schedule.id);

      // Log completion
      await supabase
        .from('equipment_maintenance_logs')
        .insert({
          schedule_id: schedule.id,
          equipment_id: schedule.equipment_id,
          performed_at: new Date().toISOString(),
          next_scheduled_at: nextDue.toISOString()
        });

      toast.success(isArabic ? 'تم تسجيل إتمام المهمة!' : 'Task marked as complete!');
      fetchData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getEquipmentTypeLabel = (type: string) => {
    const found = EQUIPMENT_TYPES.find(t => t.value === type);
    return found ? (isArabic ? found.ar : found.en) : type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
      active: { 
        bg: 'bg-green-500/10 text-green-600', 
        icon: <CheckCircle className="w-3 h-3" />,
        label: isArabic ? 'يعمل' : 'Active'
      },
      needs_maintenance: { 
        bg: 'bg-yellow-500/10 text-yellow-600', 
        icon: <AlertTriangle className="w-3 h-3" />,
        label: isArabic ? 'يحتاج صيانة' : 'Needs Maintenance'
      },
      under_repair: { 
        bg: 'bg-blue-500/10 text-blue-600', 
        icon: <Wrench className="w-3 h-3" />,
        label: isArabic ? 'تحت الإصلاح' : 'Under Repair'
      },
      inactive: { 
        bg: 'bg-gray-500/10 text-gray-600', 
        icon: <XCircle className="w-3 h-3" />,
        label: isArabic ? 'متوقف' : 'Inactive'
      }
    };
    const style = styles[status] || styles.active;
    return (
      <Badge variant="outline" className={`gap-1 ${style.bg}`}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-500/10 text-gray-600',
      medium: 'bg-yellow-500/10 text-yellow-600',
      high: 'bg-orange-500/10 text-orange-600',
      critical: 'bg-red-500/10 text-red-600'
    };
    const labels: Record<string, string> = {
      low: isArabic ? 'منخفض' : 'Low',
      medium: isArabic ? 'متوسط' : 'Medium',
      high: isArabic ? 'عالي' : 'High',
      critical: isArabic ? 'حرج' : 'Critical'
    };
    return (
      <Badge variant="outline" className={styles[urgency]}>
        {labels[urgency]}
      </Badge>
    );
  };

  // Get upcoming tasks (due within 7 days)
  const upcomingTasks = schedules.filter(s => {
    const daysUntilDue = differenceInDays(new Date(s.next_due_at), new Date());
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  });

  // Get overdue tasks
  const overdueTasks = schedules.filter(s => {
    return new Date(s.next_due_at) < new Date();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            {isArabic ? 'إدارة المعدات والصيانة' : 'Equipment & Maintenance'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? 'تتبع معداتك وجدول الصيانة الدورية'
              : 'Track your equipment and schedule regular maintenance'}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-600">
                      {overdueTasks.length} {isArabic ? 'مهام متأخرة' : 'Overdue Tasks'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'تحتاج اهتمام فوري' : 'Need immediate attention'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {upcomingTasks.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-yellow-600">
                      {upcomingTasks.length} {isArabic ? 'مهام قادمة' : 'Upcoming Tasks'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'خلال الـ 7 أيام القادمة' : 'Within the next 7 days'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipment" className="gap-2">
            <Cog className="w-4 h-4" />
            {isArabic ? 'المعدات' : 'Equipment'}
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="w-4 h-4" />
            {isArabic ? 'جداول الصيانة' : 'Schedules'}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Phone className="w-4 h-4" />
            {isArabic ? 'طلبات الإصلاح' : 'Service Requests'}
          </TabsTrigger>
        </TabsList>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddEquipment} onOpenChange={setShowAddEquipment}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة جهاز' : 'Add Equipment'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة جهاز جديد' : 'Add New Equipment'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
                      <Input
                        value={equipmentForm.name}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                      <Input
                        value={equipmentForm.name_ar}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, name_ar: e.target.value })}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{isArabic ? 'نوع الجهاز' : 'Equipment Type'} *</Label>
                    <Select
                      value={equipmentForm.equipment_type}
                      onValueChange={(v) => setEquipmentForm({ ...equipmentForm, equipment_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {isArabic ? type.ar : type.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الماركة' : 'Brand'}</Label>
                      <Input
                        value={equipmentForm.brand}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, brand: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الموديل' : 'Model'}</Label>
                      <Input
                        value={equipmentForm.model}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'تاريخ الشراء' : 'Purchase Date'}</Label>
                      <Input
                        type="date"
                        value={equipmentForm.purchase_date}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, purchase_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'انتهاء الضمان' : 'Warranty Until'}</Label>
                      <Input
                        type="date"
                        value={equipmentForm.warranty_until}
                        onChange={(e) => setEquipmentForm({ ...equipmentForm, warranty_until: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={equipmentForm.notes}
                      onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleAddEquipment} className="w-full">
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {equipment.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Cog className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isArabic ? 'لا توجد معدات مسجلة' : 'No equipment registered'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipment.map((eq) => (
                <Card key={eq.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {isArabic && eq.name_ar ? eq.name_ar : eq.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getEquipmentTypeLabel(eq.equipment_type)}
                        </p>
                      </div>
                      {getStatusBadge(eq.status)}
                    </div>
                    
                    {(eq.brand || eq.model) && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {eq.brand} {eq.model}
                      </p>
                    )}
                    
                    {eq.warranty_until && (
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? 'الضمان حتى:' : 'Warranty:'} {format(new Date(eq.warranty_until), 'PP', { locale: isArabic ? ar : enUS })}
                      </p>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setScheduleForm({ ...scheduleForm, equipment_id: eq.id });
                          setShowAddSchedule(true);
                        }}
                      >
                        <Calendar className="w-3 h-3 me-1" />
                        {isArabic ? 'جدولة' : 'Schedule'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setServiceForm({ ...serviceForm, equipment_id: eq.id });
                          setShowServiceRequest(true);
                        }}
                      >
                        <Wrench className="w-3 h-3 me-1" />
                        {isArabic ? 'طلب صيانة' : 'Request'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة جدول' : 'Add Schedule'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة جدول صيانة' : 'Add Maintenance Schedule'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الجهاز' : 'Equipment'} *</Label>
                    <Select
                      value={scheduleForm.equipment_id}
                      onValueChange={(v) => setScheduleForm({ ...scheduleForm, equipment_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? 'اختر جهاز' : 'Select equipment'} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {isArabic && eq.name_ar ? eq.name_ar : eq.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'اسم المهمة (إنجليزي)' : 'Task Name (English)'} *</Label>
                      <Input
                        value={scheduleForm.task_name}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, task_name: e.target.value })}
                        placeholder="e.g. Clean group heads"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'اسم المهمة (عربي)' : 'Task Name (Arabic)'}</Label>
                      <Input
                        value={scheduleForm.task_name_ar}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, task_name_ar: e.target.value })}
                        placeholder="مثال: تنظيف رؤوس القهوة"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'التكرار (أيام)' : 'Frequency (days)'} *</Label>
                      <Input
                        type="number"
                        value={scheduleForm.frequency_days}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, frequency_days: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'تذكير قبل (أيام)' : 'Remind before (days)'}</Label>
                      <Input
                        type="number"
                        value={scheduleForm.reminder_days_before}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, reminder_days_before: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                    <Textarea
                      value={scheduleForm.description}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleAddSchedule} className="w-full">
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {schedules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isArabic ? 'لا توجد جداول صيانة' : 'No maintenance schedules'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const daysUntilDue = differenceInDays(new Date(schedule.next_due_at), new Date());
                const isOverdue = daysUntilDue < 0;
                const isDueSoon = daysUntilDue <= schedule.reminder_days_before;
                
                return (
                  <Card 
                    key={schedule.id}
                    className={isOverdue ? 'border-red-500/50' : isDueSoon ? 'border-yellow-500/50' : ''}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {isArabic && schedule.task_name_ar ? schedule.task_name_ar : schedule.task_name}
                            </h3>
                            {schedule.is_critical && (
                              <Badge variant="destructive" className="text-xs">
                                {isArabic ? 'حرج' : 'Critical'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {schedule.equipment_name} • {isArabic ? 'كل' : 'Every'} {schedule.frequency_days} {isArabic ? 'يوم' : 'days'}
                          </p>
                          <p className={`text-sm mt-1 ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {isOverdue 
                              ? (isArabic ? `متأخر ${Math.abs(daysUntilDue)} أيام` : `${Math.abs(daysUntilDue)} days overdue`)
                              : (isArabic ? `مستحق في ${daysUntilDue} أيام` : `Due in ${daysUntilDue} days`)
                            }
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleCompleteTask(schedule)}
                        >
                          <CheckCircle className="w-4 h-4 me-1" />
                          {isArabic ? 'تم' : 'Complete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Service Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showServiceRequest} onOpenChange={setShowServiceRequest}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'طلب صيانة' : 'Request Service'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'طلب صيانة جديد' : 'New Service Request'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الجهاز' : 'Equipment'} *</Label>
                    <Select
                      value={serviceForm.equipment_id}
                      onValueChange={(v) => setServiceForm({ ...serviceForm, equipment_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? 'اختر جهاز' : 'Select equipment'} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {isArabic && eq.name_ar ? eq.name_ar : eq.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? 'عنوان المشكلة' : 'Issue Title'} *</Label>
                    <Input
                      value={serviceForm.issue_title}
                      onChange={(e) => setServiceForm({ ...serviceForm, issue_title: e.target.value })}
                      placeholder={isArabic ? 'مثال: الآلة لا تسخن' : 'e.g. Machine not heating'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? 'وصف المشكلة' : 'Issue Description'}</Label>
                    <Textarea
                      value={serviceForm.issue_description}
                      onChange={(e) => setServiceForm({ ...serviceForm, issue_description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? 'درجة الإلحاح' : 'Urgency'}</Label>
                    <Select
                      value={serviceForm.urgency}
                      onValueChange={(v) => setServiceForm({ ...serviceForm, urgency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{isArabic ? 'منخفض' : 'Low'}</SelectItem>
                        <SelectItem value="medium">{isArabic ? 'متوسط' : 'Medium'}</SelectItem>
                        <SelectItem value="high">{isArabic ? 'عالي' : 'High'}</SelectItem>
                        <SelectItem value="critical">{isArabic ? 'حرج' : 'Critical'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleCreateServiceRequest} className="w-full">
                    {isArabic ? 'إرسال الطلب' : 'Submit Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {serviceRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Phone className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isArabic ? 'لا توجد طلبات صيانة' : 'No service requests'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {serviceRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{request.issue_title}</h3>
                          {getUrgencyBadge(request.urgency)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.equipment_name} • {format(new Date(request.created_at), 'PP', { locale: isArabic ? ar : enUS })}
                        </p>
                        {request.issue_description && (
                          <p className="text-sm mt-2">{request.issue_description}</p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {request.status === 'pending' && (isArabic ? 'قيد الانتظار' : 'Pending')}
                        {request.status === 'assigned' && (isArabic ? 'تم التعيين' : 'Assigned')}
                        {request.status === 'in_progress' && (isArabic ? 'جاري العمل' : 'In Progress')}
                        {request.status === 'completed' && (isArabic ? 'مكتمل' : 'Completed')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EquipmentManager;
