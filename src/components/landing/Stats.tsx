import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";
import { HandSVG } from "@/components/HandPattern";

const Stats = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("stats-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      value: 500,
      suffix: "+",
      label: language === "ar" ? "مورد معتمد" : "Verified Suppliers",
      color: "text-info",
    },
    {
      value: 1200,
      suffix: "+",
      label: language === "ar" ? "محمصة مسجلة" : "Registered Roasters",
      color: "text-primary",
    },
    {
      value: 3500,
      suffix: "+",
      label: language === "ar" ? "مقهى شريك" : "Partner Cafes",
      color: "text-fivehub-gold",
    },
    {
      value: 50,
      suffix: "+",
      label: language === "ar" ? "دولة حول العالم" : "Countries Worldwide",
      color: "text-success",
    },
  ];

  return (
    <section id="stats-section" className="py-20 bg-primary relative overflow-hidden">
      {/* Hand Pattern Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[500px] opacity-[0.06]">
          <HandSVG color="white" variant="glow" className="w-full h-full animate-pulse-slow" />
        </div>
        <div className="absolute top-8 right-16 w-24 h-36 opacity-[0.05] rotate-12">
          <HandSVG color="white" variant="outline" className="w-full h-full" />
        </div>
        <div className="absolute bottom-8 left-16 w-20 h-30 opacity-[0.05] -rotate-12">
          <HandSVG color="white" variant="outline" className="w-full h-full" />
        </div>
      </div>

      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-5xl md:text-6xl font-display font-black text-primary-foreground mb-2`}>
                {isVisible ? (
                  <CountUp end={stat.value} duration={2000} />
                ) : (
                  0
                )}
                {stat.suffix}
              </div>
              <p className="text-primary-foreground/80 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Simple CountUp component
const CountUp = ({ end, duration }: { end: number; duration: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{count}</>;
};

export default Stats;
