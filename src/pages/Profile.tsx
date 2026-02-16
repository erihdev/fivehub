import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Coffee, 
  User, 
  Camera, 
  Loader2, 
  Save, 
  ArrowRight,
  Mail,
  Building2,
  MapPin,
  Phone,
  FileText,
  Landmark,
  CreditCard,
  LogOut,
  Settings,
  Upload,
  CheckCircle,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import SubscriptionStatusBanner from "@/components/SubscriptionStatusBanner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  business_name: string | null;
  city: string | null;
  phone: string | null;
  role: string | null;
  commercial_registration: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  iban: string | null;
  commercial_registration_image: string | null;
  national_address_image: string | null;
  logo_url: string | null;
}

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const commercialRegInputRef = useRef<HTMLInputElement>(null);
  const nationalAddressInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [commercialRegistration, setCommercialRegistration] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [commercialRegImage, setCommercialRegImage] = useState<string | null>(null);
  const [nationalAddressImage, setNationalAddressImage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCommercial, setIsUploadingCommercial] = useState(false);
  const [isUploadingNational, setIsUploadingNational] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
          setBusinessName(profileData.business_name || "");
          setCity(profileData.city || "");
          setPhone(profileData.phone || "");
          setRole(profileData.role || "");
          setCommercialRegistration(profileData.commercial_registration || "");
          setBankName(profileData.bank_name || "");
          setBankAccountNumber(profileData.bank_account_number || "");
          setIban(profileData.iban || "");
          setCommercialRegImage(profileData.commercial_registration_image || null);
          setNationalAddressImage(profileData.national_address_image || null);
          
          // Generate signed URLs for display if paths are stored
          let displayAvatarUrl = profileData.avatar_url;
          let displayLogoUrl = (profileData as any).logo_url;
          
          // Check if avatar_url is a path (not a full URL) and generate signed URL
          if (displayAvatarUrl && !displayAvatarUrl.startsWith('http')) {
            const { data: signedAvatar } = await supabase.storage
              .from("avatars")
              .createSignedUrl(displayAvatarUrl, 3600);
            displayAvatarUrl = signedAvatar?.signedUrl || null;
          }
          
          // Check if logo_url is a path and generate public URL (avatars bucket is public)
          if (displayLogoUrl && !displayLogoUrl.startsWith('http')) {
            const { data: logoData } = supabase.storage
              .from("avatars")
              .getPublicUrl(displayLogoUrl);
            displayLogoUrl = logoData?.publicUrl || null;
          }
          
          setAvatarUrl(displayAvatarUrl);
          setLogoUrl(displayLogoUrl);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 2 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "خطأ",
          description: "فشل في رفع الصورة",
          variant: "destructive",
        });
        return;
      }

      const avatarPath = fileName;

      // Store the path, not the signed URL (signed URLs expire!)
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: avatarPath }, { onConflict: 'user_id' });

      if (updateError) {
        console.error("Update error:", updateError);
        toast({
          title: "خطأ",
          description: "فشل في تحديث الصورة",
          variant: "destructive",
        });
        return;
      }

      // Get signed URL for display only
      const { data: signedData } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarPath, 3600);

      setAvatarUrl(signedData?.signedUrl || null);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الصورة الشخصية بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 2 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Upload to avatars bucket (public) instead of documents (private)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "خطأ",
          description: "فشل في رفع الشعار",
          variant: "destructive",
        });
        return;
      }

      // Get public URL from avatars bucket
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, logo_url: urlData.publicUrl }, { onConflict: 'user_id' });

      if (updateError) {
        console.error("Update error:", updateError);
        toast({
          title: "خطأ",
          description: "فشل في تحديث الشعار",
          variant: "destructive",
        });
        return;
      }

      setLogoUrl(urlData.publicUrl);
      toast({
        title: "تم التحديث",
        description: "تم رفع شعار المؤسسة بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'commercial' | 'national'
  ) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة أو PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    if (type === 'commercial') {
      setIsUploadingCommercial(true);
    } else {
      setIsUploadingNational(true);
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${type}-registration.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "خطأ",
          description: "فشل في رفع الملف",
          variant: "destructive",
        });
        return;
      }

      // Update profile with file path
      const updateField = type === 'commercial' 
        ? { commercial_registration_image: fileName }
        : { national_address_image: fileName };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, ...updateField }, { onConflict: 'user_id' });

      if (updateError) {
        console.error("Update error:", updateError);
        toast({
          title: "خطأ",
          description: "فشل في تحديث البيانات",
          variant: "destructive",
        });
        return;
      }

      if (type === 'commercial') {
        setCommercialRegImage(fileName);
      } else {
        setNationalAddressImage(fileName);
      }

      toast({
        title: "تم الرفع",
        description: type === 'commercial' 
          ? "تم رفع صورة السجل التجاري بنجاح" 
          : "تم رفع صورة العنوان الوطني بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      if (type === 'commercial') {
        setIsUploadingCommercial(false);
      } else {
        setIsUploadingNational(false);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!commercialRegistration.trim()) {
      toast({
        title: "حقل مطلوب",
        description: "يرجى إدخال رقم السجل التجاري",
        variant: "destructive",
      });
      return;
    }

    if (!commercialRegImage) {
      toast({
        title: "حقل مطلوب",
        description: "يرجى رفع صورة السجل التجاري",
        variant: "destructive",
      });
      return;
    }

    if (!nationalAddressImage) {
      toast({
        title: "حقل مطلوب",
        description: "يرجى رفع صورة العنوان الوطني",
        variant: "destructive",
      });
      return;
    }

    if (!bankName.trim()) {
      toast({
        title: "حقل مطلوب",
        description: "يرجى إدخال اسم البنك",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccountNumber.trim()) {
      toast({
        title: "حقل مطلوب",
        description: "يرجى إدخال رقم الحساب البنكي",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          user_id: user.id,
          full_name: fullName,
          business_name: businessName,
          city: city,
          phone: phone,
          commercial_registration: commercialRegistration,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          iban: iban,
          avatar_url: avatarUrl,
          logo_url: logoUrl,
          commercial_registration_image: commercialRegImage,
          national_address_image: nationalAddressImage
        }, { onConflict: 'user_id' });

      if (error) {
        console.error("Save error:", error);
        toast({
          title: "خطأ",
          description: "فشل في حفظ البيانات",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحفظ",
        description: "تم تحديث الملف الشخصي بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الخروج",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "؟";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2);
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir="rtl">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic pt-20" dir="rtl">
      <div className="container mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            الرئيسية
          </Link>
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-foreground">الملف الشخصي</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Subscription Status */}
          <SubscriptionStatusBanner />

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display">الملف الشخصي</CardTitle>
              <CardDescription>قم بتعديل بياناتك الشخصية والبنكية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-fivehub-gold/20">
                    <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                    <AvatarFallback className="bg-fivehub-gold/10 text-fivehub-gold text-3xl font-bold">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-fivehub-gold text-primary-foreground flex items-center justify-center hover:bg-fivehub-gold/90 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  اضغط على الكاميرا لتغيير الصورة
                </p>
              </div>

              {/* Logo Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">شعار المؤسسة</Label>
                <p className="text-sm text-muted-foreground">
                  سيظهر الشعار في الهيدر بدلاً من شعار المنصة
                </p>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img 
                        src={logoUrl} 
                        alt="شعار المؤسسة" 
                        className="h-20 w-auto max-w-[160px] object-contain rounded border"
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-fivehub-gold text-primary-foreground flex items-center justify-center hover:bg-fivehub-gold/90 transition-colors disabled:opacity-50"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex flex-col items-center justify-center gap-2 w-40 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-fivehub-gold/50 transition-colors"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">رفع الشعار</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="pr-10 bg-muted"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    لا يمكن تغيير البريد الإلكتروني
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="أدخل اسمك الكامل"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pr-10"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">اسم النشاط التجاري (المحمصة / المقهى / المورد / المزرعة)</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="مثال: محمصة الريان"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pr-10"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">المدينة</Label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="city"
                      type="text"
                      placeholder="مثال: الرياض"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pr-10"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {role && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">نوع الحساب: <span className="font-medium text-foreground">
                      {role === 'roaster' ? 'محمصة' : 
                       role === 'cafe' ? 'مقهى' : 
                       role === 'supplier' ? 'مورد' : 
                       role === 'farmer' ? 'مزرعة' : 
                       role === 'maintenance' ? 'صيانة' : role}
                    </span></p>
                  </div>
                )}

                <Separator />

                {/* Commercial & Banking Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-primary" />
                    البيانات التجارية والبنكية
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    هذه البيانات مطلوبة لتفعيل حسابك واستلام المدفوعات
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="commercialRegistration">
                      رقم السجل التجاري <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="commercialRegistration"
                        type="text"
                        placeholder="أدخل رقم السجل التجاري"
                        value={commercialRegistration}
                        onChange={(e) => setCommercialRegistration(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Commercial Registration Image Upload */}
                  <div className="space-y-2">
                    <Label>
                      صورة السجل التجاري <span className="text-destructive">*</span>
                    </Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        commercialRegImage 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-muted-foreground/30 hover:border-primary/50'
                      }`}
                      onClick={() => commercialRegInputRef.current?.click()}
                    >
                      {isUploadingCommercial ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">جاري الرفع...</span>
                        </div>
                      ) : commercialRegImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">تم رفع الملف بنجاح</span>
                          <span className="text-xs text-muted-foreground">اضغط لتغيير الملف</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Image className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">اضغط لرفع صورة السجل التجاري</span>
                          <span className="text-xs text-muted-foreground">(صورة أو PDF - بحد أقصى 5MB)</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={commercialRegInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleDocumentUpload(e, 'commercial')}
                      className="hidden"
                    />
                  </div>

                  {/* National Address Image Upload */}
                  <div className="space-y-2">
                    <Label>
                      صورة العنوان الوطني <span className="text-destructive">*</span>
                    </Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        nationalAddressImage 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-muted-foreground/30 hover:border-primary/50'
                      }`}
                      onClick={() => nationalAddressInputRef.current?.click()}
                    >
                      {isUploadingNational ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">جاري الرفع...</span>
                        </div>
                      ) : nationalAddressImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">تم رفع الملف بنجاح</span>
                          <span className="text-xs text-muted-foreground">اضغط لتغيير الملف</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Image className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">اضغط لرفع صورة العنوان الوطني</span>
                          <span className="text-xs text-muted-foreground">(صورة أو PDF - بحد أقصى 5MB)</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={nationalAddressInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleDocumentUpload(e, 'national')}
                      className="hidden"
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <Label htmlFor="bankName">
                      اسم البنك <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Landmark className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="bankName"
                        type="text"
                        placeholder="مثال: بنك الراجحي"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="pr-10"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">
                      رقم الحساب البنكي <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="bankAccountNumber"
                        type="text"
                        placeholder="أدخل رقم الحساب"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iban">رقم الآيبان (IBAN)</Label>
                    <div className="relative">
                      <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="iban"
                        type="text"
                        placeholder="SA0000000000000000000000"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="coffee"
                  size="lg"
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 ml-2" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>

                <Separator />

                {/* Settings & Logout Section */}
                <div className="space-y-3">
                  <Link to="/supplier-notifications" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Settings className="w-5 h-5" />
                      الإعدادات والتنبيهات
                    </Button>
                  </Link>
                  
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                        جاري الخروج...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5 ml-2" />
                        تسجيل الخروج
                      </>
                    )}
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Profile;