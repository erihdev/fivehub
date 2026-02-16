import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Coffee, Lock, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const hasRecoveryParams = searchParams.get('type') === 'recovery' || searchParams.get('access_token');
      
      // Only show error if user came from a recovery email link but session is invalid
      if (!session) {
        if (hasRecoveryParams) {
          // User came from email link but session is invalid
          toast({
            title: "رابط غير صالح",
            description: "يرجى طلب رابط استعادة كلمة المرور مرة أخرى",
            variant: "destructive",
          });
        }
        // Silently redirect if no recovery params (accidental navigation)
        navigate("/auth");
      }
    };
    checkSession();
  }, [navigate, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = passwordSchema.safeParse({ password, confirmPassword });
      if (!result.success) {
        toast({
          title: "خطأ في البيانات",
          description: result.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: "فشل تحديث كلمة المرور",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast({
        title: "تم تحديث كلمة المرور",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center p-6" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">تم تحديث كلمة المرور</CardTitle>
            <CardDescription>
              تم تحديث كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="coffee"
              onClick={() => navigate("/auth")}
              className="mt-4"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              الذهاب لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic flex items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-coffee-gold/10 flex items-center justify-center">
              <Coffee className="w-8 h-8 text-coffee-gold" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            أدخل كلمة المرور الجديدة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
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
              <p className="text-xs text-muted-foreground">
                8 أحرف على الأقل، تحتوي على حرف كبير وصغير ورقم
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  جاري التحديث...
                </>
              ) : (
                "تحديث كلمة المرور"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;
