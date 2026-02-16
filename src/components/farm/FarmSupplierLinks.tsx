import { useState, useEffect } from "react";
import { Building2, Link2, Plus, Check, X, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupplierLink {
  id: string;
  supplier_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  supplier?: {
    name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
}

const FarmSupplierLinks = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [links, setLinks] = useState<SupplierLink[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchLinks();
      fetchSuppliers();
    }
  }, [user]);

  const fetchLinks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farm_supplier_links')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('farm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(link => ({
        ...link,
        supplier: Array.isArray(link.supplier) ? link.supplier[0] : link.supplier
      }));
      setLinks(transformedData);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const createLink = async () => {
    if (!user || !selectedSupplier) {
      toast.error(language === 'ar' ? 'يرجى اختيار مورد' : 'Please select a supplier');
      return;
    }

    try {
      const { error } = await supabase
        .from('farm_supplier_links')
        .insert({
          farm_id: user.id,
          supplier_id: selectedSupplier,
          notes: notes || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error(language === 'ar' ? 'الربط موجود مسبقاً' : 'Link already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success(language === 'ar' ? 'تم إرسال طلب الربط' : 'Link request sent');
      setDialogOpen(false);
      setSelectedSupplier('');
      setNotes('');
      fetchLinks();
    } catch (error) {
      console.error('Error creating link:', error);
      toast.error(language === 'ar' ? 'فشل إرسال الطلب' : 'Failed to send request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'secondary' },
      approved: { label: 'Approved', labelAr: 'معتمد', variant: 'default' },
      rejected: { label: 'Rejected', labelAr: 'مرفوض', variant: 'destructive' },
    };
    const s = statusMap[status] || statusMap.pending;
    return <Badge variant={s.variant}>{language === 'ar' ? s.labelAr : s.label}</Badge>;
  };

  const linkedSupplierIds = links.map(l => l.supplier_id);
  const availableSuppliers = suppliers.filter(s => !linkedSupplierIds.includes(s.id));

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
            <Link2 className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'ربط الموردين' : 'Supplier Links'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'اربط مزرعتك بالموردين للتوريد المباشر' : 'Link your farm to suppliers for direct supply'}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableSuppliers.length === 0}>
              <Plus className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'طلب ربط' : 'Request Link'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'طلب ربط بمورد' : 'Request Supplier Link'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اختر المورد' : 'Select Supplier'} *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مورد...' : 'Choose supplier...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'رسالة للمورد...' : 'Message to supplier...'}
                />
              </div>

              <Button onClick={createLink} className="w-full">
                <Send className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {language === 'ar' ? 'إرسال الطلب' : 'Send Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد روابط بموردين' : 'No Supplier Links'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' ? 'اربط مزرعتك بالموردين لتسهيل التوريد' : 'Link your farm to suppliers for easier supply chain'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <Card key={link.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{link.supplier?.name || 'Unknown'}</CardTitle>
                      <CardDescription>
                        {new Date(link.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(link.status)}
                </div>
              </CardHeader>
              {link.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{link.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmSupplierLinks;
