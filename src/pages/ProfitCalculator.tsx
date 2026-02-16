import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Calculator, TrendingUp, RotateCcw } from "lucide-react";

const ProfitCalculator = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    greenCostPerKg: 0,
    roastLossPercent: 15,
    roastingCostPerKg: 5,
    packagingCostPerKg: 3,
    overheadPercent: 10,
    desiredProfitPercent: 30,
    bagSize: 250, // grams
  });

  const [results, setResults] = useState({
    effectiveGreenCost: 0,
    totalCostPerKg: 0,
    breakEvenPrice: 0,
    suggestedPrice: 0,
    profitPerKg: 0,
    pricePerBag: 0,
    profitPerBag: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    calculateProfit();
  }, [values]);

  const calculateProfit = () => {
    // Account for roast loss (green coffee loses weight during roasting)
    const effectiveGreenCost = values.greenCostPerKg / (1 - values.roastLossPercent / 100);
    
    // Total cost per kg of roasted coffee
    const baseCost = effectiveGreenCost + values.roastingCostPerKg + values.packagingCostPerKg;
    const overheadAmount = (baseCost * values.overheadPercent) / 100;
    const totalCostPerKg = baseCost + overheadAmount;
    
    // Break-even price (no profit)
    const breakEvenPrice = totalCostPerKg;
    
    // Suggested selling price with desired profit margin
    const profitAmount = (totalCostPerKg * values.desiredProfitPercent) / 100;
    const suggestedPrice = totalCostPerKg + profitAmount;
    
    // Price per bag
    const bagsPerKg = 1000 / values.bagSize;
    const pricePerBag = suggestedPrice / bagsPerKg;
    const profitPerBag = profitAmount / bagsPerKg;

    setResults({
      effectiveGreenCost,
      totalCostPerKg,
      breakEvenPrice,
      suggestedPrice,
      profitPerKg: profitAmount,
      pricePerBag,
      profitPerBag,
    });
  };

  const resetCalculator = () => {
    setValues({
      greenCostPerKg: 0,
      roastLossPercent: 15,
      roastingCostPerKg: 5,
      packagingCostPerKg: 3,
      overheadPercent: 10,
      desiredProfitPercent: 30,
      bagSize: 250,
    });
  };

  const updateValue = (key: keyof typeof values, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">حاسبة هامش الربح</h1>
            <p className="text-muted-foreground mt-1">احسب سعر البيع المناسب لتحقيق هامش الربح المطلوب</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للوحة التحكم
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                بيانات التكلفة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>تكلفة القهوة الخضراء (ريال/كجم)</Label>
                <Input
                  type="number"
                  value={values.greenCostPerKg || ""}
                  onChange={(e) => updateValue("greenCostPerKg", Number(e.target.value))}
                  placeholder="سعر شراء الكيلو من القهوة الخضراء"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نسبة الفاقد بالتحميص (%)</Label>
                  <Input
                    type="number"
                    value={values.roastLossPercent || ""}
                    onChange={(e) => updateValue("roastLossPercent", Number(e.target.value))}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground mt-1">عادة 12-18%</p>
                </div>
                <div>
                  <Label>تكلفة التحميص (ريال/كجم)</Label>
                  <Input
                    type="number"
                    value={values.roastingCostPerKg || ""}
                    onChange={(e) => updateValue("roastingCostPerKg", Number(e.target.value))}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تكلفة التغليف (ريال/كجم)</Label>
                  <Input
                    type="number"
                    value={values.packagingCostPerKg || ""}
                    onChange={(e) => updateValue("packagingCostPerKg", Number(e.target.value))}
                    placeholder="3"
                  />
                </div>
                <div>
                  <Label>المصاريف العامة (%)</Label>
                  <Input
                    type="number"
                    value={values.overheadPercent || ""}
                    onChange={(e) => updateValue("overheadPercent", Number(e.target.value))}
                    placeholder="10"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary font-semibold">هامش الربح المطلوب (%)</Label>
                  <Input
                    type="number"
                    value={values.desiredProfitPercent || ""}
                    onChange={(e) => updateValue("desiredProfitPercent", Number(e.target.value))}
                    placeholder="30"
                    className="border-primary"
                  />
                </div>
                <div>
                  <Label>حجم الكيس (جرام)</Label>
                  <Input
                    type="number"
                    value={values.bagSize || ""}
                    onChange={(e) => updateValue("bagSize", Number(e.target.value))}
                    placeholder="250"
                  />
                </div>
              </div>

              <Button variant="outline" onClick={resetCalculator} className="w-full">
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة تعيين
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                النتائج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تكلفة القهوة الخضراء الفعلية (بعد الفاقد)</span>
                  <span>{results.effectiveGreenCost.toFixed(2)} ريال/كجم</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي التكلفة</span>
                  <span>{results.totalCostPerKg.toFixed(2)} ريال/كجم</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سعر التعادل (بدون ربح)</span>
                  <span>{results.breakEvenPrice.toFixed(2)} ريال/كجم</span>
                </div>
              </div>

              <Separator />

              <div className="bg-primary/10 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>سعر البيع المقترح</span>
                  <span className="text-primary">{results.suggestedPrice.toFixed(2)} ريال/كجم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الربح لكل كيلو</span>
                  <span className="font-semibold text-green-600">{results.profitPerKg.toFixed(2)} ريال</span>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">سعر الكيس ({values.bagSize} جرام)</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">سعر البيع</span>
                  <span className="font-bold text-primary">{results.pricePerBag.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الربح لكل كيس</span>
                  <span className="font-semibold text-green-600">{results.profitPerBag.toFixed(2)} ريال</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                * هذه الحسابات تقديرية وقد تحتاج لتعديلها حسب ظروف السوق
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default ProfitCalculator;
