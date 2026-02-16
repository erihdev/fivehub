import { useState, useEffect } from "react";
import {
  Wrench, Plus, Calendar, Clock, AlertTriangle, CheckCircle, User,
  Loader2, Building2, Coffee, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaintenanceRequest {
  id: string;
  requester_id: string;
  requester_type: string;
  equipment_type: string;
  equipment_brand: string | null;
  equipment_model: string | null;
  issue_description: string;
  urgency: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
}

const MaintenanceRequests = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');

  useEffect(() => {
    if (user) fetchRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('maintenance-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch requests where technician_id is null (available) or assigned to this user
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .or(`technician_id.is.null,technician_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          technician_id: user.id,
          status: 'assigned'
        })
        .eq('id', requestId)
        .is('technician_id', null);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم قبول الطلب' : 'Request accepted');
      fetchRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error(language === 'ar' ? 'فشل قبول الطلب' : 'Failed to accept request');
    }
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Failed to update');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
      assigned: { label: 'Assigned', labelAr: 'مُعين', variant: 'default', icon: <User className="w-3 h-3" /> },
      in_progress: { label: 'In Progress', labelAr: 'جاري العمل', variant: 'default', icon: <Wrench className="w-3 h-3" /> },
      completed: { label: 'Completed', labelAr: 'مكتمل', variant: 'outline', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { label: 'Cancelled', labelAr: 'ملغي', variant: 'destructive', icon: <AlertTriangle className="w-3 h-3" /> },
    };
    const s = statusMap[status] || statusMap.pending;
    return (
      <Badge variant={s.variant} className="flex items-center gap-1">
        {s.icon}
        {language === 'ar' ? s.labelAr : s.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap: Record<string, { label: string; labelAr: string; color: string }> = {
      low: { label: 'Low', labelAr: 'منخفضة', color: 'bg-green-100 text-green-800' },
      normal: { label: 'Normal', labelAr: 'عادية', color: 'bg-blue-100 text-blue-800' },
      high: { label: 'High', labelAr: 'عالية', color: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', labelAr: 'عاجلة', color: 'bg-red-100 text-red-800' },
    };
    const u = urgencyMap[urgency] || urgencyMap.normal;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.color}`}>
        {language === 'ar' ? u.labelAr : u.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'assigned') return r.status === 'assigned' || r.status === 'in_progress';
    if (filter === 'completed') return r.status === 'completed';
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    assigned: requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setFilter('all')}>
          <CardContent className="p-4 text-center">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-orange-500/50" onClick={() => setFilter('pending')}>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500/50" onClick={() => setFilter('assigned')}>
          <CardContent className="p-4 text-center">
            <User className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats.assigned}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50" onClick={() => setFilter('completed')}>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'مكتملة' : 'Completed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          {filter === 'all' && (language === 'ar' ? 'جميع الطلبات' : 'All Requests')}
          {filter === 'pending' && (language === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Requests')}
          {filter === 'assigned' && (language === 'ar' ? 'طلبات قيد التنفيذ' : 'In Progress')}
          {filter === 'completed' && (language === 'ar' ? 'طلبات مكتملة' : 'Completed Requests')}
        </h2>

        {filteredRequests.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ar' ? 'لا توجد طلبات' : 'No Requests'}
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {request.requester_type === 'roaster' ? (
                          <Coffee className="w-5 h-5 text-primary" />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                        <span className="font-semibold">{request.equipment_type}</span>
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                      
                      {(request.equipment_brand || request.equipment_model) && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {request.equipment_brand} {request.equipment_model}
                        </p>
                      )}
                      
                      <p className="text-sm mb-3">{request.issue_description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                        {request.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(request.scheduled_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {request.status === 'pending' && (
                        <Button size="sm" onClick={() => acceptRequest(request.id)}>
                          {language === 'ar' ? 'قبول الطلب' : 'Accept'}
                        </Button>
                      )}
                      {request.status === 'assigned' && (
                        <Button size="sm" onClick={() => updateStatus(request.id, 'in_progress')}>
                          {language === 'ar' ? 'بدء العمل' : 'Start Work'}
                        </Button>
                      )}
                      {request.status === 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(request.id, 'completed')}>
                          <CheckCircle className={`w-4 h-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                          {language === 'ar' ? 'إنهاء' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceRequests;
