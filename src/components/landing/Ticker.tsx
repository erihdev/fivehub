import { useLanguage } from "@/hooks/useLanguage";

const Ticker = () => {
  const { language } = useLanguage();
  
  const message = language === "ar" 
    ? "كلنا مختلفون وكلنا رائعون. وكذلك القهوة :)"
    : "We are all different and all wonderful. So is Coffee :)";

  return (
    <div className="bg-primary/5 border-y border-primary/10 py-4 overflow-hidden">
      <div className="animate-ticker flex whitespace-nowrap">
        {[...Array(8)].map((_, i) => (
          <span 
            key={i} 
            className="mx-12 text-lg md:text-xl font-serif text-foreground/80 tracking-wide"
          >
            {message}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Ticker;
