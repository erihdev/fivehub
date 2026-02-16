import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Sparkles, Plus, Trash2, Coffee, Lightbulb, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BlendComponent {
  coffeeId?: string;
  coffeeName: string;
  origin: string;
  percentage: number;
}

interface FlavorProfile {
  acidity: number;
  body: number;
  sweetness: number;
  bitterness: number;
  fruitiness: number;
  nuttiness: number;
}

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
  flavor: string | null;
  score: number | null;
}

const BlendCreator = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [blendName, setBlendName] = useState('');
  const [components, setComponents] = useState<BlendComponent[]>([
    { coffeeName: '', origin: '', percentage: 50 }
  ]);
  const [targetProfile, setTargetProfile] = useState<FlavorProfile>({
    acidity: 50,
    body: 50,
    sweetness: 50,
    bitterness: 30,
    fruitiness: 50,
    nuttiness: 50
  });
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableCoffees, setAvailableCoffees] = useState<Coffee[]>([]);

  useEffect(() => {
    fetchCoffees();
  }, []);

  const fetchCoffees = async () => {
    const { data } = await supabase
      .from('coffee_offerings')
      .select('id, name, origin, flavor, score')
      .eq('available', true);
    
    setAvailableCoffees(data || []);
  };

  const addComponent = () => {
    if (components.length >= 5) {
      toast.error(language === 'ar' ? 'الحد الأقصى 5 مكونات' : 'Maximum 5 components');
      return;
    }
    setComponents([...components, { coffeeName: '', origin: '', percentage: 0 }]);
  };

  const removeComponent = (index: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof BlendComponent, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'coffeeId') {
      const coffee = availableCoffees.find(c => c.id === value);
      if (coffee) {
        updated[index].coffeeName = coffee.name;
        updated[index].origin = coffee.origin || '';
      }
    }
    
    setComponents(updated);
  };

  const getTotalPercentage = () => {
    return components.reduce((sum, c) => sum + c.percentage, 0);
  };

  const generateAISuggestions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-blend-suggestions', {
        body: {
          components,
          targetProfile,
          availableCoffees: availableCoffees.slice(0, 20)
        }
      });

      if (error) throw error;
      setAiSuggestions(data.suggestions);
      toast.success(language === 'ar' ? 'تم توليد الاقتراحات!' : 'Suggestions generated!');
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback suggestions
      setAiSuggestions(language === 'ar' 
        ? `بناءً على ملف النكهة المستهدف:\n\n• للحصول على حموضة عالية، جرب إضافة قهوة كينيا أو إثيوبيا\n• للجسم الكامل، أضف قهوة سومطرة أو البرازيل\n• للحلاوة، جرب قهوة كولومبيا أو غواتيمالا\n\nنسب مقترحة:\n- 40% إثيوبيا (للحموضة والفاكهية)\n- 35% كولومبيا (للتوازن والحلاوة)\n- 25% البرازيل (للجسم والمكسرات)`
        : `Based on your target flavor profile:\n\n• For high acidity, try adding Kenya or Ethiopia beans\n• For full body, add Sumatra or Brazil\n• For sweetness, try Colombia or Guatemala\n\nSuggested ratios:\n- 40% Ethiopia (for acidity and fruitiness)\n- 35% Colombia (for balance and sweetness)\n- 25% Brazil (for body and nuttiness)`
      );
    } finally {
      setLoading(false);
    }
  };

  const saveBlend = async () => {
    if (!user || !blendName.trim()) {
      toast.error(language === 'ar' ? 'أدخل اسم الخلطة' : 'Enter blend name');
      return;
    }

    if (getTotalPercentage() !== 100) {
      toast.error(language === 'ar' ? 'يجب أن تكون النسب الإجمالية 100%' : 'Total percentages must equal 100%');
      return;
    }

    try {
      const { error } = await supabase
        .from('blend_recipes')
        .insert([{
          user_id: user.id,
          name: blendName,
          target_flavor_profile: targetProfile as any,
          components: components as any,
          ai_suggestions: aiSuggestions as any
        }]);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم حفظ الخلطة!' : 'Blend saved!');
      window.location.href = '/my-blends';
    } catch (error) {
      console.error('Error saving blend:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ الخلطة' : 'Failed to save blend');
    }
  };

  const flavorLabels = {
    acidity: language === 'ar' ? 'الحموضة' : 'Acidity',
    body: language === 'ar' ? 'الجسم' : 'Body',
    sweetness: language === 'ar' ? 'الحلاوة' : 'Sweetness',
    bitterness: language === 'ar' ? 'المرارة' : 'Bitterness',
    fruitiness: language === 'ar' ? 'الفاكهية' : 'Fruitiness',
    nuttiness: language === 'ar' ? 'المكسرات' : 'Nuttiness'
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              {language === 'ar' ? 'مُنشئ الخلطات الذكي' : 'AI Blend Creator'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'صمم خلطتك المثالية بمساعدة الذكاء الاصطناعي' : 'Design your perfect blend with AI assistance'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Blend Components */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  {language === 'ar' ? 'مكونات الخلطة' : 'Blend Components'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{language === 'ar' ? 'اسم الخلطة' : 'Blend Name'}</Label>
                  <Input
                    value={blendName}
                    onChange={(e) => setBlendName(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: خلطة الصباح المنعشة' : 'e.g., Morning Refresh Blend'}
                  />
                </div>

                {components.map((component, index) => (
                  <Card key={index} className="p-4 bg-muted/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <Select
                          value={component.coffeeId}
                          onValueChange={(value) => updateComponent(index, 'coffeeId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر القهوة' : 'Select coffee'} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCoffees.map(coffee => (
                              <SelectItem key={coffee.id} value={coffee.id}>
                                {coffee.name} - {coffee.origin}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{language === 'ar' ? 'النسبة' : 'Percentage'}</span>
                            <span className="font-semibold">{component.percentage}%</span>
                          </div>
                          <Slider
                            value={[component.percentage]}
                            onValueChange={([value]) => updateComponent(index, 'percentage', value)}
                            max={100}
                            step={5}
                          />
                        </div>
                      </div>

                      {components.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeComponent(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={addComponent}>
                    <Plus className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'إضافة مكون' : 'Add Component'}
                  </Button>
                  <Badge variant={getTotalPercentage() === 100 ? 'default' : 'destructive'}>
                    {language === 'ar' ? `الإجمالي: ${getTotalPercentage()}%` : `Total: ${getTotalPercentage()}%`}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Target Flavor Profile */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'ملف النكهة المستهدف' : 'Target Flavor Profile'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(targetProfile).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{flavorLabels[key as keyof FlavorProfile]}</span>
                      <span className="font-semibold">{value}%</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([newValue]) => setTargetProfile(prev => ({ ...prev, [key]: newValue }))}
                      max={100}
                      step={5}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Suggestions */}
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  {language === 'ar' ? 'اقتراحات الذكاء الاصطناعي' : 'AI Suggestions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateAISuggestions}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 ml-2" />
                  )}
                  {language === 'ar' ? 'توليد اقتراحات ذكية' : 'Generate Smart Suggestions'}
                </Button>

                {aiSuggestions && (
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                    {aiSuggestions}
                  </div>
                )}

                <Button onClick={saveBlend} className="w-full" disabled={!blendName.trim() || getTotalPercentage() !== 100}>
                  <Save className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'حفظ الخلطة' : 'Save Blend'}
                </Button>
              </CardContent>
            </Card>

            {/* Blend Preview */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'معاينة الخلطة' : 'Blend Preview'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {components.filter(c => c.coffeeName).map((component, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="h-4 rounded bg-primary"
                        style={{ width: `${component.percentage}%` }}
                      />
                      <span className="text-sm whitespace-nowrap">
                        {component.coffeeName} ({component.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlendCreator;
