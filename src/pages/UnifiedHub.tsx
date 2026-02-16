import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
    Building2, Package, ShoppingBag, Tag,
    MessageSquare, Bell, TrendingUp, Loader2,
    ChefHat, TreePine, Wrench, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const UnifiedHub = () => {
    const { user, isLoading: authLoading } = useAuth();
    const { language, t, dir } = useLanguage();
    const navigate = useNavigate();
    const [role, setRole] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>({});

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (!user) return;

        const fetchUserRoleAndData = async () => {
            setIsLoading(true);
            try {
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role, status")
                    .eq("user_id", user.id)
                    .single();

                if (roleData) {
                    setRole(roleData.role);
                    setStatus(roleData.status);

                    if (roleData.status === "pending") {
                        navigate("/pending-approval");
                        return;
                    }
                }

                // Adaptive Data Fetching
                if (roleData?.role === 'supplier' || roleData?.role === 'farm') {
                    const [coffeeRes, ordersRes] = await Promise.all([
                        supabase.from('coffee_offerings').select('*', { count: 'exact', head: true }).eq('supplier_id', user.id),
                        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('supplier_id', user.id)
                    ]);
                    setStats({ products: coffeeRes.count || 0, orders: ordersRes.count || 0 });

                    // Recent Orders
                    const { data: recentOrders } = await supabase
                        .from('orders')
                        .select('*, coffee_offerings(name)')
                        .eq('supplier_id', user.id)
                        .order('order_date', { ascending: false })
                        .limit(3);
                    setRecentOrders(recentOrders || []);
                } else {
                    const [suppliersRes, ordersRes] = await Promise.all([
                        supabase.from("suppliers").select("*", { count: 'exact', head: true }),
                        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
                    ]);
                    setStats({ suppliers: suppliersRes.count || 0, orders: ordersRes.count || 0 });

                    // Recent Orders
                    const { data: recentOrders } = await supabase
                        .from('orders')
                        .select('*, suppliers(name)')
                        .eq('user_id', user.id)
                        .order('order_date', { ascending: false })
                        .limit(3);
                    setRecentOrders(recentOrders || []);
                }

                // Inventory Alerts (Low Stock)
                const { data: lowStock } = await supabase
                    .from('inventory')
                    .select('*, coffee_offerings(name)')
                    .lte('quantity_kg', 10) // Mock threshold
                    .limit(3);
                setInventoryAlerts(lowStock || []);

                // Unread Messages snippet
                const { data: messages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('receiver_id', user.id)
                    .eq('is_read', false)
                    .order('created_at', { ascending: false })
                    .limit(3);
                setUnreadMessages(messages || []);

            } catch (error) {
                console.error("Error in Unified Hub:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRoleAndData();
    }, [user, navigate]);

    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
    const [unreadMessages, setUnreadMessages] = useState<any[]>([]);

    if (authLoading || isLoading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </main>
        );
    }

    const getRoleIcon = () => {
        switch (role) {
            case 'admin': return <Shield className="w-8 h-8 text-destructive" />;
            case 'supplier': return <Package className="w-8 h-8 text-primary" />;
            case 'roaster': return <TrendingUp className="w-8 h-8 text-primary" />;
            case 'cafe': return <ChefHat className="w-8 h-8 text-primary" />;
            case 'farm': return <TreePine className="w-8 h-8 text-primary" />;
            case 'maintenance': return <Wrench className="w-8 h-8 text-primary" />;
            default: return <Building2 className="w-8 h-8 text-primary" />;
        }
    };

    return (
        <main className="min-h-screen bg-aura pb-20 relative overflow-hidden" dir={dir}>
            <div className="absolute inset-0 bg-aura opacity-30 animate-aura pointer-events-none" />

            <div className="container mx-auto px-6 pt-24 relative z-10">
                {/* Hub Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4 animate-fade-up">
                        <div className="p-4 glass-card rounded-2xl shadow-xl shadow-primary/10">
                            {getRoleIcon()}
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-luxury tracking-tighter">
                                {language === 'ar' ? 'المركز الموحد' : 'Unified Hub'}
                            </h1>
                            <p className="text-white/50 font-medium">
                                {language === 'ar' ? `مرحباً بك في مساحتك كـ ${role}` : `Welcome to your space as ${role}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="glass-card hover:bg-white/5 border-white/10 text-white rounded-xl h-12 px-6 group"
                            onClick={() => navigate('/messages')}
                        >
                            <MessageSquare className="w-5 h-5 me-2 group-hover:scale-110 transition-transform" />
                            {language === 'ar' ? 'الرسائل' : 'Messages'}
                            {unreadMessages.length > 0 && (
                                <Badge className="ms-3 bg-primary text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center p-0">
                                    {unreadMessages.length}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Global Hub Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Card className="glass-card border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-transform">
                            <Package className="w-20 h-20" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-primary uppercase tracking-widest">
                                {language === 'ar' ? 'المنتجات' : 'Products'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-white">{stats.products || stats.suppliers || 0}</div>
                            <p className="text-xs text-white/40 mt-1">{language === 'ar' ? 'نشط الآن' : 'Active now'}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-transform">
                            <ShoppingBag className="w-20 h-20" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-primary uppercase tracking-widest">
                                {language === 'ar' ? 'الطلبات' : 'Orders'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-white">{stats.orders || 0}</div>
                            <p className="text-xs text-white/40 mt-1">{language === 'ar' ? 'تحت التجهيز' : 'In Progress'}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-transform">
                            <Tag className="w-20 h-20" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-primary uppercase tracking-widest">
                                {language === 'ar' ? 'العروض' : 'Offers'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-white">4</div>
                            <p className="text-xs text-white/40 mt-1">{language === 'ar' ? 'عروض حصرية' : 'Exclusive offers'}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-transform">
                            <TrendingUp className="w-20 h-20" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-primary uppercase tracking-widest">
                                {language === 'ar' ? 'التحليلات' : 'Analytics'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-white">Live</div>
                            <p className="text-xs text-white/40 mt-1">{language === 'ar' ? 'مراقبة فورية' : 'Real-time monitoring'}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Dynamic Modules Section */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="glass-card border-white/10 overflow-hidden shadow-2xl">
                            <CardHeader className="bg-white/[0.02] border-b border-white/5 py-6 px-8 flex flex-row items-center justify-between">
                                <CardTitle className="text-xl font-black text-luxury">
                                    {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
                                </CardTitle>
                                <div className="h-1 w-12 bg-primary/30 rounded-full" />
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Button
                                        variant="ghost"
                                        className="flex flex-col h-auto py-8 gap-4 rounded-2xl hover:bg-primary/10 bg-white/[0.03] border border-white/5 transition-all group"
                                        onClick={() => navigate('/create-offer')}
                                    >
                                        <Package className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black text-white/70 uppercase tracking-widest">{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex flex-col h-auto py-8 gap-4 rounded-2xl hover:bg-primary/10 bg-white/[0.03] border border-white/5 transition-all group"
                                        onClick={() => navigate('/orders')}
                                    >
                                        <ShoppingBag className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black text-white/70 uppercase tracking-widest">{language === 'ar' ? 'سجل الطلبات' : 'Order Log'}</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex flex-col h-auto py-8 gap-4 rounded-2xl hover:bg-primary/10 bg-white/[0.03] border border-white/5 transition-all group"
                                        onClick={() => navigate('/inventory')}
                                    >
                                        <TrendingUp className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black text-white/70 uppercase tracking-widest">{language === 'ar' ? 'المخزون' : 'Inventory'}</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex flex-col h-auto py-8 gap-4 rounded-2xl hover:bg-primary/10 bg-white/[0.03] border border-white/5 transition-all group"
                                        onClick={() => navigate('/profile')}
                                    >
                                        <Building2 className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black text-white/70 uppercase tracking-widest">{language === 'ar' ? 'الملف' : 'Profile'}</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Recent Activity Module */}
                            <Card className="glass-card border-white/10 overflow-hidden shadow-xl">
                                <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4 px-6">
                                    <CardTitle className="text-sm font-black text-white/60 uppercase tracking-widest flex items-center justify-between">
                                        {language === 'ar' ? 'آخر الطلبات' : 'Recent Orders'}
                                        <ShoppingBag className="w-4 h-4 text-primary" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-white/5">
                                        {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
                                            <div key={idx} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-black text-white truncate max-w-[150px]">
                                                        {order.coffee_offerings?.name || order.suppliers?.name}
                                                    </span>
                                                    <Badge className="bg-primary/20 text-primary text-[10px] uppercase font-black tracking-tighter">
                                                        {order.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-white/40 font-medium">#{order.id.substring(0, 8)} • {order.quantity_kg}kg</p>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                                                {language === 'ar' ? 'لا توجد طلبات حديثة' : 'No recent orders'}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Inventory Alerts Module */}
                            <Card className="glass-card border-white/10 overflow-hidden shadow-xl">
                                <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4 px-6">
                                    <CardTitle className="text-sm font-black text-white/60 uppercase tracking-widest flex items-center justify-between">
                                        {language === 'ar' ? 'تنبيهات المخزون' : 'Inventory Alerts'}
                                        <Package className="w-4 h-4 text-warning" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-white/5">
                                        {inventoryAlerts.length > 0 ? inventoryAlerts.map((item, idx) => (
                                            <div key={idx} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-black text-white truncate max-w-[150px]">
                                                        {item.coffee_offerings?.name}
                                                    </span>
                                                    <span className="text-xs font-black text-warning">
                                                        {item.quantity_kg}kg
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">
                                                    {language === 'ar' ? 'مخزون منخفض جداً' : 'Critically Low Stock'}
                                                </p>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                                                {language === 'ar' ? 'المخزون بحالة جيدة' : 'Inventory is healthy'}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Live Feed Module */}
                        <Card className="glass-card border-white/10 overflow-hidden shadow-xl">
                            <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4 px-6">
                                <CardTitle className="text-sm font-black text-primary uppercase tracking-widest flex items-center justify-between">
                                    {language === 'ar' ? 'تحديثات مباشرة' : 'Live Updates'}
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {unreadMessages.length > 0 ? unreadMessages.map((msg, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 group cursor-pointer" onClick={() => navigate('/messages')}>
                                        <div className="p-2 h-fit rounded-lg bg-primary/10">
                                            <MessageSquare className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white/90 group-hover:text-primary transition-colors">
                                                {msg.subject}
                                            </p>
                                            <p className="text-[10px] text-white/40 font-medium mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                                        {language === 'ar' ? 'لا توجد تحديثات' : 'No new updates'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Support CTA */}
                        <Card className="glass-card border-primary/20 bg-primary/5 p-8 text-center space-y-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <TrendingUp className="w-16 h-16 text-primary mx-auto opacity-30 group-hover:opacity-60 group-hover:scale-110 transition-all" />
                            <div className="space-y-2">
                                <h3 className="font-black text-xl text-white tracking-tight">
                                    {language === 'ar' ? 'عزز مبيعاتك' : 'Boost Your Sales'}
                                </h3>
                                <p className="text-xs text-white/60 leading-relaxed font-medium">
                                    {language === 'ar'
                                        ? 'استخدم ميزات الذكاء الاصطناعي لتحليل السوق وتوقع الطلب القادم.'
                                        : 'Use AI features to analyze the market and predict upcoming demand.'}
                                </p>
                            </div>
                            <Button className="w-full bg-primary hover:scale-105 transition-transform text-primary-foreground font-black rounded-xl h-12 relative z-10">
                                {language === 'ar' ? 'تفعيل الخدمة' : 'ACTIVATE AI'}
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default UnifiedHub;
