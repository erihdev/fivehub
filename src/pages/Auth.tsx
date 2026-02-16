import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Coffee, Mail, Lock, User, Loader2, Building2, Phone, MapPin, FileText, ShieldAlert, Leaf, Wrench, Check, Crown, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { HandPatternBackground, HandSVG } from "@/components/HandPattern";
import fivehubLogo from "@/assets/fivehub-logo.png";

interface Plan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  commission_rate: number;
  features: string[];
}

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const createSignupSchema = (role: string, maintenanceType: string[]) => z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  role: z.enum(["supplier", "roaster", "cafe", "farm", "maintenance"], { required_error: "يرجى اختيار نوع الحساب" }),
  companyName: z.string().min(2, 
    role === "farm" ? "اسم المزرعة يجب أن يكون حرفين على الأقل" : 
    role === "maintenance" ? "اسم الشركة/الفني يجب أن يكون حرفين على الأقل" :
    "اسم الشركة يجب أن يكون حرفين على الأقل"
  ),
  companyEmail: z.string().email("البريد الإلكتروني للشركة غير صحيح").optional().or(z.literal("")),
  companyPhone: z.string().min(10, "رقم الجوال يجب أن يكون 10 أرقام على الأقل"),
  city: z.string().min(2, "المدينة مطلوبة"),
  commercialRegister: (role === "farm" || role === "maintenance")
    ? z.string().optional().or(z.literal(""))
    : z.string()
        .length(10, "السجل التجاري يجب أن يتكون من 10 أرقام")
        .regex(/^\d{10}$/, "السجل التجاري يجب أن يتكون من 10 أرقام فقط"),
  maintenanceType: role === "maintenance" 
    ? z.array(z.string()).min(1, "يرجى اختيار نوع خدمة الصيانة على الأقل")
    : z.array(z.string()).optional(),
});

type SignupData = z.infer<ReturnType<typeof createSignupSchema>>;

interface LoginAttemptResult {
  allowed?: boolean;
  locked?: boolean;
  locked_until?: string;
  minutes_remaining?: number;
  attempts_remaining?: number;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role");
  const planFromUrl = searchParams.get("plan");
  
  const [isLogin, setIsLogin] = useState(!roleFromUrl); // If role is in URL, show signup form
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"supplier" | "roaster" | "cafe" | "farm" | "maintenance">(
    (roleFromUrl === "supplier" || roleFromUrl === "roaster" || roleFromUrl === "cafe" || roleFromUrl === "farm" || roleFromUrl === "maintenance") 
      ? roleFromUrl 
      : "roaster"
  );
  const [maintenanceType, setMaintenanceType] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [city, setCity] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockMinutes, setLockMinutes] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  
  // Subscription plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(planFromUrl || "");
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plansLoading, setPlansLoading] = useState(true);
  
  // Navigation via window.location to avoid React context issues
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast({
          title: "فشل تسجيل الدخول بجوجل",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدخول بجوجل",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Fetch subscription plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (data) {
        setPlans(data.map(p => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : []
        })));
        // Auto-select free plan if no plan selected
        if (!selectedPlanId && data.length > 0) {
          const freePlan = data.find(p => p.price_monthly === 0);
          if (freePlan) setSelectedPlanId(freePlan.id);
        }
      }
      setPlansLoading(false);
    };
    
    if (roleFromUrl) {
      fetchPlans();
    } else {
      setPlansLoading(false);
    }
  }, [roleFromUrl]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Check user role and redirect accordingly
        setTimeout(() => {
          checkUserRoleAndRedirect(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", userId)
      .single();

    if (userRole) {
      if (userRole.status === "pending") {
        window.location.href = "/pending-approval";
      } else if (userRole.status === "approved") {
        // Admin and staff roles go to admin landing
        if (userRole.role === "admin") {
          window.location.href = "/admin-landing";
        } else if (userRole.role === "supervisor" || userRole.role === "support" || userRole.role === "viewer") {
          // Staff roles - redirect to admin landing with their permissions
          window.location.href = "/admin-landing";
        } else if (userRole.role === "supplier") {
          window.location.href = "/supplier-dashboard";
        } else if (userRole.role === "roaster") {
          window.location.href = "/roaster-dashboard";
        } else if (userRole.role === "cafe") {
          window.location.href = "/cafe-dashboard";
        } else if (userRole.role === "farm") {
          window.location.href = "/farm-dashboard";
        } else if (userRole.role === "maintenance") {
          window.location.href = "/maintenance-dashboard";
        } else {
          window.location.href = "/";
        }
      } else {
        window.location.href = "/";
      }
    } else {
      window.location.href = "/";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          toast({
            title: "خطأ في البيانات",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Check if account is locked
        const { data: checkData } = await supabase.rpc('check_login_attempt', {
          p_email: email
        });
        const checkResult = checkData as LoginAttemptResult | null;

        if (checkResult && !checkResult.allowed) {
          setIsLocked(true);
          setLockMinutes(checkResult.minutes_remaining || 15);
          toast({
            title: "الحساب مقفل مؤقتاً",
            description: `تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة بعد ${checkResult.minutes_remaining} دقيقة.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Record failed login attempt
          const { data: failData } = await supabase.rpc('record_failed_login', {
            p_email: email
          });
          const failResult = failData as LoginAttemptResult | null;

          if (failResult?.locked) {
            setIsLocked(true);
            setLockMinutes(failResult.minutes_remaining || 15);
          } else if (failResult?.attempts_remaining !== undefined) {
            setAttemptsRemaining(failResult.attempts_remaining);
          }

          let message = "حدث خطأ أثناء تسجيل الدخول";
          if (error.message.includes("Invalid login credentials")) {
            message = `البريد الإلكتروني أو كلمة المرور غير صحيحة${failResult?.attempts_remaining ? ` (${failResult.attempts_remaining} محاولات متبقية)` : ''}`;
          }
          toast({
            title: "فشل تسجيل الدخول",
            description: message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Clear login attempts on successful login
        await supabase.rpc('clear_login_attempts', { p_email: email });
        setAttemptsRemaining(null);
        setIsLocked(false);

        toast({
          title: "تم تسجيل الدخول",
          description: "مرحباً بك!",
        });
      } else {
        const signupData = {
          email,
          password,
          fullName,
          role,
          companyName,
          companyEmail,
          companyPhone,
          city,
          commercialRegister,
          maintenanceType: role === "maintenance" ? maintenanceType : [],
        };

        const result = createSignupSchema(role, maintenanceType).safeParse(signupData);
        if (!result.success) {
          toast({
            title: "خطأ في البيانات",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (authError) {
          let message = "حدث خطأ أثناء إنشاء الحساب";
          if (authError.message.includes("already registered")) {
            message = "هذا البريد الإلكتروني مسجل مسبقاً";
          }
          toast({
            title: "فشل إنشاء الحساب",
            description: message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Create user role record
        if (authData.user) {
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: authData.user.id,
            role: role,
            status: "pending",
            company_name: companyName,
            company_email: companyEmail || null,
            company_phone: companyPhone || null,
            city: city || null,
            commercial_register: commercialRegister || null,
            maintenance_type: role === "maintenance" ? maintenanceType : null,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
          });

          if (roleError) {
            console.error("Error creating user role:", roleError);
          }

          // Create subscription with the selected plan from the form
          if (selectedPlanId) {
            const startDate = new Date();
            const endDate = new Date();
            if (billingCycle === 'monthly') {
              endDate.setMonth(endDate.getMonth() + 1);
            } else {
              endDate.setFullYear(endDate.getFullYear() + 1);
            }

            // Check if it's the free plan
            const selectedPlan = plans.find(p => p.id === selectedPlanId);
            const isFree = selectedPlan?.price_monthly === 0;

            const { error: subError } = await supabase.from("user_subscriptions").insert({
              user_id: authData.user.id,
              plan_id: selectedPlanId,
              billing_cycle: billingCycle,
              status: isFree ? 'active' : 'pending',
              starts_at: startDate.toISOString(),
              ends_at: endDate.toISOString(),
            });

            if (subError) {
              console.error("Error creating subscription:", subError);
            }
          }
        }

        toast({
          title: "تم إنشاء الحساب",
          description: "حسابك قيد المراجعة. سيتم إعلامك عند الموافقة.",
        });

        window.location.href = "/pending-approval";
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90 font-arabic flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Hand Pattern Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <HandSVG className="absolute -top-20 -right-20 w-80 h-[480px] rotate-12 opacity-[0.08]" color="white" variant="solid" />
        <HandSVG className="absolute -bottom-32 -left-24 w-96 h-[576px] -rotate-12 opacity-[0.06]" color="white" variant="solid" />
        <HandSVG className="absolute top-1/4 left-1/4 w-40 h-60 rotate-6 opacity-[0.04]" color="white" variant="outline" />
      </div>
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fivehub-gold/20 rounded-full blur-3xl" />

      <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={fivehubLogo} alt="FIVE HUB" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-display">
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "سجل دخولك للوصول إلى بياناتك"
              : "أنشئ حسابك للانضمام إلى FIVE HUB"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                تم قفل الحساب مؤقتاً بسبب تجاوز الحد الأقصى لمحاولات تسجيل الدخول.
                يرجى المحاولة بعد {lockMinutes} دقيقة.
              </AlertDescription>
            </Alert>
          )}
          {attemptsRemaining !== null && attemptsRemaining <= 2 && !isLocked && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                تحذير: متبقي {attemptsRemaining} محاولات قبل قفل الحساب مؤقتاً.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Show selected role badge when role is from URL */}
                {roleFromUrl && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    {role === "farm" && <Leaf className="h-5 w-5 text-primary" />}
                    {role === "supplier" && <Building2 className="h-5 w-5 text-primary" />}
                    {role === "roaster" && <Coffee className="h-5 w-5 text-primary" />}
                    {role === "cafe" && <Coffee className="h-5 w-5 text-primary" />}
                    {role === "maintenance" && <Wrench className="h-5 w-5 text-primary" />}
                    <span className="font-medium text-primary">
                      {role === "farm" ? "تسجيل كمزرعة" : 
                       role === "supplier" ? "تسجيل كمورد" : 
                       role === "roaster" ? "تسجيل كمحمصة" : 
                       role === "cafe" ? "تسجيل كمقهى" : 
                       "تسجيل كفني صيانة"}
                    </span>
                  </div>
                )}

                {/* Subscription Plan Selection - Only show when registering with a role */}
                {roleFromUrl && plans.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">اختر باقة الاشتراك</Label>
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-3 py-1 text-xs rounded-md transition-all ${
                            billingCycle === 'monthly' ? 'bg-primary text-white' : 'hover:bg-accent'
                          }`}
                        >
                          شهري
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${
                            billingCycle === 'yearly' ? 'bg-primary text-white' : 'hover:bg-accent'
                          }`}
                        >
                          سنوي
                          <Badge variant="secondary" className="text-[10px] px-1">وفر 17%</Badge>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {plansLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        plans.map((plan, index) => {
                          const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                          const isPopular = index === 1;
                          const isSelected = selectedPlanId === plan.id;

                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`relative p-3 rounded-lg border-2 text-right transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                  : 'border-muted hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              {isPopular && (
                                <Badge className="absolute -top-2 left-3 text-[10px] gap-0.5">
                                  <Star className="w-2.5 h-2.5" />
                                  الأكثر شعبية
                                </Badge>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isSelected ? 'bg-primary text-white' : 'bg-muted'
                                  }`}>
                                    {plan.name.toLowerCase().includes('enterprise') ? (
                                      <Building2 className="w-4 h-4" />
                                    ) : plan.name.toLowerCase().includes('professional') ? (
                                      <Crown className="w-4 h-4" />
                                    ) : (
                                      <Zap className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{plan.name_ar}</p>
                                    <p className="text-xs text-muted-foreground">عمولة {plan.commission_rate}%</p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-lg">{price.toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {plan.currency}/{billingCycle === 'monthly' ? 'شهر' : 'سنة'}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1/2 -translate-y-1/2 right-2">
                                  <Check className="w-5 h-5 text-primary" />
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Role Selection - Only show if no role in URL */}
                {!roleFromUrl && (
                  <div className="space-y-3">
                    <Label>نوع الحساب <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-5 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("farm")}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          role === "farm"
                            ? "border-primary bg-primary/20 text-primary shadow-lg ring-2 ring-primary/50"
                            : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Leaf className="mb-2 h-5 w-5" />
                        <span className="text-xs font-medium">مزرعة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("supplier")}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          role === "supplier"
                            ? "border-primary bg-primary/20 text-primary shadow-lg ring-2 ring-primary/50"
                            : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Building2 className="mb-2 h-5 w-5" />
                        <span className="text-xs font-medium">مورد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("roaster")}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          role === "roaster"
                            ? "border-primary bg-primary/20 text-primary shadow-lg ring-2 ring-primary/50"
                            : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Coffee className="mb-2 h-5 w-5" />
                        <span className="text-xs font-medium">محمصة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("cafe")}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          role === "cafe"
                            ? "border-primary bg-primary/20 text-primary shadow-lg ring-2 ring-primary/50"
                            : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Coffee className="mb-2 h-5 w-5" />
                        <span className="text-xs font-medium">مقهى</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("maintenance")}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          role === "maintenance"
                            ? "border-primary bg-primary/20 text-primary shadow-lg ring-2 ring-primary/50"
                            : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Wrench className="mb-2 h-5 w-5" />
                        <span className="text-xs font-medium">صيانة</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Maintenance Type Selection - Only for maintenance role */}
                {role === "maintenance" && (
                  <div className="space-y-3">
                    <Label>نوع خدمة الصيانة <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (maintenanceType.includes("roaster")) {
                            setMaintenanceType(maintenanceType.filter(t => t !== "roaster"));
                          } else {
                            setMaintenanceType([...maintenanceType, "roaster"]);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
                          maintenanceType.includes("roaster")
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-muted bg-popover hover:bg-accent"
                        }`}
                      >
                        <Coffee className="h-4 w-4" />
                        <span className="text-sm">صيانة محامص</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (maintenanceType.includes("cafe")) {
                            setMaintenanceType(maintenanceType.filter(t => t !== "cafe"));
                          } else {
                            setMaintenanceType([...maintenanceType, "cafe"]);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
                          maintenanceType.includes("cafe")
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-muted bg-popover hover:bg-accent"
                        }`}
                      >
                        <Coffee className="h-4 w-4" />
                        <span className="text-sm">صيانة مقاهي</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">يمكنك اختيار أكثر من نوع</p>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="أدخل اسمك"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pr-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    {role === "farm" ? "اسم المزرعة" : role === "roaster" ? "اسم المحمصة" : role === "cafe" ? "اسم المقهى" : role === "maintenance" ? "اسم الشركة / الفني" : "اسم الشركة"} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    {role === "farm" ? (
                      <Leaf className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    ) : role === "maintenance" ? (
                      <Wrench className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    ) : (
                      <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    )}
                    <Input
                      id="companyName"
                      type="text"
                      placeholder={role === "farm" ? "أدخل اسم المزرعة" : role === "roaster" ? "أدخل اسم المحمصة" : role === "cafe" ? "أدخل اسم المقهى" : role === "maintenance" ? "أدخل اسم الشركة أو اسمك" : "أدخل اسم الشركة"}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pr-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Company Phone */}
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">رقم الجوال <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="companyPhone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">المدينة <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="city"
                      type="text"
                      placeholder="الرياض، جدة، ..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pr-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Commercial Register - Optional for farms */}
                <div className="space-y-2">
                  <Label htmlFor="commercialRegister">
                    السجل التجاري {(role !== "farm" && role !== "maintenance") && <span className="text-destructive">*</span>}
                    {(role === "farm" || role === "maintenance") && <span className="text-muted-foreground text-xs">(اختياري)</span>}
                  </Label>
                  <div className="relative">
                    <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="commercialRegister"
                      type="text"
                      placeholder={(role === "farm" || role === "maintenance") ? "اختياري - أدخل 10 أرقام إن وجد" : "أدخل 10 أرقام"}
                      maxLength={10}
                      value={commercialRegister}
                      onChange={(e) => setCommercialRegister(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="coffee"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : isLogin ? (
                "تسجيل الدخول"
              ) : (
                "إنشاء الحساب"
              )}
            </Button>
          </form>

          {isLogin && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLocked}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                تسجيل الدخول بحساب جوجل
              </Button>
            </>
          )}

          <div className="mt-6 text-center space-y-2">
            {isLogin && (
              <a
                href="/forgot-password"
                className="text-sm text-coffee-gold hover:text-coffee-gold/80 transition-colors block"
              >
                نسيت كلمة المرور؟
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
              disabled={isLoading}
            >
              {isLogin ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "لديك حساب؟ سجل دخولك"}
            </button>
            <a
              href="/terms"
              className="text-xs text-muted-foreground hover:text-coffee-gold transition-colors"
            >
              الشروط والأحكام
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
