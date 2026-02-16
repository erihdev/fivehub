import { useState } from "react";
import { FileText, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaintenanceReportFormProps {
  requestId: string;
  onSuccess?: () => void;
}

const MaintenanceReportForm = ({ requestId, onSuccess }: MaintenanceReportFormProps) => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState({
    diagnosis: '',
    work_performed: '',
    parts_used: '',
    labor_hours: '',
    parts_cost: '',
    labor_cost: '',
    recommendations: '',
    next_maintenance_date: '',
  });

  const calculateTotal = () => {
    const parts = parseFloat(report.parts_cost) || 0;
    const labor = parseFloat(report.labor_cost) || 0;
    return parts + labor;
  };

  const submitReport = async () => {
    if (!user || !report.diagnosis || !report.work_performed) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const partsUsed = report.parts_used 
        ? report.parts_used.split('\n').map(p => ({ name: p.trim() }))
        : [];

      const { error } = await supabase
        .from('maintenance_reports')
        .insert({
          request_id: requestId,
          technician_id: user.id,
          diagnosis: report.diagnosis,
          work_performed: report.work_performed,
          parts_used: partsUsed,
          labor_hours: parseFloat(report.labor_hours) || null,
          parts_cost: parseFloat(report.parts_cost) || null,
          labor_cost: parseFloat(report.labor_cost) || null,
          total_cost: calculateTotal() || null,
          recommendations: report.recommendations || null,
          next_maintenance_date: report.next_maintenance_date || null,
        });

      if (error) throw error;

      // Update request status to completed
      await supabase
        .from('maintenance_requests')
        .update({ 
          status: 'completed',
          completed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      toast.success(language === 'ar' ? 'تم حفظ التقرير بنجاح' : 'Report saved successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(language === 'ar' ? 'فشل حفظ التقرير' : 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {language === 'ar' ? 'تقرير الصيانة' : 'Maintenance Report'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'التشخيص' : 'Diagnosis'} *</Label>
          <Textarea
            value={report.diagnosis}
            onChange={(e) => setReport({ ...report, diagnosis: e.target.value })}
            placeholder={language === 'ar' ? 'وصف المشكلة والتشخيص...' : 'Describe the issue and diagnosis...'}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'العمل المنجز' : 'Work Performed'} *</Label>
          <Textarea
            value={report.work_performed}
            onChange={(e) => setReport({ ...report, work_performed: e.target.value })}
            placeholder={language === 'ar' ? 'تفاصيل الإصلاحات...' : 'Details of repairs...'}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'القطع المستخدمة' : 'Parts Used'}</Label>
          <Textarea
            value={report.parts_used}
            onChange={(e) => setReport({ ...report, parts_used: e.target.value })}
            placeholder={language === 'ar' ? 'قطعة واحدة في كل سطر...' : 'One part per line...'}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ساعات العمل' : 'Labor Hours'}</Label>
            <Input
              type="number"
              value={report.labor_hours}
              onChange={(e) => setReport({ ...report, labor_hours: e.target.value })}
              placeholder="2"
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تكلفة القطع' : 'Parts Cost'}</Label>
            <Input
              type="number"
              value={report.parts_cost}
              onChange={(e) => setReport({ ...report, parts_cost: e.target.value })}
              placeholder="150"
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تكلفة العمل' : 'Labor Cost'}</Label>
            <Input
              type="number"
              value={report.labor_cost}
              onChange={(e) => setReport({ ...report, labor_cost: e.target.value })}
              placeholder="200"
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
            <Input
              value={`${calculateTotal()} SAR`}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'التوصيات' : 'Recommendations'}</Label>
          <Textarea
            value={report.recommendations}
            onChange={(e) => setReport({ ...report, recommendations: e.target.value })}
            placeholder={language === 'ar' ? 'توصيات للعميل...' : 'Recommendations for client...'}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'موعد الصيانة القادم' : 'Next Maintenance Date'}</Label>
          <Input
            type="date"
            value={report.next_maintenance_date}
            onChange={(e) => setReport({ ...report, next_maintenance_date: e.target.value })}
          />
        </div>

        <Button onClick={submitReport} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
          ) : (
            <Save className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
          )}
          {language === 'ar' ? 'حفظ التقرير' : 'Save Report'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MaintenanceReportForm;
