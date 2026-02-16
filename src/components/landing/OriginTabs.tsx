import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const OriginTabs = () => {
  const { language, dir } = useLanguage();

  const coffeeOrigins = {
    central_america: [
      { flag: "🇧🇴", name: language === "ar" ? "بوليفيا" : "Bolivia" },
      { flag: "🇧🇷", name: language === "ar" ? "البرازيل" : "Brazil" },
      { flag: "🇨🇴", name: language === "ar" ? "كولومبيا" : "Colombia" },
      { flag: "🇨🇷", name: language === "ar" ? "كوستاريكا" : "Costa Rica" },
      { flag: "🇪🇨", name: language === "ar" ? "الإكوادور" : "Ecuador" },
      { flag: "🇬🇹", name: language === "ar" ? "غواتيمالا" : "Guatemala" },
      { flag: "🇭🇳", name: language === "ar" ? "هندوراس" : "Honduras" },
      { flag: "🇲🇽", name: language === "ar" ? "المكسيك" : "Mexico" },
      { flag: "🇳🇮", name: language === "ar" ? "نيكاراغوا" : "Nicaragua" },
      { flag: "🇵🇦", name: language === "ar" ? "بنما" : "Panama" },
      { flag: "🇵🇪", name: language === "ar" ? "بيرو" : "Peru" },
      { flag: "🇸🇻", name: language === "ar" ? "السلفادور" : "El Salvador" },
    ],
    africa: [
      { flag: "🇪🇹", name: language === "ar" ? "إثيوبيا" : "Ethiopia" },
      { flag: "🇰🇪", name: language === "ar" ? "كينيا" : "Kenya" },
      { flag: "🇷🇼", name: language === "ar" ? "رواندا" : "Rwanda" },
      { flag: "🇹🇿", name: language === "ar" ? "تنزانيا" : "Tanzania" },
      { flag: "🇺🇬", name: language === "ar" ? "أوغندا" : "Uganda" },
    ],
    asia: [
      { flag: "🇨🇳", name: language === "ar" ? "الصين" : "China" },
      { flag: "🇮🇩", name: language === "ar" ? "إندونيسيا" : "Indonesia" },
      { flag: "🇮🇳", name: language === "ar" ? "الهند" : "India" },
      { flag: "🇲🇲", name: language === "ar" ? "ميانمار" : "Myanmar" },
      { flag: "🇵🇬", name: language === "ar" ? "بابوا غينيا" : "Papua New Guinea" },
      { flag: "🇾🇪", name: language === "ar" ? "اليمن" : "Yemen" },
    ],
    middle_east: [
      { flag: "🇸🇦", name: language === "ar" ? "السعودية" : "Saudi Arabia" },
      { flag: "🇾🇪", name: language === "ar" ? "اليمن" : "Yemen" },
      { flag: "🇦🇪", name: language === "ar" ? "الإمارات" : "UAE" },
    ],
  };

  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="container mx-auto px-6">
        <Tabs defaultValue="origins" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="origins" className="text-sm">
              {language === "ar" ? "دول منتجة للقهوة" : "Coffee Origins"}
            </TabsTrigger>
            <TabsTrigger value="roasters" className="text-sm">
              {language === "ar" ? "المحمصين حسب المنطقة" : "Roasters by Region"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="origins">
            <Tabs defaultValue="central_america" className="w-full">
              <TabsList className="flex justify-center gap-2 mb-8 flex-wrap">
                <TabsTrigger value="central_america" className="text-xs md:text-sm">
                  {language === "ar" ? "أمريكا الوسطى والجنوبية" : "Central & South America"}
                </TabsTrigger>
                <TabsTrigger value="africa" className="text-xs md:text-sm">
                  {language === "ar" ? "أفريقيا" : "Africa"}
                </TabsTrigger>
                <TabsTrigger value="asia" className="text-xs md:text-sm">
                  {language === "ar" ? "آسيا" : "Asia"}
                </TabsTrigger>
                <TabsTrigger value="middle_east" className="text-xs md:text-sm">
                  {language === "ar" ? "الشرق الأوسط" : "Middle East"}
                </TabsTrigger>
              </TabsList>

              {Object.entries(coffeeOrigins).map(([region, countries]) => (
                <TabsContent key={region} value={region}>
                  <div className="flex flex-wrap justify-center gap-3">
                    {countries.map((country, i) => (
                      <Link 
                        key={i}
                        to={`/origin-map?country=${country.name}`}
                      >
                        <Badge 
                          variant="outline" 
                          className="text-base py-2 px-4 hover:bg-primary/10 hover:border-primary cursor-pointer transition-colors"
                        >
                          <span className="mr-2 text-xl">{country.flag}</span>
                          {country.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="roasters">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                {language === "ar" 
                  ? "اكتشف المحمصين في مختلف المناطق حول العالم"
                  : "Discover roasters in different regions around the world"}
              </p>
              <Link 
                to="/suppliers"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                {language === "ar" ? "تصفح المحمصين" : "Browse Roasters"}
                <span className="text-xl">→</span>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default OriginTabs;
