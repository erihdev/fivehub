import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertCircle, CheckCircle, Clock, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

interface QualityReport {
  id: string;
  order_id: string;
  order_type: string;
  quality_score: number;
  issues_reported: string[];
  resolution_status: string;
  refund_amount: number;
  reported_at: string;
  resolved_at: string;
}

const QualityGuarantee = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    order_id: "",
    order_type: "cafe_order",
    issues: [] as string[],
    description: "",
  });

  const issueTypes = [
    { id: "quality", ar: "جودة منخفضة", en: "Low Quality" },
    { id: "taste", ar: "طعم غير متوقع", en: "Unexpected Taste" },
    { id: "freshness", ar: "غير طازج", en: "Not Fresh" },
    { id: "packaging", ar: "مشكلة في التغليف", en: "Packaging Issue" },
    { id: "quantity", ar: "كمية ناقصة", en: "Quantity Shortage" },
    { id: "wrong_item", ar: "منتج خاطئ", en: "Wrong Item" },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quality_guarantees")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setReports(data);
    setLoading(false);
  };

  const submitReport = async () => {
    if (!newReport.order_id || newReport.issues.length === 0) {
      toast.error(language === "ar" ? "يرجى إدخال رقم الطلب واختيار المشكلة" : "Please enter order ID and select issues");
      return;
    }

    const { error } = await supabase.from("quality_guarantees").insert({
      order_id: newReport.order_id,
      order_type: newReport.order_type,
      issues_reported: newReport.issues,
      resolution_status: "reported",
      reported_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error submitting report");
    } else {
      toast.success(language === "ar" ? "تم إرسال البلاغ!" : "Report submitted!");
      setReportOpen(false);
      setNewReport({ order_id: "", order_type: "cafe_order", issues: [], description: "" });
      fetchReports();
    }
  };

  const toggleIssue = (issueId: string) => {
    if (newReport.issues.includes(issueId)) {
      setNewReport({ ...newReport, issues: newReport.issues.filter(i => i !== issueId) });
    } else {
      setNewReport({ ...newReport, issues: [...newReport.issues, issueId] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reported":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> {language === "ar" ? "قيد المراجعة" : "Under Review"}</Badge>;
      case "investigating":
        return <Badge variant="outline" className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {language === "ar" ? "قيد التحقيق" : "Investigating"}</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === "ar" ? "تم الحل" : "Resolved"}</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === "ar" ? "تم الاسترداد" : "Refunded"}</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = reports.filter(r => r.resolution_status === "reported" || r.resolution_status === "investigating").length;
  const resolvedCount = reports.filter(r => r.resolution_status === "resolved" || r.resolution_status === "refunded").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "ضمان الجودة" : "Quality Guarantee"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "نضمن لك أعلى جودة أو استرداد كامل" : "We guarantee top quality or full refund"}
            </p>
          </div>
        </div>

        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {language === "ar" ? "إبلاغ عن مشكلة" : "Report Issue"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "إبلاغ عن مشكلة جودة" : "Report Quality Issue"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "رقم الطلب" : "Order ID"}
                </label>
                <input
                  className="w-full p-2 border rounded-md"
                  value={newReport.order_id}
                  onChange={(e) => setNewReport({ ...newReport, order_id: e.target.value })}
                  placeholder="e.g., ORD-123456"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "نوع الطلب" : "Order Type"}
                </label>
                <Select
                  value={newReport.order_type}
                  onValueChange={(v) => setNewReport({ ...newReport, order_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cafe_order">{language === "ar" ? "طلب عادي" : "Regular Order"}</SelectItem>
                    <SelectItem value="custom_roast">{language === "ar" ? "تحميص مخصص" : "Custom Roast"}</SelectItem>
                    <SelectItem value="alliance_order">{language === "ar" ? "طلب تحالف" : "Alliance Order"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === "ar" ? "نوع المشكلة" : "Issue Type"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {issueTypes.map((issue) => (
                    <Badge
                      key={issue.id}
                      variant={newReport.issues.includes(issue.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleIssue(issue.id)}
                    >
                      {language === "ar" ? issue.ar : issue.en}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "تفاصيل إضافية" : "Additional Details"}
                </label>
                <Textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder={language === "ar" ? "صف المشكلة بالتفصيل..." : "Describe the issue in detail..."}
                />
              </div>

              <Button onClick={submitReport} className="w-full">
                {language === "ar" ? "إرسال البلاغ" : "Submit Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "قيد المعالجة" : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "تم الحل" : "Resolved"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "ضمان الجودة" : "Quality Guarantee"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guarantee Info */}
      <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 text-indigo-500 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {language === "ar" ? "ضمان الجودة الشامل" : "Total Quality Guarantee"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === "ar"
                  ? "نحن نضمن جودة جميع المنتجات المشتراة عبر منصتنا. إذا لم تكن راضياً عن الجودة، نقدم لك استرداد كامل أو استبدال مجاني."
                  : "We guarantee the quality of all products purchased through our platform. If you're not satisfied with the quality, we offer a full refund or free replacement."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {language === "ar" ? "استرداد كامل" : "Full Refund"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {language === "ar" ? "استبدال مجاني" : "Free Replacement"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {language === "ar" ? "رد خلال 48 ساعة" : "48hr Response"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {language === "ar" ? "بلاغاتي" : "My Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{language === "ar" ? "طلب رقم" : "Order"} #{report.order_id?.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.reported_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(report.resolution_status)}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {report.issues_reported?.map((issue, idx) => (
                    <Badge key={idx} variant="outline">
                      {issueTypes.find(i => i.id === issue)?.[language === "ar" ? "ar" : "en"] || issue}
                    </Badge>
                  ))}
                </div>

                {report.refund_amount > 0 && (
                  <p className="text-sm text-green-500">
                    {language === "ar" ? "مبلغ الاسترداد" : "Refund Amount"}: ${report.refund_amount}
                  </p>
                )}
              </div>
            ))}

            {reports.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {language === "ar" ? "لا توجد بلاغات" : "No reports yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityGuarantee;
