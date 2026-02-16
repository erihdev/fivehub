import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Loader2, Coffee, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrendingCoffee {
  name: string;
  origin: string;
  process: string;
  flavor_notes: string;
  popularity_reason: string;
  price_range: string;
  roasters?: string;
}

interface SearchResult {
  trending: TrendingCoffee[];
  market_insights: string;
  sources?: string[];
}

const ORIGIN_COUNTRIES = [
  { value: "all", label: "جميع البلدان" },
  { value: "ethiopia", label: "إثيوبيا" },
  { value: "kenya", label: "كينيا" },
  { value: "colombia", label: "كولومبيا" },
  { value: "brazil", label: "البرازيل" },
  { value: "yemen", label: "اليمن" },
  { value: "panama", label: "بنما" },
  { value: "costa_rica", label: "كوستاريكا" },
  { value: "guatemala", label: "غواتيمالا" },
  { value: "rwanda", label: "رواندا" },
  { value: "indonesia", label: "إندونيسيا" },
];

const TrendingCoffeeSearch = () => {
  const [query, setQuery] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const originFilter = selectedOrigin !== "all" 
        ? ORIGIN_COUNTRIES.find(c => c.value === selectedOrigin)?.label 
        : null;
      
      const { data, error } = await supabase.functions.invoke("search-trending-coffee", {
        body: { query, origin: originFilter },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5 text-primary" />
          المحاصيل الرائجة في الخليج
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="بلد المنشأ" />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="ابحث عن محصول معين (اختياري)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
            dir="rtl"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            {results.market_insights && (
              <div className="p-3 rounded-lg bg-primary/10 text-sm" dir="rtl">
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {results.market_insights}
                </p>
              </div>
            )}

            <div className="grid gap-3">
              {results.trending.map((coffee, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/50 transition-colors"
                  dir="rtl"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-primary" />
                      {coffee.name}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {coffee.price_range}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {coffee.origin}
                    <span className="mx-1">•</span>
                    {coffee.process}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">النكهات:</span> {coffee.flavor_notes}
                  </p>
                  
                  <p className="text-xs text-primary/80">
                    {coffee.popularity_reason}
                  </p>
                  
                  {coffee.roasters && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">المحامص:</span> {coffee.roasters}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && !isLoading && (
          <p className="text-center text-muted-foreground text-sm py-4" dir="rtl">
            اضغط على زر البحث لعرض أكثر المحاصيل رواجاً حالياً
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingCoffeeSearch;
