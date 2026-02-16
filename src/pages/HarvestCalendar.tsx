import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Calendar, Coffee } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface HarvestInfo {
  country_ar: string;
  country_en: string;
  flag: string;
  mainHarvest_ar: string;
  mainHarvest_en: string;
  secondary_ar: string | null;
  secondary_en: string | null;
  peak_ar: string;
  peak_en: string;
}

const harvestData: HarvestInfo[] = [
  { country_ar: "إثيوبيا", country_en: "Ethiopia", flag: "🇪🇹", mainHarvest_ar: "أكتوبر - ديسمبر", mainHarvest_en: "October - December", secondary_ar: "مارس - مايو", secondary_en: "March - May", peak_ar: "نوفمبر", peak_en: "November" },
  { country_ar: "كولومبيا", country_en: "Colombia", flag: "🇨🇴", mainHarvest_ar: "سبتمبر - ديسمبر", mainHarvest_en: "September - December", secondary_ar: "أبريل - يونيو", secondary_en: "April - June", peak_ar: "أكتوبر - نوفمبر", peak_en: "October - November" },
  { country_ar: "البرازيل", country_en: "Brazil", flag: "🇧🇷", mainHarvest_ar: "مايو - سبتمبر", mainHarvest_en: "May - September", secondary_ar: null, secondary_en: null, peak_ar: "يونيو - أغسطس", peak_en: "June - August" },
  { country_ar: "كينيا", country_en: "Kenya", flag: "🇰🇪", mainHarvest_ar: "أكتوبر - ديسمبر", mainHarvest_en: "October - December", secondary_ar: "يونيو - أغسطس", secondary_en: "June - August", peak_ar: "نوفمبر", peak_en: "November" },
  { country_ar: "غواتيمالا", country_en: "Guatemala", flag: "🇬🇹", mainHarvest_ar: "ديسمبر - مارس", mainHarvest_en: "December - March", secondary_ar: null, secondary_en: null, peak_ar: "يناير - فبراير", peak_en: "January - February" },
  { country_ar: "كوستاريكا", country_en: "Costa Rica", flag: "🇨🇷", mainHarvest_ar: "نوفمبر - مارس", mainHarvest_en: "November - March", secondary_ar: null, secondary_en: null, peak_ar: "ديسمبر - فبراير", peak_en: "December - February" },
  { country_ar: "بنما", country_en: "Panama", flag: "🇵🇦", mainHarvest_ar: "ديسمبر - مارس", mainHarvest_en: "December - March", secondary_ar: null, secondary_en: null, peak_ar: "يناير - فبراير", peak_en: "January - February" },
  { country_ar: "هندوراس", country_en: "Honduras", flag: "🇭🇳", mainHarvest_ar: "نوفمبر - أبريل", mainHarvest_en: "November - April", secondary_ar: null, secondary_en: null, peak_ar: "يناير - مارس", peak_en: "January - March" },
  { country_ar: "السلفادور", country_en: "El Salvador", flag: "🇸🇻", mainHarvest_ar: "نوفمبر - فبراير", mainHarvest_en: "November - February", secondary_ar: null, secondary_en: null, peak_ar: "ديسمبر - يناير", peak_en: "December - January" },
  { country_ar: "بيرو", country_en: "Peru", flag: "🇵🇪", mainHarvest_ar: "مايو - سبتمبر", mainHarvest_en: "May - September", secondary_ar: null, secondary_en: null, peak_ar: "يونيو - أغسطس", peak_en: "June - August" },
  { country_ar: "إندونيسيا", country_en: "Indonesia", flag: "🇮🇩", mainHarvest_ar: "مايو - سبتمبر", mainHarvest_en: "May - September", secondary_ar: null, secondary_en: null, peak_ar: "يونيو - أغسطس", peak_en: "June - August" },
  { country_ar: "اليمن", country_en: "Yemen", flag: "🇾🇪", mainHarvest_ar: "أكتوبر - ديسمبر", mainHarvest_en: "October - December", secondary_ar: null, secondary_en: null, peak_ar: "نوفمبر", peak_en: "November" },
  { country_ar: "رواندا", country_en: "Rwanda", flag: "🇷🇼", mainHarvest_ar: "مارس - يونيو", mainHarvest_en: "March - June", secondary_ar: null, secondary_en: null, peak_ar: "أبريل - مايو", peak_en: "April - May" },
  { country_ar: "بوروندي", country_en: "Burundi", flag: "🇧🇮", mainHarvest_ar: "مارس - يونيو", mainHarvest_en: "March - June", secondary_ar: null, secondary_en: null, peak_ar: "أبريل - مايو", peak_en: "April - May" },
  { country_ar: "تنزانيا", country_en: "Tanzania", flag: "🇹🇿", mainHarvest_ar: "يوليو - ديسمبر", mainHarvest_en: "July - December", secondary_ar: null, secondary_en: null, peak_ar: "أغسطس - أكتوبر", peak_en: "August - October" },
  { country_ar: "المكسيك", country_en: "Mexico", flag: "🇲🇽", mainHarvest_ar: "نوفمبر - مارس", mainHarvest_en: "November - March", secondary_ar: null, secondary_en: null, peak_ar: "ديسمبر - فبراير", peak_en: "December - February" },
];

const months_ar = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const months_en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const HarvestCalendar = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const currentMonth = new Date().getMonth();

  const isArabic = language === 'ar';
  const months = isArabic ? months_ar : months_en;
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const isInSeason = (harvest: HarvestInfo) => {
    const currentMonthName_ar = months_ar[currentMonth];
    const currentMonthName_en = months_en[currentMonth];
    return harvest.mainHarvest_ar.includes(currentMonthName_ar) || 
           harvest.mainHarvest_en.includes(currentMonthName_en) ||
           (harvest.secondary_ar && harvest.secondary_ar.includes(currentMonthName_ar)) ||
           (harvest.secondary_en && harvest.secondary_en.includes(currentMonthName_en));
  };

  const getCountry = (h: HarvestInfo) => isArabic ? h.country_ar : h.country_en;
  const getMainHarvest = (h: HarvestInfo) => isArabic ? h.mainHarvest_ar : h.mainHarvest_en;
  const getSecondary = (h: HarvestInfo) => isArabic ? h.secondary_ar : h.secondary_en;
  const getPeak = (h: HarvestInfo) => isArabic ? h.peak_ar : h.peak_en;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir={dir}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isArabic ? "تقويم مواسم الحصاد" : "Harvest Calendar"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic ? "الشهر الحالي:" : "Current month:"}{" "}
              <span className="font-semibold text-primary">{months[currentMonth]}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <BackArrow className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
              {isArabic ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Button>
          </div>
        </div>

        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              {isArabic ? "المحاصيل في موسمها الآن" : "Currently in Season"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {harvestData
                .filter((h) => isInSeason(h))
                .map((h) => (
                  <div key={h.country_en} className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                    <span className="text-xl">{h.flag}</span>
                    <span className="font-medium">{getCountry(h)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {harvestData.map((harvest) => {
            const inSeason = isInSeason(harvest);
            return (
              <Card key={harvest.country_en} className={inSeason ? "border-primary/50 bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{harvest.flag}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{getCountry(harvest)}</h3>
                      {inSeason && (
                        <span className="text-xs text-primary font-medium">
                          {isArabic ? "● في الموسم الآن" : "● In Season Now"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {isArabic ? "الموسم الرئيسي:" : "Main Season:"}
                      </span>
                      <span className="font-medium">{getMainHarvest(harvest)}</span>
                    </div>
                    {getSecondary(harvest) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {isArabic ? "موسم ثانوي:" : "Secondary:"}
                        </span>
                        <span className="font-medium">{getSecondary(harvest)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {isArabic ? "ذروة الموسم:" : "Peak Season:"}
                      </span>
                      <span className="font-medium text-primary">{getPeak(harvest)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default HarvestCalendar;
