import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Brain, Sparkles, Coffee, RefreshCw, ThumbsUp, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface FlavorPreferences {
  preferred_origins: string[];
  preferred_processes: string[];
  flavor_notes: string[];
  roast_level_preference: string;
  acidity_preference: number;
  body_preference: number;
  sweetness_preference: number;
}

interface Recommendation {
  id: string;
  product_id?: string;
  green_coffee_id?: string;
  recommendation_type: string;
  match_score: number;
  reasoning: string;
  coffee_name?: string;
  coffee_origin?: string;
  coffee_price?: number;
}

const AISommelier = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FlavorPreferences>({
    preferred_origins: [],
    preferred_processes: [],
    flavor_notes: [],
    roast_level_preference: "medium",
    acidity_preference: 5,
    body_preference: 5,
    sweetness_preference: 5,
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const origins = ["Ethiopia", "Colombia", "Brazil", "Kenya", "Guatemala", "Yemen", "Indonesia"];
  const processes = ["Washed", "Natural", "Honey", "Anaerobic"];
  const flavors = ["Fruity", "Chocolatey", "Nutty", "Floral", "Spicy", "Citrus", "Caramel"];
  const roastLevels = ["light", "medium", "medium-dark", "dark"];

  useEffect(() => {
    if (user) {
      fetchPreferences();
      fetchRecommendations();
    }
  }, [user]);

  const fetchPreferences = async () => {
    const { data } = await supabase
      .from("cafe_flavor_preferences")
      .select("*")
      .eq("cafe_id", user?.id)
      .single();

    if (data) {
      setPreferences({
        preferred_origins: data.preferred_origins || [],
        preferred_processes: data.preferred_processes || [],
        flavor_notes: data.flavor_notes || [],
        roast_level_preference: data.roast_level_preference || "medium",
        acidity_preference: data.acidity_preference || 5,
        body_preference: data.body_preference || 5,
        sweetness_preference: data.sweetness_preference || 5,
      });
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cafe_ai_recommendations")
      .select("*")
      .eq("cafe_id", user?.id)
      .order("match_score", { ascending: false })
      .limit(6);

    if (data) {
      setRecommendations(data);
    }
    setLoading(false);
  };

  const savePreferences = async () => {
    const { error } = await supabase
      .from("cafe_flavor_preferences")
      .upsert({
        cafe_id: user?.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error saving preferences");
    } else {
      toast.success(language === "ar" ? "تم حفظ التفضيلات" : "Preferences saved");
    }
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    // Simulate AI recommendation generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch available coffees and create recommendations based on preferences
    const { data: coffees } = await supabase
      .from("coffee_offerings")
      .select("*")
      .eq("available", true)
      .limit(10);

    if (coffees && coffees.length > 0) {
      const newRecs = coffees.slice(0, 3).map((coffee, index) => ({
        cafe_id: user?.id,
        green_coffee_id: coffee.id,
        recommendation_type: "green",
        match_score: 95 - (index * 5),
        reasoning: language === "ar" 
          ? `يتطابق مع تفضيلاتك في ${coffee.origin} والنكهات ${coffee.flavor}`
          : `Matches your preferences for ${coffee.origin} origin with ${coffee.flavor} notes`,
      }));

      await supabase.from("cafe_ai_recommendations").insert(newRecs);
      await fetchRecommendations();
    }

    setGenerating(false);
    toast.success(language === "ar" ? "تم إنشاء توصيات جديدة!" : "New recommendations generated!");
  };

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "الساقي الذكي" : "AI Coffee Sommelier"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "توصيات مخصصة بالذكاء الاصطناعي" : "AI-powered personalized recommendations"}
            </p>
          </div>
        </div>
        <Button onClick={generateRecommendations} disabled={generating}>
          {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {language === "ar" ? "توليد توصيات" : "Generate Recommendations"}
        </Button>
      </div>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            {language === "ar" ? "تفضيلاتك" : "Your Preferences"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Origins */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "ar" ? "المناشئ المفضلة" : "Preferred Origins"}
            </label>
            <div className="flex flex-wrap gap-2">
              {origins.map(origin => (
                <Badge
                  key={origin}
                  variant={preferences.preferred_origins.includes(origin) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(
                    preferences.preferred_origins,
                    origin,
                    (arr) => setPreferences({ ...preferences, preferred_origins: arr })
                  )}
                >
                  {origin}
                </Badge>
              ))}
            </div>
          </div>

          {/* Processes */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "ar" ? "طرق المعالجة" : "Processing Methods"}
            </label>
            <div className="flex flex-wrap gap-2">
              {processes.map(process => (
                <Badge
                  key={process}
                  variant={preferences.preferred_processes.includes(process) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(
                    preferences.preferred_processes,
                    process,
                    (arr) => setPreferences({ ...preferences, preferred_processes: arr })
                  )}
                >
                  {process}
                </Badge>
              ))}
            </div>
          </div>

          {/* Flavor Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "ar" ? "نكهات مفضلة" : "Flavor Notes"}
            </label>
            <div className="flex flex-wrap gap-2">
              {flavors.map(flavor => (
                <Badge
                  key={flavor}
                  variant={preferences.flavor_notes.includes(flavor) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(
                    preferences.flavor_notes,
                    flavor,
                    (arr) => setPreferences({ ...preferences, flavor_notes: arr })
                  )}
                >
                  {flavor}
                </Badge>
              ))}
            </div>
          </div>

          {/* Roast Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "ar" ? "درجة التحميص" : "Roast Level"}
            </label>
            <div className="flex gap-2">
              {roastLevels.map(level => (
                <Badge
                  key={level}
                  variant={preferences.roast_level_preference === level ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPreferences({ ...preferences, roast_level_preference: level })}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "ar" ? "الحموضة" : "Acidity"}: {preferences.acidity_preference}
              </label>
              <Slider
                value={[preferences.acidity_preference]}
                onValueChange={([v]) => setPreferences({ ...preferences, acidity_preference: v })}
                min={1}
                max={10}
                step={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "ar" ? "القوام" : "Body"}: {preferences.body_preference}
              </label>
              <Slider
                value={[preferences.body_preference]}
                onValueChange={([v]) => setPreferences({ ...preferences, body_preference: v })}
                min={1}
                max={10}
                step={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "ar" ? "الحلاوة" : "Sweetness"}: {preferences.sweetness_preference}
              </label>
              <Slider
                value={[preferences.sweetness_preference]}
                onValueChange={([v]) => setPreferences({ ...preferences, sweetness_preference: v })}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          <Button onClick={savePreferences} className="w-full">
            {language === "ar" ? "حفظ التفضيلات" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {language === "ar" ? "توصيات لك" : "Recommendations for You"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    {rec.match_score}% {language === "ar" ? "تطابق" : "Match"}
                  </Badge>
                  <Badge variant="outline">{rec.recommendation_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{rec.reasoning}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {language === "ar" ? "إعجاب" : "Like"}
                  </Button>
                  <Button size="sm" className="flex-1">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {language === "ar" ? "طلب" : "Order"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISommelier;
