import React, { useState, useEffect } from "react";
import { Scale, X, Plus, Coffee, MapPin, Beaker, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface CoffeeItem {
  id: string;
  name: string;
  origin: string | null;
  region: string | null;
  process: string | null;
  price: number | null;
  currency: string | null;
  score: number | null;
  altitude: string | null;
  variety: string | null;
  flavor: string | null;
  available: boolean | null;
  supplier: {
    name: string;
  } | null;
}

const CompareSection = () => {
  const [selectedCoffees, setSelectedCoffees] = useState<CoffeeItem[]>([]);
  const [allCoffees, setAllCoffees] = useState<CoffeeItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCoffees = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("coffee_offerings")
          .select(`
            id,
            name,
            origin,
            region,
            process,
            price,
            currency,
            score,
            altitude,
            variety,
            flavor,
            available,
            supplier:suppliers(name)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching coffees:", error);
          return;
        }

        if (data) {
          setAllCoffees(data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoffees();
  }, []);

  const addToCompare = (coffee: CoffeeItem) => {
    if (selectedCoffees.length < 4 && !selectedCoffees.find((c) => c.id === coffee.id)) {
      setSelectedCoffees([...selectedCoffees, coffee]);
    }
    setIsDialogOpen(false);
  };

  const removeFromCompare = (coffeeId: string) => {
    setSelectedCoffees(selectedCoffees.filter((c) => c.id !== coffeeId));
  };

  const clearAll = () => {
    setSelectedCoffees([]);
  };

  const getLowestPrice = () => {
    const prices = selectedCoffees.map((c) => c.price).filter((p): p is number => p !== null);
    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  const getHighestScore = () => {
    const scores = selectedCoffees.map((c) => c.score).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return Math.max(...scores);
  };

  const lowestPrice = getLowestPrice();
  const highestScore = getHighestScore();

  const availableCoffees = allCoffees.filter((c) => !selectedCoffees.find((s) => s.id === c.id));

  return (
    <section id="compare" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            قارن بين أنواع القهوة
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            اختر حتى 4 أنواع من القهوة لمقارنتها جنباً إلى جنب واتخاذ قرار الشراء الأفضل
          </p>
        </div>

        {/* Selection Area */}
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          {/* Selected coffees */}
          {selectedCoffees.map((coffee) => (
            <div
              key={coffee.id}
              className="relative group bg-secondary rounded-xl px-4 py-2 flex items-center gap-2"
            >
              <Coffee className="w-4 h-4 text-coffee-gold" />
              <span className="text-sm font-medium">{coffee.name}</span>
              <button
                onClick={() => removeFromCompare(coffee.id)}
                className="w-5 h-5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add button */}
          {selectedCoffees.length < 4 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={allCoffees.length === 0}>
                  <Plus className="w-4 h-4" />
                  إضافة للمقارنة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display">اختر قهوة للمقارنة</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2 p-1">
                    {availableCoffees.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        لا توجد محاصيل متاحة للمقارنة
                      </p>
                    ) : (
                      availableCoffees.map((coffee) => (
                        <button
                          key={coffee.id}
                          onClick={() => addToCompare(coffee)}
                          className="w-full p-4 rounded-xl border border-border hover:border-coffee-gold hover:bg-secondary/50 transition-all text-right flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-semibold">{coffee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {coffee.origin} • {coffee.supplier?.name || "مورد غير محدد"}
                            </p>
                          </div>
                          <div className="text-left">
                            {coffee.price && (
                              <p className="font-bold text-coffee-gold">{coffee.price} ريال</p>
                            )}
                            {coffee.score && (
                              <p className="text-xs text-muted-foreground">درجة {coffee.score}</p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}

          {selectedCoffees.length > 0 && (
            <Button variant="ghost" onClick={clearAll} className="text-destructive hover:text-destructive">
              مسح الكل
            </Button>
          )}
        </div>

        {/* Comparison Table */}
        {selectedCoffees.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="inline-flex gap-4 min-w-full pb-4" style={{ minWidth: `${selectedCoffees.length * 280}px` }}>
              {selectedCoffees.map((coffee) => (
                <Card
                  key={coffee.id}
                  variant="coffee"
                  className="flex-1 min-w-[260px] max-w-[320px] relative overflow-hidden"
                >
                  {/* Best price/score badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {coffee.price === lowestPrice && lowestPrice !== null && (
                      <Badge variant="gold" className="text-xs">
                        أفضل سعر
                      </Badge>
                    )}
                    {coffee.score === highestScore && highestScore !== null && (
                      <Badge variant="available" className="text-xs">
                        أعلى تقييم
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <button
                      onClick={() => removeFromCompare(coffee.id)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <CardTitle className="text-xl pr-8">{coffee.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {coffee.supplier?.name || "مورد غير محدد"}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price highlight */}
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-coffee-gold">
                        {coffee.price || "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {coffee.currency || "SAR"}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      {coffee.origin && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-coffee-gold shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">البلد والمنطقة</p>
                            <p className="text-sm font-medium">
                              {coffee.origin}
                              {coffee.region && ` - ${coffee.region}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {coffee.process && (
                        <div className="flex items-center gap-3">
                          <Beaker className="w-4 h-4 text-coffee-gold shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">المعالجة</p>
                            <p className="text-sm font-medium">{coffee.process}</p>
                          </div>
                        </div>
                      )}

                      {coffee.score && (
                        <div className="flex items-center gap-3">
                          <Star className="w-4 h-4 text-coffee-gold shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">الدرجة</p>
                            <p className="text-sm font-medium">{coffee.score} نقطة</p>
                          </div>
                        </div>
                      )}

                      {coffee.altitude && (
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-coffee-gold shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 21l4-10 4 10M12 11V3M3 21h18" />
                          </svg>
                          <div>
                            <p className="text-xs text-muted-foreground">الارتفاع</p>
                            <p className="text-sm font-medium">{coffee.altitude}</p>
                          </div>
                        </div>
                      )}

                      {coffee.variety && (
                        <div className="flex items-center gap-3">
                          <Coffee className="w-4 h-4 text-coffee-gold shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">الصنف</p>
                            <p className="text-sm font-medium">{coffee.variety}</p>
                          </div>
                        </div>
                      )}

                      {coffee.flavor && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">النكهات</p>
                          <p className="text-sm">{coffee.flavor}</p>
                        </div>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="pt-2">
                      <Badge variant={coffee.available ? "available" : "unavailable"} className="w-full justify-center py-1">
                        {coffee.available ? "متوفر للطلب" : "غير متوفر حالياً"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card variant="glass" className="max-w-md mx-auto text-center py-12">
            <CardContent>
              {isLoading ? (
                <Loader2 className="w-16 h-16 text-coffee-gold mx-auto mb-4 animate-spin" />
              ) : (
                <Scale className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              )}
              <p className="text-muted-foreground mb-4">
                {isLoading
                  ? "جاري تحميل المحاصيل..."
                  : allCoffees.length === 0
                  ? "لا توجد محاصيل مسجلة للمقارنة"
                  : "لم تختر أي قهوة للمقارنة بعد"}
              </p>
              {!isLoading && allCoffees.length > 0 && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="coffee">
                      <Plus className="w-4 h-4 ml-2" />
                      ابدأ المقارنة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg bg-card">
                    <DialogHeader>
                      <DialogTitle className="font-display">اختر قهوة للمقارنة</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2 p-1">
                        {allCoffees.map((coffee) => (
                          <button
                            key={coffee.id}
                            onClick={() => addToCompare(coffee)}
                            className="w-full p-4 rounded-xl border border-border hover:border-coffee-gold hover:bg-secondary/50 transition-all text-right flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="font-semibold">{coffee.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {coffee.origin} • {coffee.supplier?.name || "مورد غير محدد"}
                              </p>
                            </div>
                            <div className="text-left">
                              {coffee.price && (
                                <p className="font-bold text-coffee-gold">{coffee.price} ريال</p>
                              )}
                              {coffee.score && (
                                <p className="text-xs text-muted-foreground">درجة {coffee.score}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary when comparing */}
        {selectedCoffees.length >= 2 && (
          <Card variant="stat" className="max-w-2xl mx-auto mt-8">
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-semibold mb-4 text-center">ملخص المقارنة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-coffee-gold">{lowestPrice || "-"}</p>
                  <p className="text-xs text-muted-foreground">أقل سعر (ريال)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-coffee-green">{highestScore || "-"}</p>
                  <p className="text-xs text-muted-foreground">أعلى درجة</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(() => {
                      const prices = selectedCoffees.map((c) => c.price).filter((p): p is number => p !== null);
                      if (prices.length < 2) return "-";
                      return Math.max(...prices) - Math.min(...prices);
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">فرق السعر (ريال)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedCoffees.filter((c) => c.available).length}/{selectedCoffees.length}
                  </p>
                  <p className="text-xs text-muted-foreground">متوفر للطلب</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default CompareSection;
