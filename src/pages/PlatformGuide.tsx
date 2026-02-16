import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, Sprout, Package, Flame, Coffee, Wrench, 
  Crown, Zap, Building2, Check, ArrowRight, Users,
  Shield, Globe, TrendingUp, Award, Clock, FileText,
  MapPin, Phone, Mail, Star, Truck, BarChart3, Loader2
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import fivehubLogo from "@/assets/fivehub-logo-official.png";

const PlatformGuide = () => {
  const { language, dir } = useLanguage();
  const isArabic = language === "ar";
  const [generating, setGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const roles = [
    {
      id: "farm",
      icon: Sprout,
      name: { ar: "المزارع", en: "Farm" },
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      description: {
        ar: "إدارة المحاصيل والعروض الموسمية والتعاقد المباشر مع الموردين",
        en: "Manage crops, seasonal offers, and direct contracts with suppliers"
      },
      features: {
        ar: [
          "إدارة المحاصيل والمواسم",
          "عروض الحصاد المبكر",
          "التعاقد المباشر مع الموردين",
          "تتبع GPS للشحنات",
          "تقارير الأداء"
        ],
        en: [
          "Crop & season management",
          "Early harvest offers",
          "Direct supplier contracts",
          "GPS shipment tracking",
          "Performance reports"
        ]
      },
      registrationSteps: {
        ar: [
          "اختر 'مزرعة' من قائمة التسجيل",
          "أدخل معلومات المزرعة (الاسم، الموقع)",
          "اختر خطة الاشتراك المناسبة",
          "أكمل بيانات الملف الشخصي",
          "ابدأ بإضافة محاصيلك"
        ],
        en: [
          "Select 'Farm' from registration menu",
          "Enter farm info (name, location)",
          "Choose appropriate subscription plan",
          "Complete profile information",
          "Start adding your crops"
        ]
      }
    },
    {
      id: "supplier",
      icon: Package,
      name: { ar: "المورد", en: "Supplier" },
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      description: {
        ar: "إدارة مخزون البن الأخضر والعروض والمزادات والعقود",
        en: "Manage green coffee inventory, offers, auctions, and contracts"
      },
      features: {
        ar: [
          "إدارة مخزون البن الأخضر",
          "إنشاء العروض والمزادات",
          "عقود التوريد المباشر",
          "تحليلات المبيعات",
          "نظام التقييم والشارات"
        ],
        en: [
          "Green coffee inventory management",
          "Create offers & auctions",
          "Direct supply contracts",
          "Sales analytics",
          "Rating & badge system"
        ]
      },
      registrationSteps: {
        ar: [
          "اختر 'مورد' من قائمة التسجيل",
          "أدخل معلومات الشركة والسجل التجاري",
          "اختر خطة الاشتراك المناسبة",
          "ارفع المستندات المطلوبة (السجل، العنوان الوطني)",
          "ابدأ بإضافة منتجاتك"
        ],
        en: [
          "Select 'Supplier' from registration menu",
          "Enter company info & commercial registration",
          "Choose appropriate subscription plan",
          "Upload required documents",
          "Start adding your products"
        ]
      }
    },
    {
      id: "roaster",
      icon: Flame,
      name: { ar: "المحمصة", en: "Roaster" },
      color: "from-orange-500 to-amber-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      description: {
        ar: "شراء البن الأخضر وإدارة التحميص والبيع للمقاهي",
        en: "Purchase green coffee, manage roasting, and sell to cafes"
      },
      features: {
        ar: [
          "شراء البن من الموردين",
          "سجل التحميص والوصفات",
          "إدارة منتجات البن المحمص",
          "البيع للمقاهي",
          "تحليلات التحميص"
        ],
        en: [
          "Buy coffee from suppliers",
          "Roasting log & recipes",
          "Manage roasted products",
          "Sell to cafes",
          "Roasting analytics"
        ]
      },
      registrationSteps: {
        ar: [
          "اختر 'محمصة' من قائمة التسجيل",
          "أدخل معلومات المحمصة والسجل التجاري",
          "اختر خطة الاشتراك المناسبة",
          "أكمل بيانات الملف الشخصي",
          "ابدأ بتصفح عروض الموردين"
        ],
        en: [
          "Select 'Roaster' from registration menu",
          "Enter roastery info & commercial registration",
          "Choose appropriate subscription plan",
          "Complete profile information",
          "Start browsing supplier offers"
        ]
      }
    },
    {
      id: "cafe",
      icon: Coffee,
      name: { ar: "المقهى", en: "Cafe" },
      color: "from-rose-500 to-pink-600",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-800",
      description: {
        ar: "شراء البن المحمص وإدارة المخزون وتتبع العملاء",
        en: "Purchase roasted coffee, manage inventory, and track customers"
      },
      features: {
        ar: [
          "شراء البن من المحامص",
          "إدارة المخزون",
          "تتبع العملاء والولاء",
          "طلبات التوريد المخصصة",
          "الانضمام لتحالفات الشراء"
        ],
        en: [
          "Buy coffee from roasters",
          "Inventory management",
          "Customer & loyalty tracking",
          "Custom supply requests",
          "Join buying alliances"
        ]
      },
      registrationSteps: {
        ar: [
          "اختر 'مقهى' من قائمة التسجيل",
          "أدخل معلومات المقهى والموقع",
          "اختر خطة الاشتراك المناسبة",
          "أكمل بيانات الملف الشخصي",
          "ابدأ بتصفح منتجات المحامص"
        ],
        en: [
          "Select 'Cafe' from registration menu",
          "Enter cafe info & location",
          "Choose appropriate subscription plan",
          "Complete profile information",
          "Start browsing roaster products"
        ]
      }
    },
    {
      id: "maintenance",
      icon: Wrench,
      name: { ar: "الصيانة", en: "Maintenance" },
      color: "from-slate-500 to-gray-600",
      bgColor: "bg-slate-50 dark:bg-slate-950/30",
      borderColor: "border-slate-200 dark:border-slate-800",
      description: {
        ar: "تقديم خدمات الصيانة لمعدات القهوة والمحامص",
        en: "Provide maintenance services for coffee equipment and roasters"
      },
      features: {
        ar: [
          "استقبال طلبات الصيانة",
          "جدولة المواعيد",
          "تتبع الطلبات",
          "تقارير الخدمة",
          "نظام التقييم"
        ],
        en: [
          "Receive maintenance requests",
          "Schedule appointments",
          "Track requests",
          "Service reports",
          "Rating system"
        ]
      },
      registrationSteps: {
        ar: [
          "اختر 'صيانة' من قائمة التسجيل",
          "أدخل معلومات الخدمة والتخصص",
          "اختر خطة الاشتراك المناسبة",
          "أكمل بيانات الملف الشخصي",
          "ابدأ باستقبال طلبات الصيانة"
        ],
        en: [
          "Select 'Maintenance' from registration menu",
          "Enter service info & specialization",
          "Choose appropriate subscription plan",
          "Complete profile information",
          "Start receiving maintenance requests"
        ]
      }
    }
  ];

  const subscriptionPlans = [
    {
      name: { ar: "مجاني", en: "Free" },
      icon: Zap,
      price: { monthly: 0, yearly: 0 },
      commission: "10%",
      color: "from-gray-500 to-slate-600",
      features: {
        ar: ["تصفح العروض", "رسائل محدودة", "عمولة 10%"],
        en: ["Browse offers", "Limited messages", "10% commission"]
      }
    },
    {
      name: { ar: "احترافي", en: "Professional" },
      icon: Crown,
      price: { monthly: 299, yearly: 2990 },
      commission: "5%",
      color: "from-amber-500 to-yellow-600",
      popular: true,
      features: {
        ar: ["رسائل غير محدودة", "دعم أولوية", "تحليلات متقدمة", "عرض معلومات التواصل", "عمولة 5%"],
        en: ["Unlimited messages", "Priority support", "Advanced analytics", "View contact info", "5% commission"]
      }
    },
    {
      name: { ar: "مؤسسي", en: "Enterprise" },
      icon: Building2,
      price: { monthly: 599, yearly: 5990 },
      commission: "2.5%",
      color: "from-purple-500 to-indigo-600",
      features: {
        ar: ["كل ميزات الاحترافي", "دعم مخصص", "وصول API", "عقود مخصصة", "عمولة 2.5%"],
        en: ["All Professional features", "Dedicated support", "API access", "Custom contracts", "2.5% commission"]
      }
    }
  ];

  const platformStats = [
    { value: "500+", label: { ar: "مورد نشط", en: "Active Suppliers" }, icon: Package },
    { value: "200+", label: { ar: "محمصة", en: "Roasters" }, icon: Flame },
    { value: "1000+", label: { ar: "مقهى", en: "Cafes" }, icon: Coffee },
    { value: "50+", label: { ar: "مزرعة", en: "Farms" }, icon: Sprout }
  ];

  const keyFeatures = [
    { icon: Shield, title: { ar: "أمان عالي", en: "High Security" }, desc: { ar: "تشفير كامل وحماية البيانات", en: "Full encryption & data protection" } },
    { icon: Globe, title: { ar: "دعم متعدد اللغات", en: "Multi-language Support" }, desc: { ar: "العربية والإنجليزية", en: "Arabic & English" } },
    { icon: TrendingUp, title: { ar: "تحليلات ذكية", en: "Smart Analytics" }, desc: { ar: "تقارير وإحصائيات مفصلة", en: "Detailed reports & statistics" } },
    { icon: Truck, title: { ar: "تتبع الشحنات", en: "Shipment Tracking" }, desc: { ar: "GPS مباشر للطلبات", en: "Live GPS for orders" } },
    { icon: FileText, title: { ar: "فوترة إلكترونية", en: "E-Invoicing" }, desc: { ar: "متوافقة مع ZATCA", en: "ZATCA compliant" } },
    { icon: Award, title: { ar: "نظام الشارات", en: "Badge System" }, desc: { ar: "مكافآت للأداء المتميز", en: "Rewards for outstanding performance" } }
  ];

  const generatePDF = async () => {
    if (!contentRef.current) return;
    
    setGenerating(true);
    toast.info(isArabic ? "جاري إنشاء الملف، يرجى الانتظار..." : "Generating PDF, please wait...");
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      
      // Get all sections to capture
      const sections = contentRef.current.querySelectorAll('[data-pdf-section]');
      
      const canvasOptions = {
        scale: 3, // Higher quality for Arabic text
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        foreignObjectRendering: false, // Important for text rendering
        windowWidth: 1200,
        onclone: (clonedDoc: Document) => {
          // Ensure proper font rendering in cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif !important;
              direction: ${isArabic ? 'rtl' : 'ltr'} !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      };

      if (sections.length === 0) {
        // Fallback: capture entire content
        const canvas = await html2canvas(contentRef.current, canvasOptions);
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
        
        while (heightLeft > 0) {
          position = -(pageHeight - margin * 2) + (imgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position + margin, imgWidth, imgHeight);
          heightLeft -= (pageHeight - margin * 2);
        }
      } else {
        // Capture each section separately for better quality
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          
          // Wait a bit for fonts to load properly
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const canvas = await html2canvas(section, canvasOptions);
          
          const imgData = canvas.toDataURL('image/png', 1.0);
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (i > 0) {
            pdf.addPage();
          }
          
          // Center the image
          const xOffset = margin;
          
          // Handle tall sections that need multiple pages
          if (imgHeight > pageHeight - (margin * 2)) {
            // Calculate how many pages we need for this section
            const availableHeight = pageHeight - (margin * 2);
            let remainingHeight = imgHeight;
            let yOffset = 0;
            let isFirstPage = true;
            
            while (remainingHeight > 0) {
              if (!isFirstPage) {
                pdf.addPage();
              }
              
              // Calculate source and destination coordinates
              const sourceY = yOffset * (canvas.height / imgHeight);
              const sourceHeight = Math.min(availableHeight, remainingHeight) * (canvas.height / imgHeight);
              
              // Create a temporary canvas for this portion
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvas.width;
              tempCanvas.height = sourceHeight;
              const ctx = tempCanvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(
                  canvas,
                  0, sourceY, canvas.width, sourceHeight,
                  0, 0, canvas.width, sourceHeight
                );
                const portionData = tempCanvas.toDataURL('image/png', 1.0);
                const portionHeight = Math.min(availableHeight, remainingHeight);
                pdf.addImage(portionData, 'PNG', xOffset, margin, imgWidth, portionHeight);
              }
              
              yOffset += availableHeight;
              remainingHeight -= availableHeight;
              isFirstPage = false;
            }
          } else {
            pdf.addImage(imgData, 'PNG', xOffset, margin, imgWidth, imgHeight);
          }
        }
      }
      
      // Save PDF
      const fileName = isArabic ? "دليل_منصة_فايف_هب.pdf" : "FIVE_HUB_Platform_Guide.pdf";
      pdf.save(fileName);
      
      toast.success(isArabic ? "تم تحميل الملف بنجاح!" : "PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(isArabic ? "حدث خطأ في إنشاء الملف" : "Error generating PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isArabic ? 'rtl' : 'ltr'}`} dir={dir}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {isArabic ? "دليل منصة FIVE HUB" : "FIVE HUB Platform Guide"}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? "دليل شامل للتعريف بالمنصة وطريقة التسجيل" : "Complete guide to the platform and registration"}
              </p>
            </div>
          </div>
          <Button 
            onClick={generatePDF} 
            disabled={generating}
            className="gap-2"
            size="lg"
          >
            <Download className="w-5 h-5" />
            {generating ? (isArabic ? "جاري الإنشاء..." : "Generating...") : (isArabic ? "تحميل PDF" : "Download PDF")}
          </Button>
        </div>

        {/* Preview Content */}
        <div ref={contentRef} className="space-y-8">
          {/* Hero Section */}
          <Card data-pdf-section className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <img src={fivehubLogo} alt="FIVE HUB" className="h-20 mx-auto" />
              <h2 className="text-3xl font-bold">FIVE HUB</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {isArabic 
                  ? "منصة متكاملة لسلسلة توريد القهوة تربط بين المزارع والموردين والمحامص والمقاهي ومقدمي الصيانة"
                  : "A comprehensive coffee supply chain platform connecting farms, suppliers, roasters, cafes, and maintenance providers"
                }
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {platformStats.map((stat, i) => (
                  <div key={i} className="bg-background/80 rounded-lg p-4 text-center">
                    <stat.icon className="w-8 h-8 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? stat.label.ar : stat.label.en}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card data-pdf-section>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-primary" />
                {isArabic ? "المميزات الرئيسية" : "Key Features"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {keyFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <feature.icon className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <h4 className="font-semibold">
                        {isArabic ? feature.title.ar : feature.title.en}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? feature.desc.ar : feature.desc.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Roles */}
          <div className="space-y-6" data-pdf-section>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              {isArabic ? "أنواع المستخدمين وطريقة التسجيل" : "User Types & Registration"}
            </h2>
            
            {roles.map((role) => (
              <Card key={role.id} data-pdf-section className={`${role.bgColor} ${role.borderColor} border-2`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                      <role.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl">{isArabic ? role.name.ar : role.name.en}</h3>
                      <p className="text-sm font-normal text-muted-foreground">
                        {isArabic ? role.description.ar : role.description.en}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  {/* Features */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {isArabic ? "المميزات" : "Features"}
                    </h4>
                    <ul className="space-y-2">
                      {(isArabic ? role.features.ar : role.features.en).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Registration Steps */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-primary" />
                      {isArabic ? "خطوات التسجيل" : "Registration Steps"}
                    </h4>
                    <ol className="space-y-2">
                      {(isArabic ? role.registrationSteps.ar : role.registrationSteps.en).map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Subscription Plans */}
          <Card data-pdf-section>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                {isArabic ? "باقات الاشتراك" : "Subscription Plans"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {subscriptionPlans.map((plan, i) => (
                  <div 
                    key={i} 
                    className={`relative p-6 rounded-xl border-2 ${
                      plan.popular 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        {isArabic ? "الأكثر شعبية" : "Most Popular"}
                      </Badge>
                    )}
                    
                    <div className="text-center mb-4">
                      <plan.icon className="w-10 h-10 mx-auto text-primary mb-2" />
                      <h4 className="text-xl font-bold">
                        {isArabic ? plan.name.ar : plan.name.en}
                      </h4>
                    </div>
                    
                    <div className="text-center mb-4">
                      <span className="text-3xl font-bold text-primary">{plan.price.monthly}</span>
                      <span className="text-muted-foreground"> {isArabic ? "ريال/شهر" : "SAR/mo"}</span>
                    </div>
                    
                    <div className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-center py-2 rounded-lg mb-4">
                      {isArabic ? "العمولة" : "Commission"}: <strong>{plan.commission}</strong>
                    </div>
                    
                    <ul className="space-y-2">
                      {(isArabic ? plan.features.ar : plan.features.en).map((feature, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card data-pdf-section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                {isArabic ? "سجل الآن وانضم إلى مجتمع القهوة!" : "Register Now & Join the Coffee Community!"}
              </h3>
              <p className="mb-6 opacity-90">
                {isArabic 
                  ? "ابدأ رحلتك مع FIVE HUB اليوم واستفد من كل المميزات"
                  : "Start your journey with FIVE HUB today and benefit from all features"
                }
              </p>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-semibold">www.fivehub.sa</p>
                <p className="opacity-80">support@fivehub.sa</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlatformGuide;
