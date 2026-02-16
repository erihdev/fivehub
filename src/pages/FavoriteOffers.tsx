import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Coffee,
  Tag,
  Package,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Settings,
  Filter,
  X,
  ArrowUpDown,
  Search,
  Download,
  FileText,
  Printer,
  Share2,
  MessageCircle,
  Mail,
  Bell,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Copy,
  Camera,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useOfferFavorites } from "@/hooks/useOfferFavorites";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FavoriteOffersQuickStats from "@/components/FavoriteOffersQuickStats";
import { toast } from "@/hooks/use-toast";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from "recharts";
import { format, parseISO } from "date-fns";
import html2canvas from "html2canvas";

interface FavoriteOffer {
  id: string;
  offer_id: string;
  created_at: string;
  offer: {
    id: string;
    title: string;
    description: string | null;
    discount_percentage: number | null;
    discount_amount: number | null;
    currency: string | null;
    min_quantity_kg: number | null;
    is_active: boolean;
    valid_until: string | null;
    supplier: {
      name: string;
    } | null;
  } | null;
}

const FavoriteOffers = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toggleFavorite } = useOfferFavorites();

  const [favoriteOffers, setFavoriteOffers] = useState<FavoriteOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "expired" | "inactive">("all");
  const [discountFilter, setDiscountFilter] = useState<"all" | "10" | "20" | "30" | "50">("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"added_desc" | "added_asc" | "expiry_asc" | "expiry_desc" | "discount_desc" | "discount_asc">("added_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPieChart, setShowPieChart] = useState(true);

  // Chart refs for export
  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const timelineChartRef = useRef<HTMLDivElement>(null);
  const weeklyTrendChartRef = useRef<HTMLDivElement>(null);

  // Export chart as PNG
  const exportChartAsPng = async (chartRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `${fileName}-${format(new Date(), "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: language === "ar" ? "تم التصدير" : "Exported",
        description: language === "ar" ? "تم تصدير الرسم البياني بنجاح" : "Chart exported successfully",
      });
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل تصدير الرسم البياني" : "Failed to export chart",
        variant: "destructive",
      });
    }
  };

  const isRtl = dir === "rtl";

  // Calculate pie chart data
  const pieChartData = useMemo(() => {
    const now = new Date();
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let inactive = 0;

    favoriteOffers.forEach((fav) => {
      const offer = fav.offer;
      if (!offer) return;
      
      if (!offer.is_active) {
        inactive++;
      } else if (offer.valid_until && new Date(offer.valid_until) < now) {
        expired++;
      } else if (offer.valid_until) {
        const daysUntilExpiry = Math.ceil(
          (new Date(offer.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 7) {
          expiringSoon++;
        } else {
          active++;
        }
      } else {
        active++;
      }
    });

    return [
      { name: language === "ar" ? "نشطة" : "Active", value: active, color: "#22c55e" },
      { name: language === "ar" ? "تنتهي قريباً" : "Expiring Soon", value: expiringSoon, color: "#f59e0b" },
      { name: language === "ar" ? "منتهية" : "Expired", value: expired, color: "#ef4444" },
      { name: language === "ar" ? "غير نشطة" : "Inactive", value: inactive, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [favoriteOffers, language]);

  // Calculate bar chart data by supplier
  const supplierChartData = useMemo(() => {
    const supplierCounts: Record<string, number> = {};

    favoriteOffers.forEach((fav) => {
      const supplierName = fav.offer?.supplier?.name || (language === "ar" ? "غير معروف" : "Unknown");
      supplierCounts[supplierName] = (supplierCounts[supplierName] || 0) + 1;
    });

    return Object.entries(supplierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 suppliers
  }, [favoriteOffers, language]);

  // Calculate timeline data for line chart
  const timelineData = useMemo(() => {
    if (favoriteOffers.length === 0) return [];

    // Group by date
    const dateGroups: Record<string, number> = {};
    
    favoriteOffers.forEach((fav) => {
      const date = format(parseISO(fav.created_at), "yyyy-MM-dd");
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });

    // Sort dates and calculate cumulative
    const sortedDates = Object.keys(dateGroups).sort();
    let cumulative = 0;
    
    return sortedDates.map((date) => {
      cumulative += dateGroups[date];
      return {
        date,
        displayDate: format(parseISO(date), "dd/MM"),
        count: dateGroups[date],
        cumulative,
      };
    });
  }, [favoriteOffers]);

  // Calculate weekly trend data
  const weeklyTrendData = useMemo(() => {
    if (favoriteOffers.length === 0) return [];

    const now = new Date();
    const weeks: { weekStart: Date; weekEnd: Date; label: string }[] = [];
    
    // Generate last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      weeks.push({
        weekStart,
        weekEnd,
        label: format(weekStart, "dd/MM"),
      });
    }

    return weeks.map((week) => {
      const offersInWeek = favoriteOffers.filter((fav) => {
        const date = new Date(fav.created_at);
        return date >= week.weekStart && date < week.weekEnd;
      });

      const activeInWeek = offersInWeek.filter((fav) => {
        const offer = fav.offer;
        if (!offer?.is_active) return false;
        if (offer.valid_until && new Date(offer.valid_until) < now) return false;
        return true;
      }).length;

      const avgDiscount = offersInWeek.length > 0
        ? Math.round(offersInWeek.reduce((sum, fav) => sum + (fav.offer?.discount_percentage || 0), 0) / offersInWeek.length)
        : 0;

      const suppliersCount = new Set(offersInWeek.map(fav => fav.offer?.supplier?.name).filter(Boolean)).size;

      return {
        week: week.label,
        added: offersInWeek.length,
        active: activeInWeek,
        avgDiscount,
        suppliers: suppliersCount,
      };
    });
  }, [favoriteOffers]);

  // Calculate growth stats
  const growthStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = favoriteOffers.filter(
      (fav) => new Date(fav.created_at) >= oneWeekAgo
    ).length;

    const thisMonth = favoriteOffers.filter(
      (fav) => new Date(fav.created_at) >= oneMonthAgo
    ).length;

    const previousMonth = favoriteOffers.filter((fav) => {
      const date = new Date(fav.created_at);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return date >= twoMonthsAgo && date < oneMonthAgo;
    }).length;

    const growthPercentage = previousMonth > 0 
      ? Math.round(((thisMonth - previousMonth) / previousMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    const activeOffers = favoriteOffers.filter((fav) => {
      const offer = fav.offer;
      if (!offer?.is_active) return false;
      if (offer.valid_until && new Date(offer.valid_until) < now) return false;
      return true;
    }).length;

    const expiredOffers = favoriteOffers.filter((fav) => {
      const offer = fav.offer;
      if (!offer) return false;
      if (offer.valid_until && new Date(offer.valid_until) < now) return true;
      return false;
    }).length;

    return {
      total: favoriteOffers.length,
      thisWeek,
      thisMonth,
      growthPercentage,
      activeOffers,
      expiredOffers,
      activePercentage: favoriteOffers.length > 0 
        ? Math.round((activeOffers / favoriteOffers.length) * 100)
        : 0,
    };
  }, [favoriteOffers]);

  // Calculate weekly comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // This week's offers (added this week)
    const thisWeekAdded = favoriteOffers.filter(
      (fav) => new Date(fav.created_at) >= oneWeekAgo
    );

    // Last week's offers (added last week)
    const lastWeekAdded = favoriteOffers.filter((fav) => {
      const date = new Date(fav.created_at);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    });

    // Active offers this week
    const thisWeekActive = favoriteOffers.filter((fav) => {
      const offer = fav.offer;
      if (!offer?.is_active) return false;
      if (offer.valid_until && new Date(offer.valid_until) < now) return false;
      return true;
    }).length;

    // Expired this week
    const expiredThisWeek = favoriteOffers.filter((fav) => {
      const offer = fav.offer;
      if (!offer?.valid_until) return false;
      const expiryDate = new Date(offer.valid_until);
      return expiryDate >= oneWeekAgo && expiryDate < now;
    }).length;

    // Calculate average discount this week vs last week
    const thisWeekAvgDiscount = thisWeekAdded.length > 0
      ? thisWeekAdded.reduce((sum, fav) => sum + (fav.offer?.discount_percentage || 0), 0) / thisWeekAdded.length
      : 0;

    const lastWeekAvgDiscount = lastWeekAdded.length > 0
      ? lastWeekAdded.reduce((sum, fav) => sum + (fav.offer?.discount_percentage || 0), 0) / lastWeekAdded.length
      : 0;

    // Suppliers this week
    const thisWeekSuppliers = new Set(thisWeekAdded.map(fav => fav.offer?.supplier?.name).filter(Boolean)).size;
    const lastWeekSuppliers = new Set(lastWeekAdded.map(fav => fav.offer?.supplier?.name).filter(Boolean)).size;

    const addedDiff = thisWeekAdded.length - lastWeekAdded.length;
    const addedPercentChange = lastWeekAdded.length > 0 
      ? Math.round((addedDiff / lastWeekAdded.length) * 100) 
      : thisWeekAdded.length > 0 ? 100 : 0;

    const supplierDiff = thisWeekSuppliers - lastWeekSuppliers;
    const discountDiff = Math.round(thisWeekAvgDiscount - lastWeekAvgDiscount);

    return {
      thisWeekAdded: thisWeekAdded.length,
      lastWeekAdded: lastWeekAdded.length,
      addedDiff,
      addedPercentChange,
      thisWeekActive,
      expiredThisWeek,
      thisWeekAvgDiscount: Math.round(thisWeekAvgDiscount),
      lastWeekAvgDiscount: Math.round(lastWeekAvgDiscount),
      discountDiff,
      thisWeekSuppliers,
      lastWeekSuppliers,
      supplierDiff,
    };
  }, [favoriteOffers]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchFavoriteOffers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("offer_favorites")
          .select(`
            id,
            offer_id,
            created_at,
            offer:supplier_offers(
              id,
              title,
              description,
              discount_percentage,
              discount_amount,
              currency,
              min_quantity_kg,
              is_active,
              valid_until,
              supplier:suppliers(name)
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform the data
        const transformed = (data || []).map((item) => ({
          ...item,
          offer: Array.isArray(item.offer) ? item.offer[0] : item.offer,
        })).map((item) => ({
          ...item,
          offer: item.offer ? {
            ...item.offer,
            supplier: Array.isArray(item.offer.supplier) ? item.offer.supplier[0] : item.offer.supplier
          } : null
        }));

        setFavoriteOffers(transformed);
      } catch (error) {
        console.error("Error fetching favorite offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavoriteOffers();
  }, [user]);

  const handleRemoveFavorite = async (offerId: string) => {
    await toggleFavorite(offerId);
    setFavoriteOffers((prev) => prev.filter((f) => f.offer_id !== offerId));
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isExpiringSoon = (validUntil: string | null) => {
    if (!validUntil) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const getOfferStatus = (offer: FavoriteOffer["offer"]) => {
    if (!offer) return "inactive";
    if (!offer.is_active) return "inactive";
    if (isExpired(offer.valid_until)) return "expired";
    if (isExpiringSoon(offer.valid_until)) return "expiring";
    return "active";
  };

  const filteredOffers = favoriteOffers
    .filter((favorite) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = favorite.offer?.title?.toLowerCase().includes(query);
        const supplierMatch = favorite.offer?.supplier?.name?.toLowerCase().includes(query);
        if (!titleMatch && !supplierMatch) return false;
      }
      // Status filter
      if (statusFilter !== "all" && getOfferStatus(favorite.offer) !== statusFilter) {
        return false;
      }
      // Discount filter
      if (discountFilter !== "all") {
        const discount = favorite.offer?.discount_percentage || 0;
        const minDiscount = parseInt(discountFilter);
        if (discount < minDiscount) return false;
      }
      // Supplier filter
      if (supplierFilter !== "all") {
        const supplierName = favorite.offer?.supplier?.name || "";
        if (supplierName !== supplierFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "added_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "added_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "expiry_asc": {
          const aExpiry = a.offer?.valid_until ? new Date(a.offer.valid_until).getTime() : Infinity;
          const bExpiry = b.offer?.valid_until ? new Date(b.offer.valid_until).getTime() : Infinity;
          return aExpiry - bExpiry;
        }
        case "expiry_desc": {
          const aExpiry = a.offer?.valid_until ? new Date(a.offer.valid_until).getTime() : 0;
          const bExpiry = b.offer?.valid_until ? new Date(b.offer.valid_until).getTime() : 0;
          return bExpiry - aExpiry;
        }
        case "discount_desc":
          return (b.offer?.discount_percentage || 0) - (a.offer?.discount_percentage || 0);
        case "discount_asc":
          return (a.offer?.discount_percentage || 0) - (b.offer?.discount_percentage || 0);
        default:
          return 0;
      }
    });

  const exportToCSV = () => {
    if (favoriteOffers.length === 0) {
      toast({
        title: language === "ar" ? "لا توجد بيانات" : "No data",
        description: language === "ar" ? "لا توجد عروض للتصدير" : "No offers to export",
        variant: "destructive",
      });
      return;
    }

    const BOM = "\uFEFF";
    const headers = language === "ar" 
      ? ["اسم العرض", "المورد", "نسبة الخصم", "مبلغ الخصم", "العملة", "الحد الأدنى (كغ)", "تاريخ الانتهاء", "الحالة", "تاريخ الإضافة"]
      : ["Offer Title", "Supplier", "Discount %", "Discount Amount", "Currency", "Min Qty (kg)", "Valid Until", "Status", "Added Date"];

    const getStatus = (offer: FavoriteOffer["offer"]) => {
      if (!offer) return language === "ar" ? "غير متوفر" : "N/A";
      if (!offer.is_active) return language === "ar" ? "غير نشط" : "Inactive";
      if (offer.valid_until && new Date(offer.valid_until) < new Date()) return language === "ar" ? "منتهي" : "Expired";
      return language === "ar" ? "نشط" : "Active";
    };

    const rows = favoriteOffers.map((fav) => {
      const offer = fav.offer;
      return [
        offer?.title || "",
        offer?.supplier?.name || "",
        offer?.discount_percentage || "",
        offer?.discount_amount || "",
        offer?.currency || "SAR",
        offer?.min_quantity_kg || "",
        offer?.valid_until ? new Date(offer.valid_until).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "",
        getStatus(offer),
        new Date(fav.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US"),
      ];
    });

    const csvContent = BOM + [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `favorite-offers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: language === "ar" ? "تم التصدير" : "Exported",
      description: language === "ar" ? `تم تصدير ${favoriteOffers.length} عرض بنجاح` : `Successfully exported ${favoriteOffers.length} offers`,
    });
  };

  const exportToPDF = () => {
    if (favoriteOffers.length === 0) {
      toast({
        title: language === "ar" ? "لا توجد بيانات" : "No data",
        description: language === "ar" ? "لا توجد عروض للتصدير" : "No offers to export",
        variant: "destructive",
      });
      return;
    }

    // Create print content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow popups",
        variant: "destructive",
      });
      return;
    }

    const reportDate = new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US");
    const isAr = language === "ar";

    const statusColors: Record<string, string> = {
      active: "#22c55e",
      expiringSoon: "#f59e0b", 
      expired: "#ef4444",
      inactive: "#6b7280",
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isAr ? "rtl" : "ltr"}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${isAr ? "تقرير العروض المفضلة" : "Favorite Offers Report"}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; background: #fff; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #8B4513; padding-bottom: 20px; }
          .header h1 { color: #8B4513; font-size: 28px; margin-bottom: 8px; }
          .header p { color: #666; font-size: 14px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e9ecef; }
          .stat-card .value { font-size: 32px; font-weight: bold; color: #333; }
          .stat-card .label { font-size: 12px; color: #666; margin-top: 4px; }
          .stat-card.primary .value { color: #8B4513; }
          .stat-card.green .value { color: #22c55e; }
          .stat-card.blue .value { color: #3b82f6; }
          .stat-card.amber .value { color: #f59e0b; }
          .stat-card.red .value { color: #ef4444; }
          .stat-card.purple .value { color: #8b5cf6; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; color: #8B4513; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e9ecef; }
          .chart-placeholder { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .pie-chart { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; }
          .pie-item { display: flex; align-items: center; gap: 8px; }
          .pie-color { width: 16px; height: 16px; border-radius: 4px; }
          .bar-chart { display: flex; flex-direction: column; gap: 8px; }
          .bar-item { display: flex; align-items: center; gap: 12px; }
          .bar-label { width: 120px; font-size: 12px; text-align: ${isAr ? "right" : "left"}; }
          .bar-container { flex: 1; height: 24px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
          .bar-fill { height: 100%; background: #8B4513; border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding: 0 8px; }
          .bar-value { color: #fff; font-size: 11px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { padding: 10px 8px; text-align: ${isAr ? "right" : "left"}; border-bottom: 1px solid #e9ecef; }
          th { background: #f8f9fa; font-weight: 600; color: #333; }
          tr:hover { background: #f8f9fa; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
          .status.active { background: #dcfce7; color: #166534; }
          .status.expired { background: #fee2e2; color: #991b1b; }
          .status.expiring { background: #fef3c7; color: #92400e; }
          .status.inactive { background: #f3f4f6; color: #4b5563; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e9ecef; padding-top: 20px; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${isAr ? "تقرير العروض المفضلة" : "Favorite Offers Report"}</h1>
          <p>${isAr ? "تاريخ التقرير:" : "Report Date:"} ${reportDate}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="value">${growthStats.total}</div>
            <div class="label">${isAr ? "إجمالي المفضلة" : "Total Favorites"}</div>
          </div>
          <div class="stat-card green">
            <div class="value">${growthStats.thisWeek}</div>
            <div class="label">${isAr ? "هذا الأسبوع" : "This Week"}</div>
          </div>
          <div class="stat-card blue">
            <div class="value">${growthStats.thisMonth}</div>
            <div class="label">${isAr ? "هذا الشهر" : "This Month"}</div>
          </div>
          <div class="stat-card ${growthStats.growthPercentage >= 0 ? "green" : "red"}">
            <div class="value">${growthStats.growthPercentage >= 0 ? "+" : ""}${growthStats.growthPercentage}%</div>
            <div class="label">${isAr ? "نمو شهري" : "Monthly Growth"}</div>
          </div>
          <div class="stat-card amber">
            <div class="value">${growthStats.activeOffers}</div>
            <div class="label">${isAr ? "نشطة" : "Active"}</div>
          </div>
          <div class="stat-card purple">
            <div class="value">${growthStats.activePercentage}%</div>
            <div class="label">${isAr ? "نسبة النشطة" : "Active Rate"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${isAr ? "توزيع حالة العروض" : "Offer Status Distribution"}</div>
          <div class="chart-placeholder">
            <div class="pie-chart">
              ${pieChartData.map((item) => `
                <div class="pie-item">
                  <div class="pie-color" style="background: ${item.color}"></div>
                  <span>${item.name}: ${item.value} (${Math.round((item.value / favoriteOffers.length) * 100)}%)</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${isAr ? "العروض حسب المورد" : "Offers by Supplier"}</div>
          <div class="chart-placeholder">
            <div class="bar-chart">
              ${supplierChartData.slice(0, 8).map((item) => {
                const maxCount = Math.max(...supplierChartData.map((s) => s.count));
                const percentage = (item.count / maxCount) * 100;
                return `
                  <div class="bar-item">
                    <div class="bar-label">${item.name}</div>
                    <div class="bar-container">
                      <div class="bar-fill" style="width: ${percentage}%">
                        <span class="bar-value">${item.count}</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${isAr ? "قائمة العروض المفضلة" : "Favorite Offers List"}</div>
          <table>
            <thead>
              <tr>
                <th>${isAr ? "العرض" : "Offer"}</th>
                <th>${isAr ? "المورد" : "Supplier"}</th>
                <th>${isAr ? "الخصم" : "Discount"}</th>
                <th>${isAr ? "تاريخ الانتهاء" : "Valid Until"}</th>
                <th>${isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              ${favoriteOffers.slice(0, 50).map((fav) => {
                const offer = fav.offer;
                const status = getOfferStatus(offer);
                const statusClass = status === "active" ? "active" : status === "expired" ? "expired" : status === "expiring" ? "expiring" : "inactive";
                const statusLabel = isAr 
                  ? (status === "active" ? "نشط" : status === "expired" ? "منتهي" : status === "expiring" ? "ينتهي قريباً" : "غير نشط")
                  : (status === "active" ? "Active" : status === "expired" ? "Expired" : status === "expiring" ? "Expiring" : "Inactive");
                return `
                  <tr>
                    <td>${offer?.title || "-"}</td>
                    <td>${offer?.supplier?.name || "-"}</td>
                    <td>${offer?.discount_percentage ? offer.discount_percentage + "%" : offer?.discount_amount ? offer.discount_amount + " " + (offer?.currency || "SAR") : "-"}</td>
                    <td>${offer?.valid_until ? new Date(offer.valid_until).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "-"}</td>
                    <td><span class="status ${statusClass}">${statusLabel}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          ${favoriteOffers.length > 50 ? `<p style="margin-top: 12px; color: #666; font-size: 12px;">${isAr ? `... و ${favoriteOffers.length - 50} عرض آخر` : `... and ${favoriteOffers.length - 50} more offers`}</p>` : ""}
        </div>

        <div class="footer">
          <p>${isAr ? "تم إنشاء هذا التقرير بواسطة منصة دال" : "This report was generated by Dal Platform"}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast({
      title: language === "ar" ? "جاري التصدير" : "Exporting",
      description: language === "ar" ? "سيتم فتح نافذة الطباعة" : "Print dialog will open",
    });
  };
  if (authLoading || isLoading) {
    return (
      <main
        className="min-h-screen bg-background font-arabic flex items-center justify-center"
        dir={dir}
      >
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            {language === "ar" ? "العروض المفضلة" : "Favorite Offers"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar"
              ? `لديك ${favoriteOffers.length} عرض في المفضلة`
              : `You have ${favoriteOffers.length} favorite offers`}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link to="/offer-expiry-settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 ml-2" />
                {language === "ar" ? "إعدادات التنبيهات" : "Alert Settings"}
              </Button>
            </Link>
            <Link to="/offer-notification-logs">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 ml-2" />
                {language === "ar" ? "سجل الإشعارات" : "Notification Logs"}
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
              disabled={favoriteOffers.length === 0}
            >
              <Download className="w-4 h-4 ml-2" />
              {language === "ar" ? "تصدير CSV" : "Export CSV"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToPDF}
              disabled={favoriteOffers.length === 0}
            >
              <FileText className="w-4 h-4 ml-2" />
              {language === "ar" ? "تصدير PDF" : "Export PDF"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (favoriteOffers.length === 0) {
                  toast({
                    title: language === "ar" ? "لا توجد بيانات" : "No data",
                    description: language === "ar" ? "لا توجد عروض للمشاركة" : "No offers to share",
                    variant: "destructive",
                  });
                  return;
                }

                const isAr = language === "ar";
                const message = isAr 
                  ? `📊 *إحصائيات العروض المفضلة*

📌 *الإجمالي:* ${growthStats.total} عرض
✅ *النشطة:* ${growthStats.activeOffers} عرض (${growthStats.activePercentage}%)
📅 *هذا الأسبوع:* ${weeklyComparison.thisWeekAdded} عرض جديد
📆 *هذا الشهر:* ${growthStats.thisMonth} عرض
📈 *النمو الشهري:* ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 *متوسط الخصم:* ${weeklyComparison.thisWeekAvgDiscount}%
🏪 *الموردين:* ${weeklyComparison.thisWeekSuppliers} مورد

---
*مقارنة أسبوعية:*
• عروض مضافة: ${weeklyComparison.thisWeekAdded} (الأسبوع الماضي: ${weeklyComparison.lastWeekAdded})
• منتهية هذا الأسبوع: ${weeklyComparison.expiredThisWeek}
• فرق الخصم: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`
                  : `📊 *Favorite Offers Statistics*

📌 *Total:* ${growthStats.total} offers
✅ *Active:* ${growthStats.activeOffers} offers (${growthStats.activePercentage}%)
📅 *This Week:* ${weeklyComparison.thisWeekAdded} new offers
📆 *This Month:* ${growthStats.thisMonth} offers
📈 *Monthly Growth:* ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 *Avg. Discount:* ${weeklyComparison.thisWeekAvgDiscount}%
🏪 *Suppliers:* ${weeklyComparison.thisWeekSuppliers} suppliers

---
*Weekly Comparison:*
• Added offers: ${weeklyComparison.thisWeekAdded} (Last week: ${weeklyComparison.lastWeekAdded})
• Expired this week: ${weeklyComparison.expiredThisWeek}
• Discount diff: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`;

                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
                
                toast({
                  title: isAr ? "تمت المشاركة" : "Shared",
                  description: isAr ? "تم فتح واتساب للمشاركة" : "WhatsApp opened for sharing",
                });
              }}
              disabled={favoriteOffers.length === 0}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4 ml-2" />
              {language === "ar" ? "مشاركة واتساب" : "Share WhatsApp"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (favoriteOffers.length === 0) {
                  toast({
                    title: language === "ar" ? "لا توجد بيانات" : "No data",
                    description: language === "ar" ? "لا توجد عروض للمشاركة" : "No offers to share",
                    variant: "destructive",
                  });
                  return;
                }

                const isAr = language === "ar";
                const subject = isAr 
                  ? "إحصائيات العروض المفضلة" 
                  : "Favorite Offers Statistics";
                
                const body = isAr 
                  ? `إحصائيات العروض المفضلة
                  
📌 الإجمالي: ${growthStats.total} عرض
✅ النشطة: ${growthStats.activeOffers} عرض (${growthStats.activePercentage}%)
📅 هذا الأسبوع: ${weeklyComparison.thisWeekAdded} عرض جديد
📆 هذا الشهر: ${growthStats.thisMonth} عرض
📈 النمو الشهري: ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 متوسط الخصم: ${weeklyComparison.thisWeekAvgDiscount}%
🏪 الموردين: ${weeklyComparison.thisWeekSuppliers} مورد

---
مقارنة أسبوعية:
• عروض مضافة: ${weeklyComparison.thisWeekAdded} (الأسبوع الماضي: ${weeklyComparison.lastWeekAdded})
• منتهية هذا الأسبوع: ${weeklyComparison.expiredThisWeek}
• فرق الخصم: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`
                  : `Favorite Offers Statistics

📌 Total: ${growthStats.total} offers
✅ Active: ${growthStats.activeOffers} offers (${growthStats.activePercentage}%)
📅 This Week: ${weeklyComparison.thisWeekAdded} new offers
📆 This Month: ${growthStats.thisMonth} offers
📈 Monthly Growth: ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 Avg. Discount: ${weeklyComparison.thisWeekAvgDiscount}%
🏪 Suppliers: ${weeklyComparison.thisWeekSuppliers} suppliers

---
Weekly Comparison:
• Added offers: ${weeklyComparison.thisWeekAdded} (Last week: ${weeklyComparison.lastWeekAdded})
• Expired this week: ${weeklyComparison.expiredThisWeek}
• Discount diff: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`;

                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoLink;
                
                toast({
                  title: isAr ? "تمت المشاركة" : "Shared",
                  description: isAr ? "تم فتح البريد الإلكتروني" : "Email client opened",
                });
              }}
              disabled={favoriteOffers.length === 0}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Mail className="w-4 h-4 ml-2" />
              {language === "ar" ? "مشاركة بريد" : "Share Email"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                if (favoriteOffers.length === 0) {
                  toast({
                    title: language === "ar" ? "لا توجد بيانات" : "No data",
                    description: language === "ar" ? "لا توجد عروض للنسخ" : "No offers to copy",
                    variant: "destructive",
                  });
                  return;
                }

                const isAr = language === "ar";
                const text = isAr 
                  ? `📊 إحصائيات العروض المفضلة

📌 الإجمالي: ${growthStats.total} عرض
✅ النشطة: ${growthStats.activeOffers} عرض (${growthStats.activePercentage}%)
📅 هذا الأسبوع: ${weeklyComparison.thisWeekAdded} عرض جديد
📆 هذا الشهر: ${growthStats.thisMonth} عرض
📈 النمو الشهري: ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 متوسط الخصم: ${weeklyComparison.thisWeekAvgDiscount}%
🏪 الموردين: ${weeklyComparison.thisWeekSuppliers} مورد

---
مقارنة أسبوعية:
• عروض مضافة: ${weeklyComparison.thisWeekAdded} (الأسبوع الماضي: ${weeklyComparison.lastWeekAdded})
• منتهية هذا الأسبوع: ${weeklyComparison.expiredThisWeek}
• فرق الخصم: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`
                  : `📊 Favorite Offers Statistics

📌 Total: ${growthStats.total} offers
✅ Active: ${growthStats.activeOffers} offers (${growthStats.activePercentage}%)
📅 This Week: ${weeklyComparison.thisWeekAdded} new offers
📆 This Month: ${growthStats.thisMonth} offers
📈 Monthly Growth: ${growthStats.growthPercentage >= 0 ? '+' : ''}${growthStats.growthPercentage}%
💰 Avg. Discount: ${weeklyComparison.thisWeekAvgDiscount}%
🏪 Suppliers: ${weeklyComparison.thisWeekSuppliers} suppliers

---
Weekly Comparison:
• Added offers: ${weeklyComparison.thisWeekAdded} (Last week: ${weeklyComparison.lastWeekAdded})
• Expired this week: ${weeklyComparison.expiredThisWeek}
• Discount diff: ${weeklyComparison.discountDiff >= 0 ? '+' : ''}${weeklyComparison.discountDiff}%`;

                try {
                  await navigator.clipboard.writeText(text);
                  toast({
                    title: isAr ? "تم النسخ" : "Copied",
                    description: isAr ? "تم نسخ الإحصائيات إلى الحافظة" : "Statistics copied to clipboard",
                  });
                } catch (error) {
                  toast({
                    title: isAr ? "خطأ" : "Error",
                    description: isAr ? "فشل النسخ، حاول مرة أخرى" : "Failed to copy, try again",
                    variant: "destructive",
                  });
                }
              }}
              disabled={favoriteOffers.length === 0}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <Copy className="w-4 h-4 ml-2" />
              {language === "ar" ? "نسخ" : "Copy"}
            </Button>
          </div>
        </div>
        {/* Statistics */}
        <FavoriteOffersQuickStats favoriteOffers={favoriteOffers} />

        {/* Growth Summary Stats */}
        {favoriteOffers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">{growthStats.total}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي المفضلة" : "Total Favorites"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{growthStats.thisWeek}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "هذا الأسبوع" : "This Week"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-500">{growthStats.thisMonth}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "هذا الشهر" : "This Month"}
                </p>
              </CardContent>
            </Card>
            
            <Card className={`bg-gradient-to-br border-0 ${
              growthStats.growthPercentage >= 0 
                ? "from-emerald-500/10 to-emerald-500/5" 
                : "from-red-500/10 to-red-500/5"
            }`}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${
                  growthStats.growthPercentage >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                  {growthStats.growthPercentage >= 0 ? "+" : ""}{growthStats.growthPercentage}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "نمو شهري" : "Monthly Growth"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-amber-500">{growthStats.activeOffers}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "نشطة" : "Active"}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-500">{growthStats.activePercentage}%</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "نسبة النشطة" : "Active Rate"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Weekly Comparison */}
        {favoriteOffers.length > 0 && (
          <Card className="mb-6 border-2 border-dashed border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {language === "ar" ? "مقارنة أسبوعية" : "Weekly Comparison"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === "ar" 
                  ? "الفرق بين هذا الأسبوع والأسبوع الماضي" 
                  : "Difference between this week and last week"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Added Offers Comparison */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "عروض مضافة" : "Added Offers"}
                    </span>
                    {weeklyComparison.addedDiff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : weeklyComparison.addedDiff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{weeklyComparison.thisWeekAdded}</span>
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "هذا الأسبوع" : "this week"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "الأسبوع الماضي:" : "Last week:"} {weeklyComparison.lastWeekAdded}
                    </span>
                    {weeklyComparison.addedDiff !== 0 && (
                      <Badge variant={weeklyComparison.addedDiff > 0 ? "default" : "destructive"} className="text-xs">
                        {weeklyComparison.addedDiff > 0 ? "+" : ""}{weeklyComparison.addedDiff}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Active Offers & Expired */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "نشطة / منتهية" : "Active / Expired"}
                    </span>
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-500">{weeklyComparison.thisWeekActive}</span>
                    <span className="text-sm text-muted-foreground">{language === "ar" ? "نشطة" : "active"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-red-500">
                      {weeklyComparison.expiredThisWeek} {language === "ar" ? "انتهت هذا الأسبوع" : "expired this week"}
                    </span>
                  </div>
                </div>

                {/* Average Discount Comparison */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "متوسط الخصم" : "Avg. Discount"}
                    </span>
                    {weeklyComparison.discountDiff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : weeklyComparison.discountDiff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{weeklyComparison.thisWeekAvgDiscount}%</span>
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "هذا الأسبوع" : "this week"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "الأسبوع الماضي:" : "Last week:"} {weeklyComparison.lastWeekAvgDiscount}%
                    </span>
                    {weeklyComparison.discountDiff !== 0 && (
                      <Badge variant={weeklyComparison.discountDiff > 0 ? "default" : "destructive"} className="text-xs">
                        {weeklyComparison.discountDiff > 0 ? "+" : ""}{weeklyComparison.discountDiff}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Suppliers Comparison */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "الموردين" : "Suppliers"}
                    </span>
                    {weeklyComparison.supplierDiff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : weeklyComparison.supplierDiff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{weeklyComparison.thisWeekSuppliers}</span>
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "هذا الأسبوع" : "this week"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {language === "ar" ? "الأسبوع الماضي:" : "Last week:"} {weeklyComparison.lastWeekSuppliers}
                    </span>
                    {weeklyComparison.supplierDiff !== 0 && (
                      <Badge variant={weeklyComparison.supplierDiff > 0 ? "default" : "destructive"} className="text-xs">
                        {weeklyComparison.supplierDiff > 0 ? "+" : ""}{weeklyComparison.supplierDiff}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pie Chart */}
        {favoriteOffers.length > 0 && pieChartData.length > 0 && (
          <Card className="mb-6" ref={pieChartRef}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-coffee-gold" />
                  {language === "ar" ? "توزيع حالة العروض" : "Offer Status Distribution"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportChartAsPng(pieChartRef, language === "ar" ? "توزيع-حالة-العروض" : "offer-status-distribution")}
                    title={language === "ar" ? "تصدير كصورة" : "Export as image"}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPieChart(!showPieChart)}
                  >
                    {showPieChart 
                      ? (language === "ar" ? "إخفاء" : "Hide")
                      : (language === "ar" ? "عرض" : "Show")
                    }
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showPieChart && (
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, language === "ar" ? "عدد العروض" : "Offers"]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Bar Chart by Supplier */}
        {favoriteOffers.length > 0 && supplierChartData.length > 0 && (
          <Card className="mb-6" ref={barChartRef}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-coffee-gold" />
                  {language === "ar" ? "العروض حسب المورد" : "Offers by Supplier"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportChartAsPng(barChartRef, language === "ar" ? "العروض-حسب-المورد" : "offers-by-supplier")}
                  title={language === "ar" ? "تصدير كصورة" : "Export as image"}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={supplierChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, language === "ar" ? "عدد العروض" : "Offers"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Line Chart */}
        {favoriteOffers.length > 0 && timelineData.length > 1 && (
          <Card className="mb-6" ref={timelineChartRef}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  {language === "ar" ? "تطور العروض المفضلة مع الوقت" : "Favorite Offers Over Time"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportChartAsPng(timelineChartRef, language === "ar" ? "تطور-العروض-المفضلة" : "favorite-offers-timeline")}
                  title={language === "ar" ? "تصدير كصورة" : "Export as image"}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        value, 
                        name === "cumulative" 
                          ? (language === "ar" ? "الإجمالي" : "Total")
                          : (language === "ar" ? "جديد" : "New")
                      ]}
                      labelFormatter={(label) => language === "ar" ? `التاريخ: ${label}` : `Date: ${label}`}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorCumulative)"
                      strokeWidth={2}
                      name="cumulative"
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="count"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الإجمالي التراكمي" : "Cumulative Total"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">
                    {language === "ar" ? "عروض جديدة" : "New Offers"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Trend Line Chart */}
        {favoriteOffers.length > 0 && weeklyTrendData.some(w => w.added > 0) && (
          <Card className="mb-6" ref={weeklyTrendChartRef}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  {language === "ar" ? "تطور العروض أسبوعياً" : "Weekly Offers Trend"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportChartAsPng(weeklyTrendChartRef, language === "ar" ? "تطور-العروض-أسبوعياً" : "weekly-offers-trend")}
                  title={language === "ar" ? "تصدير كصورة" : "Export as image"}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyTrendData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: language === "ar" ? "الأسبوع" : "Week", 
                        position: "insideBottom", 
                        offset: -5,
                        fontSize: 12
                      }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          added: language === "ar" ? "عروض مضافة" : "Added Offers",
                          active: language === "ar" ? "عروض نشطة" : "Active Offers",
                          avgDiscount: language === "ar" ? "متوسط الخصم %" : "Avg Discount %",
                          suppliers: language === "ar" ? "عدد الموردين" : "Suppliers",
                        };
                        return [value, labels[name] || name];
                      }}
                      labelFormatter={(label) => language === "ar" ? `أسبوع ${label}` : `Week of ${label}`}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend 
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          added: language === "ar" ? "عروض مضافة" : "Added",
                          active: language === "ar" ? "نشطة" : "Active",
                          avgDiscount: language === "ar" ? "متوسط الخصم %" : "Avg Discount %",
                          suppliers: language === "ar" ? "موردين" : "Suppliers",
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="added"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="active"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgDiscount"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="suppliers"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Search */}
        {favoriteOffers.length > 0 && (
          <div className="mb-6 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={language === "ar" ? "البحث بالعرض أو المورد..." : "Search by offer or supplier..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        )}

        {/* Filter */}
        {favoriteOffers.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "فلتر:" : "Filter:"}
            </span>
            {[
              { value: "all", label: language === "ar" ? "الكل" : "All" },
              { value: "active", label: language === "ar" ? "نشطة" : "Active" },
              { value: "expiring", label: language === "ar" ? "تنتهي قريباً" : "Expiring Soon" },
              { value: "expired", label: language === "ar" ? "منتهية" : "Expired" },
              { value: "inactive", label: language === "ar" ? "غير نشطة" : "Inactive" },
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
                className={statusFilter === filter.value ? "bg-coffee-gold hover:bg-coffee-gold/90" : ""}
              >
                {filter.label}
              </Button>
            ))}
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Discount Filter */}
        {favoriteOffers.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "نسبة الخصم:" : "Discount:"}
            </span>
            {[
              { value: "all", label: language === "ar" ? "الكل" : "All" },
              { value: "10", label: "10%+" },
              { value: "20", label: "20%+" },
              { value: "30", label: "30%+" },
              { value: "50", label: "50%+" },
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={discountFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscountFilter(filter.value as typeof discountFilter)}
                className={discountFilter === filter.value ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {filter.label}
              </Button>
            ))}
            {discountFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiscountFilter("all")}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Supplier Filter */}
        {favoriteOffers.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "المورد:" : "Supplier:"}
            </span>
            <Button
              variant={supplierFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSupplierFilter("all")}
              className={supplierFilter === "all" ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {language === "ar" ? "الكل" : "All"}
            </Button>
            {Array.from(new Set(favoriteOffers.map(f => f.offer?.supplier?.name).filter(Boolean))).map((supplierName) => (
              <Button
                key={supplierName}
                variant={supplierFilter === supplierName ? "default" : "outline"}
                size="sm"
                onClick={() => setSupplierFilter(supplierName as string)}
                className={supplierFilter === supplierName ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {supplierName}
              </Button>
            ))}
            {supplierFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSupplierFilter("all")}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Sort */}
        {favoriteOffers.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "ترتيب:" : "Sort:"}
            </span>
            {[
              { value: "added_desc", label: language === "ar" ? "الأحدث إضافة" : "Recently Added" },
              { value: "added_asc", label: language === "ar" ? "الأقدم إضافة" : "Oldest Added" },
              { value: "expiry_asc", label: language === "ar" ? "الأقرب انتهاءً" : "Expiring Soon" },
              { value: "expiry_desc", label: language === "ar" ? "الأبعد انتهاءً" : "Expiring Later" },
              { value: "discount_desc", label: language === "ar" ? "أعلى خصم" : "Highest Discount" },
              { value: "discount_asc", label: language === "ar" ? "أقل خصم" : "Lowest Discount" },
            ].map((sort) => (
              <Button
                key={sort.value}
                variant={sortBy === sort.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(sort.value as typeof sortBy)}
                className={sortBy === sort.value ? "bg-coffee-gold hover:bg-coffee-gold/90" : ""}
              >
                {sort.label}
              </Button>
            ))}
          </div>
        )}

        {/* Offers Grid */}
        {favoriteOffers.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Heart className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === "ar"
                  ? "لا توجد عروض في المفضلة"
                  : "No Favorite Offers"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ar"
                  ? "ابدأ بإضافة العروض التي تهمك للمفضلة"
                  : "Start adding offers you're interested in to favorites"}
              </p>
              <Link to="/active-offers">
                <Button variant="coffee">
                  <Tag className="w-4 h-4 mr-2" />
                  {language === "ar" ? "تصفح العروض" : "Browse Offers"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredOffers.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Filter className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === "ar"
                  ? "لا توجد عروض بهذا الفلتر"
                  : "No Offers Match Filter"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ar"
                  ? "جرب تغيير الفلتر لعرض عروض أخرى"
                  : "Try changing the filter to see other offers"}
              </p>
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                {language === "ar" ? "عرض الكل" : "Show All"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((favorite) => {
              const offer = favorite.offer;
              if (!offer) return null;

              return (
                <Card
                  key={favorite.id}
                  className={`overflow-hidden border-2 transition-colors ${
                    !offer.is_active || isExpired(offer.valid_until)
                      ? "border-muted opacity-60"
                      : "border-green-500/20 hover:border-green-500/40"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            className={
                              offer.is_active && !isExpired(offer.valid_until)
                                ? "bg-green-500"
                                : "bg-muted"
                            }
                          >
                            {offer.discount_percentage
                              ? `${offer.discount_percentage}% ${language === "ar" ? "خصم" : "OFF"}`
                              : `${offer.discount_amount} ${offer.currency || "SAR"} ${language === "ar" ? "خصم" : "OFF"}`}
                          </Badge>
                          {!offer.is_active && (
                            <Badge variant="secondary">
                              {language === "ar" ? "غير نشط" : "Inactive"}
                            </Badge>
                          )}
                          {isExpired(offer.valid_until) && (
                            <Badge variant="destructive">
                              {language === "ar" ? "منتهي" : "Expired"}
                            </Badge>
                          )}
                          {isExpiringSoon(offer.valid_until) && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              {language === "ar" ? "ينتهي قريباً" : "Expiring Soon"}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-lg">{offer.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {offer.supplier?.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleRemoveFavorite(offer.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    {offer.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {offer.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {offer.min_quantity_kg && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>
                            {language === "ar" ? "الحد الأدنى:" : "Min order:"}{" "}
                            {offer.min_quantity_kg}{" "}
                            {language === "ar" ? "كغ" : "kg"}
                          </span>
                        </div>
                      )}

                      {offer.valid_until && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Tag className="w-4 h-4" />
                          <span>
                            {language === "ar" ? "ينتهي:" : "Expires:"}{" "}
                            {new Date(offer.valid_until).toLocaleDateString(
                              language === "ar" ? "ar-SA" : "en-US"
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link to={`/offer/${offer.id}`} className="flex-1">
                        <Button
                          variant="coffee"
                          size="sm"
                          className="w-full"
                          disabled={!offer.is_active || isExpired(offer.valid_until)}
                        >
                          {language === "ar" ? "عرض التفاصيل" : "View Details"}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          const discount = offer.discount_percentage 
                            ? `${offer.discount_percentage}%` 
                            : `${offer.discount_amount} ${offer.currency || "SAR"}`;
                          const message = language === "ar"
                            ? `عرض مميز من ${offer.supplier?.name || "مورد"}: ${offer.title} - خصم ${discount}${offer.valid_until ? ` - صالح حتى ${new Date(offer.valid_until).toLocaleDateString("ar-SA")}` : ""}`
                            : `Special offer from ${offer.supplier?.name || "Supplier"}: ${offer.title} - ${discount} OFF${offer.valid_until ? ` - Valid until ${new Date(offer.valid_until).toLocaleDateString("en-US")}` : ""}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                        }}
                        title={language === "ar" ? "مشاركة عبر واتساب" : "Share via WhatsApp"}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          const discount = offer.discount_percentage 
                            ? `${offer.discount_percentage}%` 
                            : `${offer.discount_amount} ${offer.currency || "SAR"}`;
                          const subject = language === "ar"
                            ? `عرض مميز: ${offer.title}`
                            : `Special Offer: ${offer.title}`;
                          const body = language === "ar"
                            ? `عرض مميز من ${offer.supplier?.name || "مورد"}\n\n${offer.title}\nخصم: ${discount}${offer.description ? `\n\nالوصف: ${offer.description}` : ""}${offer.valid_until ? `\n\nصالح حتى: ${new Date(offer.valid_until).toLocaleDateString("ar-SA")}` : ""}`
                            : `Special offer from ${offer.supplier?.name || "Supplier"}\n\n${offer.title}\nDiscount: ${discount}${offer.description ? `\n\nDescription: ${offer.description}` : ""}${offer.valid_until ? `\n\nValid until: ${new Date(offer.valid_until).toLocaleDateString("en-US")}` : ""}`;
                          window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
                        }}
                        title={language === "ar" ? "مشاركة عبر البريد" : "Share via Email"}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default FavoriteOffers;
