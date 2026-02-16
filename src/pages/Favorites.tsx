import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Heart, Trash2, Star } from "lucide-react";

interface FavoriteItem {
  id: string;
  coffee_id: string;
  notes: string | null;
  created_at: string;
  coffee_offerings: {
    name: string;
    origin: string | null;
    price: number | null;
    currency: string | null;
    score: number | null;
    process: string | null;
    available: boolean;
    suppliers: {
      name: string;
    };
  };
}

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        *,
        coffee_offerings (
          name,
          origin,
          price,
          currency,
          score,
          process,
          available,
          suppliers (name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل المفضلة", variant: "destructive" });
    } else {
      setFavorites(data as unknown as FavoriteItem[] || []);
    }
    setIsLoading(false);
  };

  const removeFavorite = async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: "فشل في إزالة العنصر", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تمت إزالة العنصر من المفضلة" });
      fetchFavorites();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">قائمة المفضلة</h1>
            <p className="text-muted-foreground mt-1">المحاصيل المحفوظة للشراء لاحقاً</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للوحة التحكم
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد عناصر في المفضلة</p>
                <p className="text-sm text-muted-foreground mt-2">
                  يمكنك إضافة محاصيل للمفضلة من صفحة تفاصيل المورد
                </p>
              </CardContent>
            </Card>
          ) : (
            favorites.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.coffee_offerings.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.coffee_offerings.suppliers?.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFavorite(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.coffee_offerings.origin && (
                      <Badge variant="secondary">{item.coffee_offerings.origin}</Badge>
                    )}
                    {item.coffee_offerings.process && (
                      <Badge variant="outline">{item.coffee_offerings.process}</Badge>
                    )}
                    <Badge variant={item.coffee_offerings.available ? "default" : "destructive"}>
                      {item.coffee_offerings.available ? "متوفر" : "غير متوفر"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    {item.coffee_offerings.price && (
                      <span className="font-semibold text-primary">
                        {item.coffee_offerings.price} {item.coffee_offerings.currency || "SAR"}
                      </span>
                    )}
                    {item.coffee_offerings.score && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        {item.coffee_offerings.score}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
};

export default Favorites;
