import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";
import { HandPatternBackground } from "@/components/HandPattern";

const Testimonials = () => {
  const { language } = useLanguage();

  const testimonials = [
    {
      name: language === "ar" ? "محمد الشمري" : "Mohammed Al-Shammari",
      role: language === "ar" ? "مالك محمصة" : "Roastery Owner",
      location: language === "ar" ? "الرياض" : "Riyadh",
      image: "🧔",
      rating: 5,
      text: language === "ar"
        ? "FIVE HUB غيّر طريقة عملنا تماماً. أصبح التواصل مع الموردين أسهل والمخزون تحت السيطرة"
        : "FIVE HUB completely changed how we work. Supplier communication is easier and inventory is under control",
    },
    {
      name: language === "ar" ? "سارة العتيبي" : "Sara Al-Otaibi",
      role: language === "ar" ? "مديرة مقهى" : "Cafe Manager",
      location: language === "ar" ? "جدة" : "Jeddah",
      image: "👩",
      rating: 5,
      text: language === "ar"
        ? "برنامج الولاء وخدمة التوصيل التلقائي وفّرا علينا وقتاً وجهداً كبيراً"
        : "The loyalty program and auto-delivery saved us tremendous time and effort",
    },
    {
      name: language === "ar" ? "عبدالله القحطاني" : "Abdullah Al-Qahtani",
      role: language === "ar" ? "مورد بن أخضر" : "Green Coffee Supplier",
      location: language === "ar" ? "أبها" : "Abha",
      image: "👨‍💼",
      rating: 5,
      text: language === "ar"
        ? "وصلت لعملاء جدد في جميع أنحاء المملكة. المنصة سهلة والدعم ممتاز"
        : "I reached new customers across the Kingdom. The platform is easy and support is excellent",
    },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Hand Pattern Background */}
      <HandPatternBackground />
      
      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {language === "ar" ? "آراء العملاء" : "Customer Reviews"}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            {language === "ar" ? "ماذا يقول عملاؤنا؟" : "What Our Customers Say?"}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "ar"
              ? "انضم لآلاف العملاء الراضين عن خدماتنا"
              : "Join thousands of customers satisfied with our services"}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2"
            >
              <CardContent className="p-8">
                {/* Quote Icon */}
                <Quote className="w-12 h-12 text-primary/20 mb-6" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-fivehub-gold text-fivehub-gold" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-lg mb-6 leading-relaxed">"{testimonial.text}"</p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
