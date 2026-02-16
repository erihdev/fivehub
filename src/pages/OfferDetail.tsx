import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Package,
  Calendar,
  Percent,
  Phone,
  Mail,
  MessageSquare,
  Coffee,
  Loader2,
  MapPin,
  DollarSign,
  Clock,
  FileText,
  Send,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { useOfferFavorites } from "@/hooks/useOfferFavorites";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  currency: string | null;
  min_quantity_kg: number | null;
  terms_conditions: string | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  supplier_id: string;
  coffee_id: string | null;
  created_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_info: string | null;
  };
  coffee?: {
    id: string;
    name: string;
    origin: string | null;
    price: number | null;
    currency: string | null;
    process: string | null;
  };
}

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useOfferFavorites();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const isRtl = dir === "rtl";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchOffer = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("supplier_offers")
          .select(
            `
            *,
            supplier:suppliers(id, name, contact_info),
            coffee:coffee_offerings(id, name, origin, price, currency, process)
          `
          )
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching offer:", error);
          toast({
            title: language === "ar" ? "خطأ" : "Error",
            description:
              language === "ar"
                ? "فشل في تحميل تفاصيل العرض"
                : "Failed to load offer details",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          // Transform data to handle array responses
          const transformedOffer = {
            ...data,
            supplier: Array.isArray(data.supplier)
              ? data.supplier[0]
              : data.supplier,
            coffee: Array.isArray(data.coffee) ? data.coffee[0] : data.coffee,
          };
          setOffer(transformedOffer);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffer();
  }, [user, id, language]);

  const handleSendMessage = async () => {
    if (!message.trim() || !offer?.supplier?.id) return;

    setIsSending(true);
    try {
      // Get supplier user_id
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("user_id")
        .eq("id", offer.supplier.id)
        .single();

      if (!supplierData?.user_id) {
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description:
            language === "ar"
              ? "لا يمكن إرسال الرسالة لهذا المورد"
              : "Cannot send message to this supplier",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        receiver_id: supplierData.user_id,
        subject:
          language === "ar"
            ? `استفسار عن العرض: ${offer.title}`
            : `Inquiry about offer: ${offer.title}`,
        content: message,
      });

      if (error) throw error;

      toast({
        title: language === "ar" ? "تم الإرسال" : "Message Sent",
        description:
          language === "ar"
            ? "تم إرسال رسالتك بنجاح"
            : "Your message has been sent successfully",
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar" ? "فشل في إرسال الرسالة" : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(
      language === "ar" ? "ar-SA" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };

  const isExpiringSoon = () => {
    if (!offer?.valid_until) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(offer.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    if (!offer?.valid_until) return false;
    return new Date(offer.valid_until) < new Date();
  };

  if (authLoading || isLoading) {
    return (
      <main
        className="min-h-screen bg-background font-arabic flex items-center justify-center"
        dir={dir}
      >
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="min-h-screen bg-background font-arabic" dir={dir}>
        <div className="container mx-auto px-6 py-12 text-center">
          <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === "ar" ? "العرض غير موجود" : "Offer Not Found"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {language === "ar"
              ? "لا يمكن العثور على هذا العرض أو أنه لم يعد متاحاً"
              : "This offer could not be found or is no longer available"}
          </p>
          <Button onClick={() => navigate(-1)}>
            {isRtl ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
            {language === "ar" ? "العودة" : "Go Back"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Offer Header Card */}
            <Card className="overflow-hidden border-2 border-green-500/20">
              <div className="bg-gradient-to-r from-green-500/10 to-transparent p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-green-500 text-lg px-4 py-1">
                      {offer.discount_percentage
                        ? `${offer.discount_percentage}% ${language === "ar" ? "خصم" : "OFF"}`
                        : `${offer.discount_amount} ${offer.currency || "SAR"} ${language === "ar" ? "خصم" : "OFF"}`}
                    </Badge>
                    {isExpiringSoon() && (
                      <Badge variant="destructive">
                        {language === "ar" ? "ينتهي قريباً" : "Expiring Soon"}
                      </Badge>
                    )}
                    {isExpired() && (
                      <Badge variant="secondary">
                        {language === "ar" ? "منتهي الصلاحية" : "Expired"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${isFavorite(offer.id) ? "text-red-500" : "text-muted-foreground"} hover:text-red-500`}
                    onClick={async () => {
                      setIsTogglingFavorite(true);
                      await toggleFavorite(offer.id);
                      setIsTogglingFavorite(false);
                    }}
                    disabled={isTogglingFavorite}
                  >
                    <Heart className={`w-6 h-6 ${isFavorite(offer.id) ? "fill-current" : ""}`} />
                  </Button>
                </div>
                <h1 className="text-3xl font-display font-bold mb-2">
                  {offer.title}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {offer.supplier?.name}
                </p>
              </div>
            </Card>

            {/* Description */}
            {offer.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-coffee-gold" />
                    {language === "ar" ? "وصف العرض" : "Offer Description"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {offer.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Offer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-coffee-gold" />
                  {language === "ar" ? "تفاصيل العرض" : "Offer Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {offer.min_quantity_kg && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Package className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "الحد الأدنى للطلب" : "Minimum Order"}
                        </p>
                        <p className="font-semibold">
                          {offer.min_quantity_kg} {language === "ar" ? "كغ" : "kg"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {offer.valid_from && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "تاريخ البدء" : "Start Date"}
                        </p>
                        <p className="font-semibold">{formatDate(offer.valid_from)}</p>
                      </div>
                    </div>
                  )}
                  
                  {offer.valid_until && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "تاريخ الانتهاء" : "End Date"}
                        </p>
                        <p className="font-semibold">{formatDate(offer.valid_until)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Percent className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? "قيمة الخصم" : "Discount Value"}
                      </p>
                      <p className="font-semibold">
                        {offer.discount_percentage
                          ? `${offer.discount_percentage}%`
                          : `${offer.discount_amount} ${offer.currency || "SAR"}`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coffee Details */}
            {offer.coffee && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-coffee-gold" />
                    {language === "ar" ? "تفاصيل القهوة" : "Coffee Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Coffee className="w-5 h-5 text-coffee-gold" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "اسم القهوة" : "Coffee Name"}
                        </p>
                        <p className="font-semibold">{offer.coffee.name}</p>
                      </div>
                    </div>
                    
                    {offer.coffee.origin && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {language === "ar" ? "المنشأ" : "Origin"}
                          </p>
                          <p className="font-semibold">{offer.coffee.origin}</p>
                        </div>
                      </div>
                    )}
                    
                    {offer.coffee.process && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Package className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {language === "ar" ? "المعالجة" : "Process"}
                          </p>
                          <p className="font-semibold">{offer.coffee.process}</p>
                        </div>
                      </div>
                    )}
                    
                    {offer.coffee.price && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {language === "ar" ? "السعر الأصلي" : "Original Price"}
                          </p>
                          <p className="font-semibold">
                            {offer.coffee.price} {offer.coffee.currency || "SAR"}/
                            {language === "ar" ? "كغ" : "kg"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Conditions */}
            {offer.terms_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-coffee-gold" />
                    {language === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {offer.terms_conditions}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Contact Supplier */}
          <div className="space-y-6">
            {/* Supplier Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-coffee-gold" />
                  {language === "ar" ? "تواصل مع المورد" : "Contact Supplier"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 bg-coffee-gold/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Coffee className="w-8 h-8 text-coffee-gold" />
                  </div>
                  <h3 className="font-bold text-lg">{offer.supplier?.name}</h3>
                </div>

                <Separator />

                {/* Contact Options */}
                <div className="space-y-3">
                  {offer.supplier?.contact_info && (
                    <>
                      <WhatsAppButton
                        phoneNumber={offer.supplier.contact_info}
                        message={
                          language === "ar"
                            ? `مرحباً، أنا مهتم بعرض "${offer.title}"`
                            : `Hi, I'm interested in the offer "${offer.title}"`
                        }
                        className="w-full"
                      />
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() =>
                          (window.location.href = `tel:${offer.supplier?.contact_info}`)
                        }
                      >
                        <Phone className="w-4 h-4" />
                        {language === "ar" ? "اتصال هاتفي" : "Call"}
                      </Button>
                    </>
                  )}
                </div>

                <Separator />

                {/* Internal Message */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">
                    {language === "ar"
                      ? "إرسال رسالة داخلية"
                      : "Send Internal Message"}
                  </h4>
                  <Textarea
                    placeholder={
                      language === "ar"
                        ? "اكتب رسالتك للمورد..."
                        : "Write your message to the supplier..."
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    dir={dir}
                  />
                  <Button
                    className="w-full gap-2"
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {language === "ar" ? "إرسال الرسالة" : "Send Message"}
                  </Button>
                </div>

                <Separator />

                {/* Quick Links */}
                <div className="space-y-2">
                  <Link to="/messages">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      {language === "ar" ? "صندوق الرسائل" : "Messages Inbox"}
                    </Button>
                  </Link>
                  <Link to="/active-offers">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Tag className="w-4 h-4" />
                      {language === "ar" ? "جميع العروض" : "All Offers"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OfferDetail;
