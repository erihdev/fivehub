import { Suspense, lazy, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { CartProvider } from "@/hooks/useCart";
import { SubscriptionFeaturesProvider } from "@/hooks/useSubscriptionFeatures";
import PageLoader from "@/components/PageLoader";
import OfflineIndicator from "@/components/OfflineIndicator";
import Header from "@/components/Header";
import RealtimeNotifications from "@/components/RealtimeNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ReactNode } from "react";

function RemountOnNavigate({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <div key={location.key}>{children}</div>;
}

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const UnifiedHub = lazy(() => import("./pages/UnifiedHub"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PendingUsers = lazy(() => import("./pages/PendingUsers"));
const ApprovedUsers = lazy(() => import("./pages/ApprovedUsers"));
const ManageSuppliers = lazy(() => import("./pages/ManageSuppliers"));
const ManageRoasters = lazy(() => import("./pages/ManageRoasters"));
const RoasterAnalytics = lazy(() => import("./pages/RoasterAnalytics"));
const CreateOffer = lazy(() => import("./pages/CreateOffer"));
const Terms = lazy(() => import("./pages/Terms"));
const PriceAlerts = lazy(() => import("./pages/PriceAlerts"));
const Messages = lazy(() => import("./pages/Messages"));
const Reports = lazy(() => import("./pages/Reports"));
const InventoryReport = lazy(() => import("./pages/InventoryReport"));
const ReportSettings = lazy(() => import("./pages/ReportSettings"));
const PerformanceAlertSettings = lazy(() => import("./pages/PerformanceAlertSettings"));
const SmartCheckLogs = lazy(() => import("./pages/SmartCheckLogs"));
const SentReportsHistory = lazy(() => import("./pages/SentReportsHistory"));
const CustomDashboard = lazy(() => import("./pages/CustomDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ActiveOffers = lazy(() => import("./pages/ActiveOffers"));
const OfferDetail = lazy(() => import("./pages/OfferDetail"));
const FavoriteOffers = lazy(() => import("./pages/FavoriteOffers"));
const FavoriteOffersSummaryStats = lazy(() => import("./pages/FavoriteOffersSummaryStats"));
const OfferExpiryAlertSettings = lazy(() => import("./pages/OfferExpiryAlertSettings"));
const OfferNotificationLogs = lazy(() => import("./pages/OfferNotificationLogs"));
const CommissionManagement = lazy(() => import("./pages/CommissionManagement"));
const CommissionReportsHistory = lazy(() => import("./pages/CommissionReportsHistory"));
const CommissionNotificationLogs = lazy(() => import("./pages/CommissionNotificationLogs"));
const NotificationSuccessMonitor = lazy(() => import("./pages/NotificationSuccessMonitor"));
const ScheduledTasksMonitor = lazy(() => import("./pages/ScheduledTasksMonitor"));
const DelayedShipmentSettings = lazy(() => import("./pages/DelayedShipmentSettings"));
const DelayedShipmentsReport = lazy(() => import("./pages/DelayedShipmentsReport"));
const SupplierDelayNotifications = lazy(() => import("./pages/SupplierDelayNotifications"));
const SupplierPerformanceReport = lazy(() => import("./pages/SupplierPerformanceReport"));
const SupplierLeaderboard = lazy(() => import("./pages/SupplierLeaderboard"));
const MySupplierBadges = lazy(() => import("./pages/MySupplierBadges"));
const SupplierCompetition = lazy(() => import("./pages/SupplierCompetition"));
const SupplierGoals = lazy(() => import("./pages/SupplierGoals"));
const SupplierPerformanceComparison = lazy(() => import("./pages/SupplierPerformanceComparison"));
const SupplierNotificationSettings = lazy(() => import("./pages/SupplierNotificationSettings"));
const MonthlyReportsHistory = lazy(() => import("./pages/MonthlyReportsHistory"));
const AdminReportsStatistics = lazy(() => import("./pages/AdminReportsStatistics"));
const SupplierPushNotifications = lazy(() => import("./pages/SupplierPushNotifications"));
const SupplyChainTracking = lazy(() => import("./pages/SupplyChainTracking"));
const SmartMatching = lazy(() => import("./pages/SmartMatching"));
const LiveMarketPrices = lazy(() => import("./pages/LiveMarketPrices"));
const LiveCuppingSessions = lazy(() => import("./pages/LiveCuppingSessions"));
const LiveAuctions = lazy(() => import("./pages/LiveAuctions"));
const BlendCreator = lazy(() => import("./pages/BlendCreator"));
const HarvestContracts = lazy(() => import("./pages/HarvestContracts"));
const CreateHarvestOffer = lazy(() => import("./pages/CreateHarvestOffer"));
const CoffeeResale = lazy(() => import("./pages/CoffeeResale"));
const CreateAuction = lazy(() => import("./pages/CreateAuction"));
const ResaleContractsAdmin = lazy(() => import("./pages/ResaleContractsAdmin"));
const ShippingAnalytics = lazy(() => import("./pages/ShippingAnalytics"));
const ShippingLabelPrint = lazy(() => import("./pages/ShippingLabelPrint"));
const WhatsAppNotificationSettings = lazy(() => import("./pages/WhatsAppNotificationSettings"));
const AIUpload = lazy(() => import("./pages/AIUpload"));
const QuoteRequest = lazy(() => import("./pages/QuoteRequest"));
const MyQuotes = lazy(() => import("./pages/MyQuotes"));
const SupplierQuotes = lazy(() => import("./pages/SupplierQuotes"));
const MaintenanceDashboard = lazy(() => import("./pages/MaintenanceDashboard"));
const ManageCafes = lazy(() => import("./pages/ManageCafes"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const AdminLanding = lazy(() => import("./pages/AdminLanding"));
const SupplierPriceComparisonPage = lazy(() => import("./pages/SupplierPriceComparisonPage"));

const RoasterCafes = lazy(() => import("./pages/RoasterCafes"));
const LiveTrackingDemo = lazy(() => import("./pages/LiveTrackingDemo"));
const DirectSupplyContracts = lazy(() => import("./pages/DirectSupplyContracts"));
const CreateDirectContract = lazy(() => import("./pages/CreateDirectContract"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const RefundManagement = lazy(() => import("./pages/RefundManagement"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const SellerOrdersHub = lazy(() => import("./pages/SellerOrdersHub"));
const BuyerOrdersHub = lazy(() => import("./pages/BuyerOrdersHub"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PlatformGuide = lazy(() => import("./pages/PlatformGuide"));

const App = () => {
  // Create QueryClient inside component to ensure proper React instance
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <SubscriptionFeaturesProvider>
                  <CartProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <OfflineIndicator />
                      <RealtimeNotifications />
                      <Header />
                      <div className="pt-14">
                        <Suspense fallback={<PageLoader />}>
                          <RemountOnNavigate>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/forgot-password" element={<ForgotPassword />} />
                              <Route path="/reset-password" element={<ResetPassword />} />
                              <Route path="/terms" element={<Terms />} />
                              <Route path="/pending-approval" element={<PendingApproval />} />
                              <Route path="/admin" element={<AdminDashboard />} />
                              <Route path="/admin-landing" element={<AdminLanding />} />
                              <Route path="/pending-users" element={<PendingUsers />} />
                              <Route path="/approved-users" element={<ApprovedUsers />} />
                              <Route path="/admin-users" element={<AdminUsers />} />
                              <Route path="/manage-suppliers" element={<ManageSuppliers />} />
                              <Route path="/manage-roasters" element={<ManageRoasters />} />
                              <Route path="/manage-cafes" element={<ManageCafes />} />
                              <Route path="/staff-management" element={<StaffManagement />} />
                              <Route path="/create-offer" element={<UnifiedHub />} />
                              <Route path="/profile" element={<Profile />} />
                              <Route path="/dashboard" element={<UnifiedHub />} />
                              <Route path="/hub" element={<UnifiedHub />} />
                              <Route path="/compare" element={<UnifiedHub />} />
                              <Route path="/inventory" element={<UnifiedHub />} />
                              <Route path="/cupping" element={<UnifiedHub />} />
                              <Route path="/favorites" element={<UnifiedHub />} />
                              <Route path="/calculator" element={<UnifiedHub />} />
                              <Route path="/orders" element={<UnifiedHub />} />
                              <Route path="/roast-profiles" element={<UnifiedHub />} />
                              <Route path="/harvest-calendar" element={<UnifiedHub />} />
                              <Route path="/profit-calculator" element={<UnifiedHub />} />
                              <Route path="/origin-map" element={<UnifiedHub />} />
                              <Route path="/suppliers" element={<Suppliers />} />
                              <Route path="/suppliers/:id" element={<SupplierDetail />} />
                              <Route path="/price-alerts" element={<PriceAlerts />} />
                              <Route path="/messages" element={<Messages />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/inventory-report" element={<InventoryReport />} />
                              <Route path="/report-settings" element={<ReportSettings />} />
                              <Route path="/performance-alert-settings" element={<PerformanceAlertSettings />} />
                              <Route path="/smart-check-logs" element={<SmartCheckLogs />} />
                              <Route path="/sent-reports" element={<SentReportsHistory />} />
                              <Route path="/custom-dashboard" element={<CustomDashboard />} />
                              <Route path="/active-offers" element={<ActiveOffers />} />
                              <Route path="/offer/:id" element={<OfferDetail />} />
                              <Route path="/favorite-offers" element={<FavoriteOffers />} />
                              <Route path="/favorite-offers-stats" element={<FavoriteOffersSummaryStats />} />
                              <Route path="/offer-expiry-settings" element={<OfferExpiryAlertSettings />} />
                              <Route path="/offer-notification-logs" element={<OfferNotificationLogs />} />
                              <Route path="/commission-management" element={<CommissionManagement />} />
                              <Route path="/commission-reports" element={<CommissionReportsHistory />} />
                              <Route path="/commission-notification-logs" element={<CommissionNotificationLogs />} />
                              <Route path="/notification-success-monitor" element={<NotificationSuccessMonitor />} />
                              <Route path="/scheduled-tasks" element={<ScheduledTasksMonitor />} />
                              <Route path="/delayed-shipment-settings" element={<DelayedShipmentSettings />} />
                              <Route path="/delayed-shipments-report" element={<DelayedShipmentsReport />} />
                              <Route path="/supplier-delay-notifications" element={<SupplierDelayNotifications />} />
                              <Route path="/supplier-performance-report" element={<SupplierPerformanceReport />} />
                              <Route path="/supplier-leaderboard" element={<SupplierLeaderboard />} />
                              <Route path="/my-badges" element={<MySupplierBadges />} />
                              <Route path="/supplier-competition" element={<SupplierCompetition />} />
                              <Route path="/supplier-goals" element={<SupplierGoals />} />
                              <Route path="/performance-comparison" element={<SupplierPerformanceComparison />} />
                              <Route path="/supplier-notification-settings" element={<SupplierNotificationSettings />} />
                              <Route path="/monthly-reports-history" element={<MonthlyReportsHistory />} />
                              <Route path="/admin-reports-statistics" element={<AdminReportsStatistics />} />
                              <Route path="/supplier-notifications" element={<SupplierPushNotifications />} />
                              <Route path="/supply-chain" element={<SupplyChainTracking />} />
                              <Route path="/smart-matching" element={<SmartMatching />} />
                              <Route path="/market-prices" element={<LiveMarketPrices />} />
                              <Route path="/cupping-live" element={<LiveCuppingSessions />} />
                              <Route path="/live-auctions" element={<LiveAuctions />} />
                              <Route path="/blend-creator" element={<BlendCreator />} />
                              <Route path="/harvest-contracts" element={<HarvestContracts />} />
                              <Route path="/create-harvest-offer" element={<CreateHarvestOffer />} />
                              <Route path="/coffee-resale" element={<CoffeeResale />} />
                              <Route path="/create-auction" element={<CreateAuction />} />
                              <Route path="/resale-contracts" element={<ResaleContractsAdmin />} />
                              <Route path="/shipping-analytics" element={<ShippingAnalytics />} />
                              <Route path="/shipping-label" element={<ShippingLabelPrint />} />
                              <Route path="/whatsapp-settings" element={<WhatsAppNotificationSettings />} />
                              <Route path="/ai-upload" element={<AIUpload />} />
                              <Route path="/quote-request" element={<QuoteRequest />} />
                              <Route path="/my-quotes" element={<MyQuotes />} />
                              <Route path="/supplier-quotes" element={<SupplierQuotes />} />
                              <Route path="/maintenance-dashboard" element={<MaintenanceDashboard />} />
                              <Route path="/supplier-price-comparison" element={<SupplierPriceComparisonPage />} />

                              <Route path="/roaster-cafes" element={<RoasterCafes />} />
                              <Route path="/live-tracking" element={<LiveTrackingDemo />} />
                              <Route path="/direct-contracts" element={<DirectSupplyContracts />} />
                              <Route path="/create-direct-contract" element={<CreateDirectContract />} />
                              <Route path="/contract/:id" element={<ContractDetail />} />
                              <Route path="/refund-management" element={<RefundManagement />} />
                              <Route path="/subscription-plans" element={<SubscriptionPlans />} />
                              <Route path="/seller-orders" element={<SellerOrdersHub />} />
                              <Route path="/buyer-orders" element={<BuyerOrdersHub />} />
                              <Route path="/checkout" element={<Checkout />} />
                              <Route path="/platform-guide" element={<PlatformGuide />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </RemountOnNavigate>
                        </Suspense>
                      </div>
                    </TooltipProvider>
                  </CartProvider>
                </SubscriptionFeaturesProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
