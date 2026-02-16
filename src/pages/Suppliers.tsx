import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Package, 
  ArrowRight, 
  ArrowLeft,
  Plus, 
  Search,
  Calendar,
  Loader2,
  Coffee,
  LogIn,
  Star,
  Filter,
  MapPin,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BackButton from "@/components/BackButton";

interface Supplier {
  id: string;
  name: string;
  contact_info: string | null;
  created_at: string;
  coffee_count: number;
  avg_rating: number;
  rating_count: number;
  origins: string[];
  processes: string[];
}

const Suppliers = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t, dir } = useLanguage();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // Filter states - similar to CreateOffer
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterProcess, setFilterProcess] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("coffees");
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('is_verified_admin', { _user_id: user.id });
      setIsAdmin(data === true);
    };
    checkAdminRole();
  }, [user]);

  const isRtl = dir === 'rtl';
  const iconMargin = isRtl ? 'ml-2' : 'mr-2';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("*")
          .order("created_at", { ascending: false });

        if (suppliersError) {
          console.error("Error fetching suppliers:", suppliersError);
          return;
        }

        const suppliersWithCounts = await Promise.all(
          (suppliersData || []).map(async (supplier) => {
            const { count } = await supabase
              .from("coffee_offerings")
              .select("*", { count: "exact", head: true })
              .eq("supplier_id", supplier.id);

            // Fetch ratings for this supplier
            const { data: ratingsData } = await supabase
              .from("supplier_ratings")
              .select("rating")
              .eq("supplier_id", supplier.id);

            const ratings = ratingsData || [];
            const avgRating = ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
              : 0;

            // Fetch coffee details for this supplier
            const { data: coffeesData } = await supabase
              .from("coffee_offerings")
              .select("origin, process, flavor")
              .eq("supplier_id", supplier.id);

            const origins = [...new Set(
              (coffeesData || [])
                .map(c => c.origin)
                .filter((o): o is string => !!o)
            )];

            const processes = [...new Set(
              (coffeesData || [])
                .map(c => c.process)
                .filter((p): p is string => !!p)
            )];

            return {
              ...supplier,
              coffee_count: count || 0,
              avg_rating: Math.round(avgRating * 10) / 10,
              rating_count: ratings.length,
              origins,
              processes,
            };
          })
        );

        setSuppliers(suppliersWithCounts);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchSuppliers();
    }
  }, [user]);

  // Get all unique origins, processes from suppliers using useMemo
  const allOrigins = useMemo(() => [...new Set(suppliers.flatMap(s => s.origins))].sort(), [suppliers]);
  const allProcesses = useMemo(() => [...new Set(suppliers.flatMap(s => s.processes))].sort(), [suppliers]);

  // Filter and sort suppliers using useMemo
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter((supplier) => {
      // Search filter - search in name, origins, processes
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.origins.some(o => o.toLowerCase().includes(searchLower)) ||
        supplier.processes.some(p => p.toLowerCase().includes(searchLower));
      
      // Origin filter
      const matchesOrigin = filterOrigin === "all" || 
        supplier.origins.includes(filterOrigin);
      
      // Process filter
      const matchesProcess = filterProcess === "all" || 
        supplier.processes.includes(filterProcess);
      
      // Rating filter
      let matchesRating = true;
      if (filterRating !== "all") {
        const rating = supplier.avg_rating;
        if (filterRating === "4+" && rating < 4) matchesRating = false;
        if (filterRating === "3-4" && (rating < 3 || rating >= 4)) matchesRating = false;
        if (filterRating === "below3" && rating >= 3) matchesRating = false;
      }
      
      return matchesSearch && matchesOrigin && matchesProcess && matchesRating;
    });

    // Sorting
    switch (sortBy) {
      case "rating":
        result.sort((a, b) => b.avg_rating - a.avg_rating);
        break;
      case "coffees":
      default:
        result.sort((a, b) => b.coffee_count - a.coffee_count);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
        break;
    }

    return result;
  }, [suppliers, searchQuery, filterOrigin, filterProcess, filterRating, sortBy]);
  const clearFilters = () => {
    setFilterOrigin("all");
    setFilterProcess("all");
    setFilterRating("all");
    setSearchQuery("");
    setSortBy("coffees");
  };

  const hasActiveFilters = filterOrigin !== "all" || filterProcess !== "all" || filterRating !== "all" || sortBy !== "coffees";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                {t('suppliers.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('suppliers.subtitle')}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link to="/ai-upload">
              <Button variant="coffee" size="lg">
                <Plus className={`w-5 h-5 ${iconMargin}`} />
                {t('suppliers.addNew')}
              </Button>
            </Link>
          )}
        </div>

        {/* Search & Filters - Similar to CreateOffer style */}
        <div className="space-y-4 mb-8">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg border">
            {/* Name Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={language === 'ar' ? "بحث باسم المورد..." : "Search supplier..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRtl ? 'pr-9' : 'pl-9'}
                dir={dir}
              />
            </div>

            {/* Origin Filter */}
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger>
                <MapPin className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ar' ? "الدولة" : "Country"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل الدول" : "All Countries"}</SelectItem>
                {allOrigins.map((origin) => (
                  <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Process Filter */}
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger>
                <Coffee className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ar' ? "المعالجة" : "Process"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل المعالجات" : "All Processes"}</SelectItem>
                {allProcesses.map((process) => (
                  <SelectItem key={process} value={process}>{process}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rating Filter */}
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger>
                <Star className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ar' ? "التقييم" : "Rating"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل التقييمات" : "All Ratings"}</SelectItem>
                <SelectItem value="4+">{language === 'ar' ? "4 نجوم فأعلى" : "4+ Stars"}</SelectItem>
                <SelectItem value="3-4">{language === 'ar' ? "3-4 نجوم" : "3-4 Stars"}</SelectItem>
                <SelectItem value="below3">{language === 'ar' ? "أقل من 3 نجوم" : "Below 3 Stars"}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <ArrowUpDown className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ar' ? "الترتيب" : "Sort by"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coffees">{language === 'ar' ? "الأكثر محاصيل" : "Most Coffees"}</SelectItem>
                <SelectItem value="rating">{language === 'ar' ? "الأعلى تقييماً" : "Highest Rating"}</SelectItem>
                <SelectItem value="name">{language === 'ar' ? "الاسم" : "Name"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters & Clear Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `عرض ${filteredSuppliers.length} من ${suppliers.length} مورد`
                  : `Showing ${filteredSuppliers.length} of ${suppliers.length} suppliers`}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                {language === 'ar' ? "مسح الفلاتر" : "Clear Filters"}
              </Button>
            </div>
          )}
        </div>


        {/* Suppliers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <Card variant="glass" className="text-center py-16">
            <CardContent>
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              {suppliers.length === 0 ? (
                <>
                  <p className="text-foreground font-medium mb-2">{t('suppliers.noSuppliers')}</p>
                  <p className="text-muted-foreground mb-4">
                    {isAdmin ? t('suppliers.startAdding') : (language === 'ar' ? 'لا يوجد موردين مسجلين حالياً' : 'No suppliers registered yet')}
                  </p>
                  {isAdmin && (
                    <Link to="/ai-upload">
                      <Button variant="coffee">
                        <Plus className={`w-4 h-4 ${iconMargin}`} />
                        {t('suppliers.addSupplier')}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{t('search.noResults')}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Link key={supplier.id} to={`/suppliers/${supplier.id}`}>
                <Card variant="supplier" className="h-full hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-fivehub-gold/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-fivehub-gold" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{supplier.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {t('suppliers.addedOn')} {formatDate(supplier.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-success" />
                          <span className="font-semibold">{supplier.coffee_count}</span>
                          <span className="text-muted-foreground">{t('suppliers.crop')}</span>
                        </div>
                        {supplier.rating_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-semibold text-sm">{supplier.avg_rating}</span>
                            <span className="text-muted-foreground text-xs">({supplier.rating_count})</span>
                          </div>
                        )}
                      </div>
                      <ArrowIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Suppliers;
