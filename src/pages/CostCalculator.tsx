import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Calculator, RotateCcw } from "lucide-react";
import { useEffect } from "react";

const CostCalculator = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    pricePerKg: 0,
    quantity: 1,
    shippingCost: 0,
    customsDuty: 0,
    customsRate: 5,
    vatRate: 15,
    otherFees: 0,
  });

  const [results, setResults] = useState({
    subtotal: 0,
    customsAmount: 0,
    vatAmount: 0,
    totalCost: 0,
    costPerKg: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    calculateCosts();
  }, [values]);

  const calculateCosts = () => {
    const subtotal = values.pricePerKg * values.quantity;
    const totalBeforeTax = subtotal + values.shippingCost + values.otherFees;
    const customsAmount = values.customsDuty > 0 ? values.customsDuty : (totalBeforeTax * values.customsRate) / 100;
    const amountAfterCustoms = totalBeforeTax + customsAmount;
    const vatAmount = (amountAfterCustoms * values.vatRate) / 100;
    const totalCost = amountAfterCustoms + vatAmount;
    const costPerKg = values.quantity > 0 ? totalCost / values.quantity : 0;

    setResults({
      subtotal,
      customsAmount,
      vatAmount,
      totalCost,
      costPerKg,
    });
  };

  const resetCalculator = () => {
    setValues({
      pricePerKg: 0,
      quantity: 1,
      shippingCost: 0,
      customsDuty: 0,
      customsRate: 5,
      vatRate: 15,
      otherFees: 0,
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
            <h1 className="text-3xl font-bold text-foreground">حاسبة التكلفة</h1>
            <p className="text-muted-foreground mt-1">احسب التكلفة الإجمالية شاملة الشحن والجمارك والضرائب</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>سعر الكيلو (ريال)</Label>
                  <Input
                    type="number"
                    value={values.pricePerKg || ""}
                    onChange={(e) => updateValue("pricePerKg", Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>الكمية (كجم)</Label>
                  <Input
                    type="number"
                    value={values.quantity || ""}
                    onChange={(e) => updateValue("quantity", Number(e.target.value))}
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label>تكلفة الشحن (ريال)</Label>
                <Input
                  type="number"
                  value={values.shippingCost || ""}
                  onChange={(e) => updateValue("shippingCost", Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الرسوم الجمركية (ريال)</Label>
                  <Input
                    type="number"
                    value={values.customsDuty || ""}
                    onChange={(e) => updateValue("customsDuty", Number(e.target.value))}
                    placeholder="اتركه فارغاً للحساب التلقائي"
                  />
                </div>
                <div>
                  <Label>نسبة الجمارك (%)</Label>
                  <Input
                    type="number"
                    value={values.customsRate || ""}
                    onChange={(e) => updateValue("customsRate", Number(e.target.value))}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">تُستخدم إذا لم تُحدد الرسوم</p>
                </div>
              </div>

              <div>
                <Label>نسبة ضريبة القيمة المضافة (%)</Label>
                <Input
                  type="number"
                  value={values.vatRate || ""}
                  onChange={(e) => updateValue("vatRate", Number(e.target.value))}
                  placeholder="15"
                />
              </div>

              <div>
                <Label>رسوم أخرى (ريال)</Label>
                <Input
                  type="number"
                  value={values.otherFees || ""}
                  onChange={(e) => updateValue("otherFees", Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <Button variant="outline" onClick={resetCalculator} className="w-full">
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة تعيين
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>ملخص التكلفة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">سعر البضاعة</span>
                  <span>{results.subtotal.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تكلفة الشحن</span>
                  <span>{values.shippingCost.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رسوم أخرى</span>
                  <span>{values.otherFees.toFixed(2)} ريال</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرسوم الجمركية ({values.customsRate}%)</span>
                  <span>{results.customsAmount.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة ({values.vatRate}%)</span>
                  <span>{results.vatAmount.toFixed(2)} ريال</span>
                </div>
              </div>

              <Separator />

              <div className="bg-primary/10 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>التكلفة الإجمالية</span>
                  <span className="text-primary">{results.totalCost.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تكلفة الكيلو الواحد</span>
                  <span className="font-semibold text-primary">{results.costPerKg.toFixed(2)} ريال/كجم</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                * هذه الحسابات تقديرية وقد تختلف عن التكلفة الفعلية
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default CostCalculator;
