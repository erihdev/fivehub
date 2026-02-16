import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, FileText, Search, Eye, Edit, Save, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResaleContract {
  id: string;
  contract_number: string;
  resale_id: string;
  seller_id: string;
  buyer_id: string;
  product_title: string;
  product_description: string | null;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  seller_receives: number;
  currency: string;
  seller_signature: string | null;
  seller_signed_at: string | null;
  buyer_signature: string | null;
  buyer_signed_at: string | null;
  status: string;
  created_at: string;
  seller_name?: string;
  buyer_name?: string;
}

const ResaleContractsAdmin = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ResaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<ResaleContract | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    product_title: '',
    product_description: '',
    quantity_kg: 0,
    price_per_kg: 0,
    commission_rate: 5,
    status: 'pending_seller_signature'
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('resale_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for names
      const userIds = [...new Set((data || []).flatMap(c => [c.seller_id, c.buyer_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      const contractsWithNames = (data || []).map(contract => ({
        ...contract,
        seller_name: profileMap.get(contract.seller_id) || 'N/A',
        buyer_name: profileMap.get(contract.buyer_id) || 'N/A'
      }));

      setContracts(contractsWithNames);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 ml-1" />{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
      case 'pending_seller_signature':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />{language === 'ar' ? 'بانتظار البائع' : 'Pending Seller'}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: contracts.length,
    completed: contracts.filter(c => c.status === 'completed').length,
    pending: contracts.filter(c => c.status === 'pending_seller_signature').length,
    totalCommission: contracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.commission_amount, 0),
    totalVolume: contracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.total_amount, 0)
  };

  const openEditDialog = (contract: ResaleContract) => {
    setSelectedContract(contract);
    setEditForm({
      product_title: contract.product_title,
      product_description: contract.product_description || '',
      quantity_kg: contract.quantity_kg,
      price_per_kg: contract.price_per_kg,
      commission_rate: contract.commission_rate,
      status: contract.status
    });
    setShowEditDialog(true);
  };

  const handleSaveContract = async () => {
    if (!selectedContract) return;
    
    setSaving(true);
    try {
      const total_amount = editForm.quantity_kg * editForm.price_per_kg;
      const commission_amount = total_amount * (editForm.commission_rate / 100);
      const seller_receives = total_amount - commission_amount;

      const { error } = await supabase
        .from('resale_contracts')
        .update({
          product_title: editForm.product_title,
          product_description: editForm.product_description || null,
          quantity_kg: editForm.quantity_kg,
          price_per_kg: editForm.price_per_kg,
          total_amount,
          commission_rate: editForm.commission_rate,
          commission_amount,
          seller_receives,
          status: editForm.status
        })
        .eq('id', selectedContract.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم تحديث العقد بنجاح' : 'Contract updated successfully'
      });

      setShowEditDialog(false);
      fetchContracts();
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحديث العقد' : 'Failed to update contract',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا العقد؟' : 'Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resale_contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف العقد بنجاح' : 'Contract deleted successfully'
      });

      fetchContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل حذف العقد' : 'Failed to delete contract',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-dashboard')}>
            <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              {language === 'ar' ? 'عقود إعادة البيع' : 'Resale Contracts'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة ومراقبة جميع عقود البيع بين المحامص' : 'Manage and monitor all resale contracts between roasters'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي العقود' : 'Total Contracts'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مكتملة' : 'Completed'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.totalCommission.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي العمولات' : 'Total Commission'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? 'حجم التداول' : 'Trading Volume'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث بالرقم أو المنتج أو الأطراف...' : 'Search by number, product, or parties...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'قائمة العقود' : 'Contracts List'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'رقم العقد' : 'Contract #'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead>{language === 'ar' ? 'البائع' : 'Seller'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المشتري' : 'Buyer'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  <TableHead>{language === 'ar' ? 'العمولة' : 'Commission'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التوقيعات' : 'Signatures'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map(contract => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-mono text-xs">{contract.contract_number}</TableCell>
                    <TableCell>{contract.product_title}</TableCell>
                    <TableCell>{contract.seller_name}</TableCell>
                    <TableCell>{contract.buyer_name}</TableCell>
                    <TableCell>{contract.total_amount.toFixed(2)} {contract.currency}</TableCell>
                    <TableCell className="text-primary font-medium">{contract.commission_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${contract.buyer_signature ? 'bg-green-500' : 'bg-gray-300'}`} title={language === 'ar' ? 'المشتري' : 'Buyer'} />
                        <div className={`w-2 h-2 rounded-full ${contract.seller_signature ? 'bg-green-500' : 'bg-gray-300'}`} title={language === 'ar' ? 'البائع' : 'Seller'} />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(contract.created_at), 'PP', { locale: language === 'ar' ? ar : undefined })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(contract)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteContract(contract.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredContracts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد عقود' : 'No contracts found'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contract Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'تفاصيل العقد' : 'Contract Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">{language === 'ar' ? 'رقم العقد' : 'Contract Number'}</span>
                  <p className="font-mono font-bold">{selectedContract.contract_number}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</span>
                  <div className="mt-1">{getStatusBadge(selectedContract.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{language === 'ar' ? 'البائع' : 'Seller'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedContract.seller_name}</p>
                    {selectedContract.seller_signature && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">{language === 'ar' ? 'التوقيع:' : 'Signature:'}</span>
                        <img src={selectedContract.seller_signature} alt="Seller Signature" className="h-16 border rounded mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedContract.seller_signed_at && format(new Date(selectedContract.seller_signed_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{language === 'ar' ? 'المشتري' : 'Buyer'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedContract.buyer_name}</p>
                    {selectedContract.buyer_signature && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">{language === 'ar' ? 'التوقيع:' : 'Signature:'}</span>
                        <img src={selectedContract.buyer_signature} alt="Buyer Signature" className="h-16 border rounded mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedContract.buyer_signed_at && format(new Date(selectedContract.buyer_signed_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{language === 'ar' ? 'تفاصيل المنتج' : 'Product Details'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? 'المنتج' : 'Product'}</span>
                    <span className="font-medium">{selectedContract.product_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
                    <span className="font-medium">{selectedContract.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</span>
                    <span className="font-medium">{selectedContract.price_per_kg} {selectedContract.currency}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{language === 'ar' ? 'التفاصيل المالية' : 'Financial Details'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-bold text-lg">{selectedContract.total_amount.toFixed(2)} {selectedContract.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? `العمولة (${selectedContract.commission_rate}%)` : `Commission (${selectedContract.commission_rate}%)`}</span>
                    <span className="font-bold text-primary">{selectedContract.commission_amount.toFixed(2)} {selectedContract.currency}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">{language === 'ar' ? 'صافي البائع' : 'Seller Net'}</span>
                    <span className="font-bold text-green-600">{selectedContract.seller_receives.toFixed(2)} {selectedContract.currency}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-muted-foreground text-center">
                {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {format(new Date(selectedContract.created_at), 'PPpp', { locale: language === 'ar' ? ar : undefined })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Contract Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {language === 'ar' ? 'تعديل العقد' : 'Edit Contract'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'عنوان المنتج' : 'Product Title'}</Label>
              <Input
                value={editForm.product_title}
                onChange={(e) => setEditForm({ ...editForm, product_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'وصف المنتج' : 'Product Description'}</Label>
              <Textarea
                value={editForm.product_description}
                onChange={(e) => setEditForm({ ...editForm, product_description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية (كجم)' : 'Quantity (kg)'}</Label>
                <Input
                  type="number"
                  value={editForm.quantity_kg}
                  onChange={(e) => setEditForm({ ...editForm, quantity_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</Label>
                <Input
                  type="number"
                  value={editForm.price_per_kg}
                  onChange={(e) => setEditForm({ ...editForm, price_per_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</Label>
                <Input
                  type="number"
                  value={editForm.commission_rate}
                  onChange={(e) => setEditForm({ ...editForm, commission_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_seller_signature">{language === 'ar' ? 'بانتظار البائع' : 'Pending Seller'}</SelectItem>
                    <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                    <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Calculations */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="font-medium">{(editForm.quantity_kg * editForm.price_per_kg).toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'ar' ? 'العمولة' : 'Commission'}</span>
                  <span className="font-medium text-primary">{((editForm.quantity_kg * editForm.price_per_kg) * (editForm.commission_rate / 100)).toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">{language === 'ar' ? 'صافي البائع' : 'Seller Net'}</span>
                  <span className="font-bold text-green-600">{((editForm.quantity_kg * editForm.price_per_kg) * (1 - editForm.commission_rate / 100)).toFixed(2)} SAR</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveContract} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              <Save className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResaleContractsAdmin;