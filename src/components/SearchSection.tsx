import { useState, useEffect } from "react";
import { Search, Filter, MapPin, DollarSign, Coffee, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

interface CoffeeOffering {
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

const SearchSection = () => {
  const { language, t, dir } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState(t('search.all'));
  const [selectedProcess, setSelectedProcess] = useState(t('search.all'));
  const [coffees, setCoffees] = useState<CoffeeOffering[]>([]);
  const [origins, setOrigins] = useState<string[]>([t('search.all')]);
  const [isLoading, setIsLoading] = useState(true);

  const isRtl = dir === 'rtl';

  const processes = [
    t('search.all'), 
    t('search.washed'), 
    t('search.natural'), 
    t('search.honey')
  ];

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
          setCoffees(data);
          
          const uniqueOrigins = [...new Set(data.map(c => c.origin).filter(Boolean))] as string[];
          setOrigins([t('search.all'), ...uniqueOrigins]);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoffees();

    const channel = supabase
      .channel("coffee-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coffee_offerings",
        },
        () => {
          fetchCoffees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [t]);

  const filteredCoffees = coffees.filter((coffee) => {
    const matchesSearch =
      coffee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coffee.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coffee.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = selectedOrigin === t('search.all') || coffee.origin === selectedOrigin;
    const matchesProcess = selectedProcess === t('search.all') || coffee.process === selectedProcess;
    return matchesSearch && matchesOrigin && matchesProcess;
  });

  return (
    <section id="search" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t('search.title')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('search.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5`} />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRtl ? 'pr-12' : 'pl-12'} py-6 text-lg rounded-xl border-border focus:border-coffee-gold`}
              dir={dir}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('search.country')}</span>
            {origins.map((origin) => (
              <Button
                key={origin}
                variant={selectedOrigin === origin ? "coffee" : "outline"}
                size="sm"
                onClick={() => setSelectedOrigin(origin)}
              >
                {origin}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('search.process')}</span>
            {processes.map((process) => (
              <Button
                key={process}
                variant={selectedProcess === process ? "coffee" : "outline"}
                size="sm"
                onClick={() => setSelectedProcess(process)}
              >
                {process}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
          </div>
        ) : (
          <>
            {/* Results Count */}
            {coffees.length > 0 && (
              <p className="text-center text-muted-foreground mb-6">
                {t('search.showing')} {filteredCoffees.length} {t('search.of')} {coffees.length} {t('search.crops')}
              </p>
            )}

            {/* Results Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCoffees.map((coffee) => (
                <Card key={coffee.id} variant="supplier" className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-1">{coffee.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {coffee.supplier?.name || t('search.unknownSupplier')}
                        </p>
                      </div>
                      <Badge
                        variant={coffee.available ? "available" : "unavailable"}
                      >
                        {coffee.available ? t('coffee.available') : t('coffee.unavailable')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {coffee.origin && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-coffee-gold" />
                          <span>
                            {coffee.origin}
                            {coffee.region && ` - ${coffee.region}`}
                          </span>
                        </div>
                      )}
                      {coffee.process && (
                        <div className="flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-coffee-gold" />
                          <span>{coffee.process}</span>
                        </div>
                      )}
                      {coffee.price && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-coffee-gold" />
                          <span className="font-semibold">
                            {coffee.price} {coffee.currency || "SAR"}
                          </span>
                        </div>
                      )}
                      {coffee.score && (
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-coffee-gold" />
                          <span>{t('search.score')}: {coffee.score}</span>
                        </div>
                      )}
                    </div>
                    {coffee.flavor && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-2">
                        {t('search.flavors')}: {coffee.flavor}
                      </p>
                    )}
                    <Button variant="outline" className="w-full" size="sm">
                      {t('search.moreDetails')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {!isLoading && filteredCoffees.length === 0 && (
              <div className="text-center py-12">
                <Coffee className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                {coffees.length === 0 ? (
                  <>
                    <p className="text-foreground font-medium mb-2">{t('search.noCrops')}</p>
                    <p className="text-muted-foreground">
                      {t('search.uploadHint')}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{t('search.noResults')}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default SearchSection;
