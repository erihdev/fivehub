import { useState } from "react";
import { Wrench, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RequestMaintenanceButtonProps {
  requesterType: 'roaster' | 'cafe';
}

const RequestMaintenanceButton = ({ requesterType }: RequestMaintenanceButtonProps) => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState({
    equipment_type: '',
    equipment_brand: '',
    equipment_model: '',
    issue_description: '',
    urgency: 'normal',
  });

  const equipmentTypes = requesterType === 'roaster' 
    ? [
        { value: 'roaster_machine', label: language === 'ar' ? 'ماكينة تحميص' : 'Roasting Machine' },
        { value: 'grinder', label: language === 'ar' ? 'طاحونة' : 'Grinder' },
        { value: 'packaging', label: language === 'ar' ? 'ماكينة تعبئة' : 'Packaging Machine' },
        { value: 'cooling_tray', label: language === 'ar' ? 'صينية تبريد' : 'Cooling Tray' },
        { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
      ]
    : [
        { value: 'espresso_machine', label: language === 'ar' ? 'ماكينة إسبريسو' : 'Espresso Machine' },
        { value: 'grinder', label: language === 'ar' ? 'طاحونة' : 'Grinder' },
        { value: 'brewing_equipment', label: language === 'ar' ? 'معدات تخمير' : 'Brewing Equipment' },
        { value: 'refrigeration', label: language === 'ar' ? 'ثلاجة/تبريد' : 'Refrigeration' },
        { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
      ];

  const submitRequest = async () => {
    if (!user || !request.equipment_type || !request.issue_description) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .insert({
          requester_id: user.id,
          requester_type: requesterType,
          equipment_type: request.equipment_type,
          equipment_brand: request.equipment_brand || null,
          equipment_model: request.equipment_model || null,
          issue_description: request.issue_description,
          urgency: request.urgency,
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إرسال طلب الصيانة' : 'Maintenance request submitted');
      setOpen(false);
      setRequest({
        equipment_type: '',
        equipment_brand: '',
        equipment_model: '',
        issue_description: '',
        urgency: 'normal',
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(language === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wrench className="w-4 h-4" />
          {language === 'ar' ? 'طلب صيانة' : 'Request Maintenance'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع المعدات' : 'Equipment Type'} *</Label>
            <Select value={request.equipment_type} onValueChange={(v) => setRequest({ ...request, equipment_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر نوع المعدات...' : 'Select equipment type...'} />
              </SelectTrigger>
              <SelectContent>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الماركة' : 'Brand'}</Label>
              <Input
                value={request.equipment_brand}
                onChange={(e) => setRequest({ ...request, equipment_brand: e.target.value })}
                placeholder="La Marzocco, Probat..."
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الموديل' : 'Model'}</Label>
              <Input
                value={request.equipment_model}
                onChange={(e) => setRequest({ ...request, equipment_model: e.target.value })}
                placeholder="Linea PB, P12..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'وصف المشكلة' : 'Issue Description'} *</Label>
            <Textarea
              value={request.issue_description}
              onChange={(e) => setRequest({ ...request, issue_description: e.target.value })}
              placeholder={language === 'ar' ? 'اشرح المشكلة بالتفصيل...' : 'Describe the issue in detail...'}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'درجة الاستعجال' : 'Urgency'}</Label>
            <Select value={request.urgency} onValueChange={(v) => setRequest({ ...request, urgency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                <SelectItem value="normal">{language === 'ar' ? 'عادية' : 'Normal'}</SelectItem>
                <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'ar' ? 'عاجلة' : 'Urgent'}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={submitRequest} disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
            ) : (
              <Send className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            )}
            {language === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestMaintenanceButton;
