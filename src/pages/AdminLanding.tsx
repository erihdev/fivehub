import { Link } from "react-router-dom";
import { 
  Shield, 
  Users, 
  Building2, 
  Flame, 
  Coffee,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Gavel,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import fivehubLogo from "@/assets/fivehub-logo-official.png";

const AdminLanding = () => {
  const { language, dir } = useLanguage();

  const quickActions = [
    {
      icon: Users,
      title: language === 'ar' ? 'إدارة المستخدمين' : 'User Management',
      description: language === 'ar' ? 'الموافقة والرفض ومتابعة الطلبات' : 'Approve, reject and track requests',
      href: '/admin',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Building2,
      title: language === 'ar' ? 'إدارة الموردين' : 'Supplier Management',
      description: language === 'ar' ? 'متابعة وتقييم الموردين' : 'Track and evaluate suppliers',
      href: '/manage-suppliers',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: Flame,
      title: language === 'ar' ? 'إدارة المحامص' : 'Roaster Management',
      description: language === 'ar' ? 'متابعة المحامص المسجلة' : 'Track registered roasters',
      href: '/manage-roasters',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: Coffee,
      title: language === 'ar' ? 'إدارة المقاهي' : 'Cafe Management',
      description: language === 'ar' ? 'متابعة المقاهي المسجلة' : 'Track registered cafes',
      href: '/manage-cafes',
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  const financialLinks = [
    {
      icon: DollarSign,
      title: language === 'ar' ? 'إدارة العمولات' : 'Commission Management',
      href: '/commission-management',
      badge: language === 'ar' ? 'مالي' : 'Financial'
    },
    {
      icon: FileText,
      title: language === 'ar' ? 'تقارير العمولات' : 'Commission Reports',
      href: '/commission-reports-history',
      badge: language === 'ar' ? 'تقارير' : 'Reports'
    },
    {
      icon: BarChart3,
      title: language === 'ar' ? 'إحصائيات التقارير' : 'Report Statistics',
      href: '/admin-reports-statistics',
      badge: language === 'ar' ? 'تحليل' : 'Analytics'
    }
  ];

  const operationalLinks = [
    {
      icon: Users,
      title: language === 'ar' ? 'جميع المستخدمين' : 'All Users',
      href: '/admin-users',
      color: 'text-primary'
    },
    {
      icon: Gavel,
      title: language === 'ar' ? 'الموافقة على المزادات' : 'Auction Approval',
      href: '/live-auctions',
      color: 'text-purple-500'
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests',
      href: '/pending-users',
      color: 'text-yellow-500'
    },
    {
      icon: CheckCircle,
      title: language === 'ar' ? 'المستخدمين المفعلين' : 'Approved Users',
      href: '/approved-users',
      color: 'text-green-500'
    },
    {
      icon: MessageSquare,
      title: language === 'ar' ? 'الرسائل' : 'Messages',
      href: '/messages',
      color: 'text-blue-500'
    },
    {
      icon: Shield,
      title: language === 'ar' ? 'إدارة الموظفين' : 'Staff Management',
      href: '/staff-management',
      color: 'text-primary'
    },
    {
      icon: TrendingUp,
      title: language === 'ar' ? 'تحليلات الأداء' : 'Performance Analytics',
      href: '/admin-reports-statistics',
      color: 'text-indigo-500'
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-arabic" dir={dir}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <img src={fivehubLogo} alt="FiveHub" className="h-12 sm:h-16" />
            </div>
            <Link to="/admin">
              <Button variant="outline" className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-700">
                <Shield className="w-4 h-4" />
                {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
              </Button>
            </Link>
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'مرحباً بك في لوحة الإدارة' : 'Welcome to Admin Panel'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              {language === 'ar' ? 'مركز التحكم الرئيسي' : 'Main Control Center'}
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'إدارة شاملة لمنصة FIVE HUB - الموردين والمحامص والمقاهي والعمولات'
                : 'Comprehensive management of FIVE HUB platform - Suppliers, Roasters, Cafes & Commissions'}
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href} className="group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
                    <p className="text-sm text-slate-400">{action.description}</p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm">{language === 'ar' ? 'انتقل' : 'Go'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Financial Section */}
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                {language === 'ar' ? 'الإدارة المالية' : 'Financial Management'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {language === 'ar' ? 'العمولات والتقارير والإحصائيات المالية' : 'Commissions, reports and financial statistics'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {financialLinks.map((link, index) => (
                  <Link key={index} to={link.href}>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <link.icon className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{link.title}</h4>
                        <span className="text-xs text-slate-400">{link.badge}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-primary rtl:rotate-180 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operational Links */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                {language === 'ar' ? 'العمليات والإعدادات' : 'Operations & Settings'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {language === 'ar' ? 'الموافقات والرسائل وإدارة الموظفين' : 'Approvals, messages and staff management'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {operationalLinks.map((link, index) => (
                  <Link key={index} to={link.href}>
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-all text-center group">
                      <div className={`w-12 h-12 rounded-xl bg-slate-600/50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <span className="text-sm font-medium text-white">{link.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 text-slate-500 text-sm">
            <p>© 2024 FIVE HUB - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLanding;
