import { Coffee, ArrowRight, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

const Terms = () => {
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const sections = [
    {
      title: language === 'ar' ? 'القبول والموافقة' : 'Acceptance',
      content: language === 'ar'
        ? 'باستخدامك لمنصة دال، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.'
        : 'By using Dal platform, you agree to these terms and conditions. If you do not agree to any part, please do not use the platform.',
    },
    {
      title: language === 'ar' ? 'التسجيل والحساب' : 'Registration & Account',
      content: language === 'ar'
        ? 'يجب عليك تقديم معلومات صحيحة ودقيقة عند التسجيل. أنت مسؤول عن الحفاظ على سرية حسابك وكلمة المرور الخاصة بك.'
        : 'You must provide accurate and true information when registering. You are responsible for maintaining the confidentiality of your account and password.',
    },
    {
      title: language === 'ar' ? 'استخدام المنصة' : 'Platform Usage',
      content: language === 'ar'
        ? 'المنصة مخصصة لتجارة القهوة الخضراء بين الموردين والمحامص. يُحظر استخدام المنصة لأي أغراض غير قانونية أو غير مصرح بها.'
        : 'The platform is designed for green coffee trade between suppliers and roasters. Using the platform for any illegal or unauthorized purposes is prohibited.',
    },
    {
      title: language === 'ar' ? 'المنتجات والأسعار' : 'Products & Pricing',
      content: language === 'ar'
        ? 'الموردون مسؤولون عن دقة المعلومات المقدمة عن منتجاتهم وأسعارها. المنصة لا تضمن دقة هذه المعلومات ولا تتحمل مسؤولية أي أخطاء.'
        : 'Suppliers are responsible for the accuracy of information provided about their products and prices. The platform does not guarantee accuracy and is not liable for any errors.',
    },
    {
      title: language === 'ar' ? 'الخصوصية والبيانات' : 'Privacy & Data',
      content: language === 'ar'
        ? 'نحن نحترم خصوصيتك ونحمي بياناتك الشخصية. لن نشارك معلوماتك مع أطراف ثالثة دون موافقتك، إلا إذا كان ذلك مطلوباً بموجب القانون.'
        : 'We respect your privacy and protect your personal data. We will not share your information with third parties without your consent, unless required by law.',
    },
    {
      title: language === 'ar' ? 'الملكية الفكرية' : 'Intellectual Property',
      content: language === 'ar'
        ? 'جميع المحتويات على المنصة، بما في ذلك الشعارات والتصاميم والنصوص، هي ملكية لمنصة دال ومحمية بموجب قوانين الملكية الفكرية.'
        : 'All content on the platform, including logos, designs, and text, is the property of Dal platform and is protected under intellectual property laws.',
    },
    {
      title: language === 'ar' ? 'إخلاء المسؤولية' : 'Disclaimer',
      content: language === 'ar'
        ? 'المنصة مقدمة "كما هي" دون أي ضمانات. لا نتحمل مسؤولية أي خسائر أو أضرار ناتجة عن استخدام المنصة أو الاعتماد على المعلومات المقدمة فيها.'
        : 'The platform is provided "as is" without any warranties. We are not liable for any losses or damages resulting from using the platform or relying on information provided.',
    },
    {
      title: language === 'ar' ? 'التعديلات' : 'Modifications',
      content: language === 'ar'
        ? 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال إشعار على المنصة.'
        : 'We reserve the right to modify these terms at any time. You will be notified of any material changes via email or through a notice on the platform.',
    },
    {
      title: language === 'ar' ? 'القانون المطبق' : 'Governing Law',
      content: language === 'ar'
        ? 'تخضع هذه الشروط لقوانين المملكة العربية السعودية. أي نزاعات ستُحل في المحاكم المختصة في المملكة العربية السعودية.'
        : 'These terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes will be resolved in the competent courts of Saudi Arabia.',
    },
  ];

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-coffee-gold/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-coffee-gold" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar'
              ? 'آخر تحديث: ديسمبر 2024'
              : 'Last updated: December 2024'}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-foreground leading-relaxed">
              {language === 'ar'
                ? 'مرحباً بك في منصة دال لتجارة القهوة المختصة. هذه الشروط والأحكام تحكم استخدامك للمنصة وتحدد حقوقك والتزاماتك. يرجى قراءتها بعناية قبل التسجيل واستخدام خدماتنا.'
                : 'Welcome to Dal specialty coffee trading platform. These terms and conditions govern your use of the platform and define your rights and obligations. Please read them carefully before registering and using our services.'}
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-coffee-gold" />
                  <span>{index + 1}. {section.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-foreground mb-2">
              {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar'
                ? 'إذا كانت لديك أي أسئلة حول هذه الشروط، يرجى التواصل معنا عبر البريد الإلكتروني:'
                : 'If you have any questions about these terms, please contact us via email:'}
            </p>
            <a
              href="mailto:support@dal.coffee"
              className="text-coffee-gold hover:underline mt-2 inline-block"
            >
              support@dal.coffee
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Terms;
