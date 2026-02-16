import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react";

interface JournalEntry {
  id: string;
  number: string;
  title: string;
  excerpt: string;
  country: string;
  image: string;
  date: string;
}

const Journal = () => {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const journalEntries: JournalEntry[] = [
    {
      id: "1",
      number: "#1",
      title: language === "ar" 
        ? "الحياة النقية – كوستاريكا \"البلد اللطيف\""
        : "Pure Life – \"Mild Country\" Costa Rica",
      excerpt: language === "ar"
        ? "كوستاريكا عبارة إسبانية تعني \"الساحل الغني\". لكنها لا تعني أن البلد غني بالنفط أو الموارد الأخرى. ما تملكه هو أناس بقلوب لطيفة وطيبة."
        : "Costa Rica is a Spanish phrase meaning \"a rich coast\". But it doesn't mean the country is rich with oil or other resources. What it does have are people with gentle, kind hearts.",
      country: language === "ar" ? "كوستاريكا" : "Costa Rica",
      image: "/placeholder.svg",
      date: "2024-01-15",
    },
    {
      id: "2",
      number: "#2",
      title: language === "ar"
        ? "الروح الصامدة للسكان الأصليين في غواتيمالا"
        : "The indomitable spirit of the indigenous peoples of Guatemala",
      excerpt: language === "ar"
        ? "غواتيمالا. بلد البراكين الشاهقة والغابات الكثيفة وموطن أعلى جبل في أمريكا الوسطى على ارتفاع 4000 متر فوق مستوى سطح البحر."
        : "Guatemala. A country of towering volcanoes and dense jungle and home to the tallest mountain in Central America at 4,000 meters above sea level.",
      country: language === "ar" ? "غواتيمالا" : "Guatemala",
      image: "/placeholder.svg",
      date: "2024-02-20",
    },
    {
      id: "3",
      number: "#3",
      title: language === "ar"
        ? "السياسة المضطربة والروح العنيدة في نيكاراغوا"
        : "The tumultuous politics and undaunted tenacious spirit of Nicaragua",
      excerpt: language === "ar"
        ? "معظم البلدان المنتجة للقهوة فقيرة نسبياً. كثير منها غريبة عن الديمقراطية، مع مناخ سياسي غير مستقر."
        : "Most coffee producing countries are relatively poor. Many are strangers to democracy, with an unstable political climate that is an easy target for dictatorial rule.",
      country: language === "ar" ? "نيكاراغوا" : "Nicaragua",
      image: "/placeholder.svg",
      date: "2024-03-10",
    },
    {
      id: "4",
      number: "#4",
      title: language === "ar"
        ? "قهوة لطيفة المذاق من أمة مليئة بالعنف – حزن كولومبيا"
        : "Gentle-Tasting Coffee from a Violence-Riddled Nation – Colombia's Melancholy",
      excerpt: language === "ar"
        ? "بلد يعمل كمدخل إلى قارة أمريكا الجنوبية، كولومبيا مليئة بالمعالم السياحية الرائعة."
        : "A country that serves as the entryway to the South American continent, Colombia is brimming with fascinating attractions beyond its world-famous coffee.",
      country: language === "ar" ? "كولومبيا" : "Colombia",
      image: "/placeholder.svg",
      date: "2024-04-05",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <Badge className="mb-4 bg-primary/10 text-primary border-0">
              {language === "ar" ? "المدونة" : "Journal"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              {language === "ar" ? "رحلة حول العالم مع القهوة" : "Around the World with Coffee"}
            </h2>
          </div>
          <Link 
            to="/blog"
            className="hidden md:flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            {language === "ar" ? "جميع المقالات" : "View All"}
            <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </Link>
        </div>

        {/* Journal Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {journalEntries.map((entry) => (
            <Card
              key={entry.id}
              className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              {/* Image */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-amber-500/30 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-white/30">{entry.number}</span>
                </div>
                {/* Country Badge */}
                <Badge className="absolute bottom-3 left-3 bg-black/70 text-white border-0">
                  {entry.country}
                </Badge>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <CalendarDays className="w-3 h-3" />
                  <span>{new Date(entry.date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                
                <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {entry.title}
                </h3>
                
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {entry.excerpt}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="text-center mt-8 md:hidden">
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-primary font-semibold"
          >
            {language === "ar" ? "جميع المقالات" : "View All Journals"}
            <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Journal;
