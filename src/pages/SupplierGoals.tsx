import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Target, Plus, ArrowLeft, Calendar, CheckCircle, 
  Clock, TrendingUp, AlertCircle, Trash2, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SupplierGoal {
  id: string;
  supplier_id: string;
  goal_type: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  is_completed: boolean;
  completed_at: string | null;
}

const SupplierGoals = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [goals, setGoals] = useState<SupplierGoal[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New goal form
  const [newGoal, setNewGoal] = useState({
    goal_type: 'orders',
    goal_name: '',
    target_value: 10,
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const goalTypes = [
    { value: 'orders', label: language === 'ar' ? 'عدد الطلبات' : 'Orders Count', icon: Target },
    { value: 'on_time_rate', label: language === 'ar' ? 'نسبة التسليم في الوقت' : 'On-Time Rate', icon: Clock },
    { value: 'avg_delay', label: language === 'ar' ? 'تقليل متوسط التأخير' : 'Reduce Avg Delay', icon: TrendingUp },
    { value: 'rating', label: language === 'ar' ? 'تحسين التقييم' : 'Improve Rating', icon: CheckCircle },
  ];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get supplier
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, total_orders, delayed_orders, avg_delay_days, performance_score')
        .eq('user_id', user!.id)
        .single();

      if (!supplier) {
        setIsLoading(false);
        return;
      }
      setSupplierId(supplier.id);

      // Get goals
      const { data: goalsData } = await supabase
        .from('supplier_goals')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('end_date', { ascending: true });

      // Update current values based on supplier data
      const updatedGoals = (goalsData || []).map(goal => {
        let currentValue = goal.current_value;
        switch (goal.goal_type) {
          case 'orders':
            currentValue = supplier.total_orders || 0;
            break;
          case 'on_time_rate':
            const total = supplier.total_orders || 0;
            const delayed = supplier.delayed_orders || 0;
            currentValue = total > 0 ? ((total - delayed) / total) * 100 : 0;
            break;
          case 'avg_delay':
            currentValue = supplier.avg_delay_days || 0;
            break;
          case 'rating':
            currentValue = supplier.performance_score || 0;
            break;
        }
        return { ...goal, current_value: currentValue };
      });

      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!supplierId || !newGoal.goal_name) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('supplier_goals')
        .insert({
          supplier_id: supplierId,
          goal_type: newGoal.goal_type,
          goal_name: newGoal.goal_name,
          target_value: newGoal.target_value,
          start_date: new Date().toISOString().split('T')[0],
          end_date: newGoal.end_date,
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إنشاء الهدف بنجاح' : 'Goal created successfully');
      setIsDialogOpen(false);
      setNewGoal({
        goal_type: 'orders',
        goal_name: '',
        target_value: 10,
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error(language === 'ar' ? 'فشل إنشاء الهدف' : 'Failed to create goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('supplier_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف الهدف' : 'Goal deleted');
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getProgress = (goal: SupplierGoal) => {
    if (goal.goal_type === 'avg_delay') {
      // For delay, lower is better
      const initial = goal.target_value * 2; // Assume starting at double target
      const progress = ((initial - goal.current_value) / initial) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (goal: SupplierGoal) => {
    const daysRemaining = getDaysRemaining(goal.end_date);
    const progress = getProgress(goal);

    if (goal.is_completed || progress >= 100) {
      return <Badge className="bg-green-500 text-white">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
    }
    if (daysRemaining < 0) {
      return <Badge variant="destructive">{language === 'ar' ? 'منتهي' : 'Expired'}</Badge>;
    }
    if (daysRemaining <= 3) {
      return <Badge className="bg-red-500 text-white">{language === 'ar' ? `${daysRemaining} أيام متبقية` : `${daysRemaining} days left`}</Badge>;
    }
    if (daysRemaining <= 7) {
      return <Badge className="bg-amber-500 text-white">{language === 'ar' ? `${daysRemaining} أيام` : `${daysRemaining} days`}</Badge>;
    }
    return <Badge variant="outline">{language === 'ar' ? `${daysRemaining} يوم` : `${daysRemaining} days`}</Badge>;
  };

  const getGoalTypeLabel = (type: string) => {
    const found = goalTypes.find(t => t.value === type);
    return found?.label || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/supplier-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                {language === 'ar' ? 'أهدافي الشهرية' : 'My Monthly Goals'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {language === 'ar' ? 'حدد أهدافك وتتبع تقدمك' : 'Set your goals and track your progress'}
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'هدف جديد' : 'New Goal'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'إنشاء هدف جديد' : 'Create New Goal'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'نوع الهدف' : 'Goal Type'}</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم الهدف' : 'Goal Name'}</Label>
                  <Input
                    value={newGoal.goal_name}
                    onChange={(e) => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                    placeholder={language === 'ar' ? 'مثال: تحقيق 20 طلب' : 'e.g., Achieve 20 orders'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'القيمة المستهدفة' : 'Target Value'}</Label>
                  <Input
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</Label>
                  <Input
                    type="date"
                    value={newGoal.end_date}
                    onChange={(e) => setNewGoal({ ...newGoal, end_date: e.target.value })}
                  />
                </div>

                <Button 
                  onClick={handleCreateGoal} 
                  className="w-full" 
                  disabled={isSaving || !newGoal.goal_name}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    language === 'ar' ? 'إنشاء الهدف' : 'Create Goal'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals List */}
        {goals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {language === 'ar' ? 'لا توجد أهداف بعد' : 'No goals yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'أنشئ هدفك الأول لتتبع تقدمك'
                  : 'Create your first goal to track your progress'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const progress = getProgress(goal);
              const daysRemaining = getDaysRemaining(goal.end_date);
              const GoalIcon = goalTypes.find(t => t.value === goal.goal_type)?.icon || Target;

              return (
                <Card key={goal.id} className={`${
                  progress >= 100 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' :
                  daysRemaining <= 3 && daysRemaining >= 0 ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' :
                  ''
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <GoalIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                          <CardDescription>{getGoalTypeLabel(goal.goal_type)}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(goal)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                        <span className="font-medium">
                          {goal.current_value.toFixed(1)} / {goal.target_value}
                          {goal.goal_type === 'on_time_rate' || goal.goal_type === 'rating' ? '%' : ''}
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {language === 'ar' ? 'ينتهي:' : 'Ends:'} {new Date(goal.end_date).toLocaleDateString()}
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierGoals;
