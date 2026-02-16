import { Link, useNavigate } from "react-router-dom";
import { Coffee, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";

const PendingApproval = () => {
  const { language, t, dir } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
      <div className="container mx-auto px-6">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="w-20 h-20 rounded-full bg-coffee-gold/10 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-coffee-gold" />
            </div>
            
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">
              {language === 'ar' ? 'طلبك قيد المراجعة' : 'Your Request is Under Review'}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {language === 'ar' 
                ? 'شكراً لتسجيلك! تم استلام طلبك وجاري مراجعته من قبل الإدارة. سيتم إشعارك عبر البريد الإلكتروني عند الموافقة على حسابك.'
                : 'Thank you for registering! Your request has been received and is being reviewed by our team. You will be notified via email once your account is approved.'}
            </p>

            <div className="space-y-3 text-sm text-muted-foreground mb-8">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{language === 'ar' ? 'تم استلام الطلب' : 'Request received'}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-coffee-gold" />
                <span>{language === 'ar' ? 'جاري المراجعة' : 'Under review'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link to="/">
                <Button variant="coffee" className="w-full">
                  <Coffee className="w-4 h-4 ml-2" />
                  {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PendingApproval;
