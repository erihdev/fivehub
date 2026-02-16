import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, Gavel, Clock, Users, TrendingUp, Flame, Trophy, Medal, Award,
  Coffee, MapPin, Mountain, Beaker, Star, AlertCircle, History, Target
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Auction {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  starting_price: number;
  current_price: number;
  min_increment: number;
  quantity_kg: number;
  currency: string;
  start_time: string;
  end_time: string;
  status: string;
  supplier_id: string;
  supplier_name?: string;
  bids_count?: number;
  winner_id?: string | null;
  coffee_id?: string | null;
  coffee?: {
    name: string;
    origin: string | null;
    region: string | null;
    altitude: string | null;
    process: string | null;
    variety: string | null;
    score: number | null;
    flavor: string | null;
  };
  image_url?: string | null;
}

interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bid_amount: number;
  created_at: string;
  paddle_number?: number;
}

const LiveAuctions = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number>(0);
  const [auctionBids, setAuctionBids] = useState<Record<string, Bid[]>>({});
  const [placingBid, setPlacingBid] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [userPaddleNumber, setUserPaddleNumber] = useState<number | null>(null);
  const [lastBidTime, setLastBidTime] = useState<number>(0);
  
  // Global timer extension on any bid (3 minutes like CoE)
  const EXTENSION_TIME = 180; // 3 minutes in seconds

  useEffect(() => {
    fetchAuctions();
    generatePaddleNumber();
    
    const channel = supabase
      .channel('auctions-realtime-professional')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_auctions' }, () => {
        fetchAuctions();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids' }, (payload) => {
        const newBid = payload.new as Bid;
        setAuctionBids(prev => ({
          ...prev,
          [newBid.auction_id]: [newBid, ...(prev[newBid.auction_id] || [])].sort((a, b) => b.bid_amount - a.bid_amount)
        }));
        // Extend global timer on any new bid
        setLastBidTime(Date.now());
        toast.info(language === 'ar' ? 'مزايدة جديدة!' : 'New bid placed!', {
          description: `${newBid.bid_amount} ${language === 'ar' ? 'ريال' : 'SAR'}`
        });
        fetchAuctions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Global countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const liveAuctions = auctions.filter(a => a.status === 'live');
      if (liveAuctions.length === 0) {
        setGlobalTimeLeft(0);
        return;
      }

      // Find the earliest end time among live auctions
      const earliestEnd = Math.min(...liveAuctions.map(a => new Date(a.end_time).getTime()));
      const now = Date.now();
      
      // If there was a recent bid, extend the timer
      const timeSinceLastBid = (now - lastBidTime) / 1000;
      if (lastBidTime > 0 && timeSinceLastBid < EXTENSION_TIME) {
        const remaining = EXTENSION_TIME - timeSinceLastBid;
        setGlobalTimeLeft(Math.max(remaining, (earliestEnd - now) / 1000));
      } else {
        setGlobalTimeLeft(Math.max(0, (earliestEnd - now) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctions, lastBidTime]);

  const generatePaddleNumber = useCallback(() => {
    if (user) {
      // Generate consistent paddle number from user ID
      const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      setUserPaddleNumber((hash % 900) + 100); // 3-digit paddle number
    }
  }, [user]);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('coffee_auctions')
        .select(`
          *,
          suppliers(name),
          coffee_offerings(name, origin, region, altitude, process, variety, score, flavor)
        `)
        .eq('approval_status', 'approved')
        .in('status', ['upcoming', 'live'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const auctionsWithDetails = await Promise.all(
        (data || []).map(async (auction: any) => {
          const { data: bidsData, count } = await supabase
            .from('auction_bids')
            .select('*', { count: 'exact' })
            .eq('auction_id', auction.id)
            .order('bid_amount', { ascending: false });

          setAuctionBids(prev => ({
            ...prev,
            [auction.id]: bidsData || []
          }));

          return {
            ...auction,
            supplier_name: auction.suppliers?.name,
            coffee: auction.coffee_offerings,
            bids_count: count || 0
          };
        })
      );

      setAuctions(auctionsWithDetails);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async () => {
    if (!selectedAuction || !user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول للمزايدة' : 'You must be logged in to bid');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= selectedAuction.current_price) {
      toast.error(language === 'ar' ? 'يجب أن يكون المبلغ أعلى من السعر الحالي' : 'Bid must be higher than current price');
      return;
    }

    if (amount < selectedAuction.current_price + selectedAuction.min_increment) {
      toast.error(language === 'ar' ? `الحد الأدنى للزيادة هو ${selectedAuction.min_increment}` : `Minimum increment is ${selectedAuction.min_increment}`);
      return;
    }

    setPlacingBid(true);
    try {
      const { error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: selectedAuction.id,
          bidder_id: user.id,
          bid_amount: amount
        });

      if (bidError) throw bidError;

      const { error: updateError } = await supabase
        .from('coffee_auctions')
        .update({ current_price: amount, winner_id: user.id })
        .eq('id', selectedAuction.id);

      if (updateError) throw updateError;

      toast.success(language === 'ar' ? 'تم تقديم المزايدة بنجاح!' : 'Bid placed successfully!');
      setBidAmount('');
      setBidDialogOpen(false);
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error(language === 'ar' ? 'فشل في تقديم المزايدة' : 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserRank = (auctionId: string): { rank: number; isLeading: boolean } | null => {
    if (!user) return null;
    const bids = auctionBids[auctionId] || [];
    const userBidIndex = bids.findIndex(b => b.bidder_id === user.id);
    if (userBidIndex === -1) return null;
    return { rank: userBidIndex + 1, isLeading: userBidIndex === 0 };
  };

  const getPaddleNumber = (bidderId: string): number => {
    const hash = bidderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 900) + 100;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const liveAuctions = auctions.filter(a => a.status === 'live');
  const upcomingAuctions = auctions.filter(a => a.status === 'upcoming');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">{language === 'ar' ? 'جاري تحميل المزادات...' : 'Loading auctions...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Professional Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Gavel className="h-7 w-7 text-primary" />
                  {language === 'ar' ? 'مزادات القهوة المختصة' : 'Specialty Coffee Auction'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'نظام مزايدات احترافي على طراز Best of Panama' : 'Professional bidding system - Best of Panama style'}
                </p>
              </div>
            </div>
            
            {/* User Paddle Number */}
            {user && userPaddleNumber && (
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                <span className="text-xs opacity-80">{language === 'ar' ? 'رقم مضربك' : 'Your Paddle'}</span>
                <p className="text-2xl font-mono font-bold">#{userPaddleNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Timer Bar - CoE Style */}
      {liveAuctions.length > 0 && (
        <div className="bg-destructive text-destructive-foreground">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
                <span className="font-bold">
                  {language === 'ar' 
                    ? `${liveAuctions.length} لوت مباشر الآن` 
                    : `${liveAuctions.length} LOT(S) LIVE NOW`}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm opacity-80">
                  {language === 'ar' ? 'المؤقت العالمي' : 'Global Timer'}
                </span>
                <div className="bg-white/20 px-4 py-1 rounded-lg">
                  <span className="text-3xl font-mono font-bold">{formatTime(globalTimeLeft)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs opacity-70 mt-1 text-center">
              {language === 'ar' 
                ? 'أي مزايدة جديدة ستمدد المؤقت 3 دقائق لجميع اللوتات'
                : 'Any new bid extends timer by 3 minutes for all lots'}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              {language === 'ar' ? `مباشر (${liveAuctions.length})` : `Live (${liveAuctions.length})`}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {language === 'ar' ? `قريباً (${upcomingAuctions.length})` : `Upcoming (${upcomingAuctions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {liveAuctions.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد مزادات مباشرة حالياً' : 'No live auctions at the moment'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'تحقق من المزادات القادمة' : 'Check upcoming auctions'}
                </p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {liveAuctions.map((auction, index) => (
                  <AuctionLotCard
                    key={auction.id}
                    auction={auction}
                    lotNumber={index + 1}
                    bids={auctionBids[auction.id] || []}
                    userRank={getUserRank(auction.id)}
                    language={language}
                    user={user}
                    getPaddleNumber={getPaddleNumber}
                    getRankIcon={getRankIcon}
                    onBid={() => {
                      setSelectedAuction(auction);
                      setBidAmount((auction.current_price + auction.min_increment).toString());
                      setBidDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            {upcomingAuctions.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد مزادات قادمة' : 'No upcoming auctions'}
                </h3>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingAuctions.map((auction, index) => (
                  <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-mono">
                          LOT #{index + 1}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 ml-1" />
                          {language === 'ar' ? 'قريباً' : 'Upcoming'}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold mt-2">
                        {language === 'ar' ? (auction.title_ar || auction.title) : auction.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{auction.supplier_name}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
                          <p className="font-semibold">{auction.quantity_kg} kg</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{language === 'ar' ? 'سعر البداية' : 'Starting'}</span>
                          <p className="font-semibold">{auction.starting_price} {auction.currency}/kg</p>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <span className="text-xs text-muted-foreground">{language === 'ar' ? 'يبدأ في' : 'Starts at'}</span>
                        <p className="font-semibold">
                          {format(new Date(auction.start_time), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Professional Bid Dialog */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'تقديم مزايدة' : 'Place Your Bid'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAuction && (
            <div className="space-y-6">
              {/* Lot Info */}
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? (selectedAuction.title_ar || selectedAuction.title) : selectedAuction.title}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {selectedAuction.current_price} {selectedAuction.currency}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'السعر الحالي للكيلو' : 'Current price per kg'}
                </p>
              </div>

              {/* Bid Input */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="text-center text-xl font-bold h-14"
                    min={selectedAuction.current_price + selectedAuction.min_increment}
                    step={selectedAuction.min_increment}
                  />
                  <span className="text-lg font-semibold text-muted-foreground">{selectedAuction.currency}</span>
                </div>
                
                {/* Quick Increment Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 5, 10].map(multiplier => (
                    <Button
                      key={multiplier}
                      variant="outline"
                      size="sm"
                      onClick={() => setBidAmount(
                        (selectedAuction.current_price + (selectedAuction.min_increment * multiplier)).toString()
                      )}
                    >
                      +{selectedAuction.min_increment * multiplier}
                    </Button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {language === 'ar' 
                    ? `الحد الأدنى للزيادة: ${selectedAuction.min_increment} ${selectedAuction.currency}`
                    : `Minimum increment: ${selectedAuction.min_increment} ${selectedAuction.currency}`}
                </p>
              </div>

              {/* Total Cost Preview */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{language === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                  <span className="text-xl font-bold text-primary">
                    {((parseFloat(bidAmount) || 0) * selectedAuction.quantity_kg).toLocaleString()} {selectedAuction.currency}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {bidAmount} × {selectedAuction.quantity_kg} kg
                </p>
              </div>

              <Button 
                className="w-full h-14 text-lg" 
                onClick={handleBid}
                disabled={placingBid || !bidAmount || parseFloat(bidAmount) <= selectedAuction.current_price}
              >
                {placingBid ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Gavel className="h-5 w-5 ml-2" />
                    {language === 'ar' ? 'تأكيد المزايدة' : 'Confirm Bid'}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Auction Lot Card Component - Professional Style
interface AuctionLotCardProps {
  auction: Auction;
  lotNumber: number;
  bids: Bid[];
  userRank: { rank: number; isLeading: boolean } | null;
  language: string;
  user: any;
  getPaddleNumber: (id: string) => number;
  getRankIcon: (rank: number) => React.ReactNode;
  onBid: () => void;
}

const AuctionLotCard = ({ 
  auction, lotNumber, bids, userRank, language, user, getPaddleNumber, getRankIcon, onBid 
}: AuctionLotCardProps) => {
  return (
    <Card className="overflow-hidden ring-2 ring-destructive/50 bg-gradient-to-r from-card to-destructive/5">
      <div className="grid md:grid-cols-3 gap-0">
        {/* Lot Info - Left Section */}
        <div className="p-6 border-b md:border-b-0 md:border-l border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-destructive text-destructive-foreground px-3 py-1 rounded font-mono font-bold">
              LOT #{lotNumber}
            </div>
            <Badge className="bg-destructive text-destructive-foreground animate-pulse">
              <Flame className="h-3 w-3 ml-1" />
              {language === 'ar' ? 'مباشر' : 'LIVE'}
            </Badge>
          </div>
          
          <h3 className="text-xl font-bold mb-2">
            {language === 'ar' ? (auction.title_ar || auction.title) : auction.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{auction.supplier_name}</p>

          {/* Coffee Details */}
          {auction.coffee && (
            <div className="space-y-2 text-sm">
              {auction.coffee.origin && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{auction.coffee.origin} {auction.coffee.region && `- ${auction.coffee.region}`}</span>
                </div>
              )}
              {auction.coffee.altitude && (
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-primary" />
                  <span>{auction.coffee.altitude}</span>
                </div>
              )}
              {auction.coffee.process && (
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-primary" />
                  <span>{auction.coffee.process}</span>
                </div>
              )}
              {auction.coffee.variety && (
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-primary" />
                  <span>{auction.coffee.variety}</span>
                </div>
              )}
              {auction.coffee.score && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{auction.coffee.score} SCA</span>
                </div>
              )}
            </div>
          )}

          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
              <p className="text-lg font-bold">{auction.quantity_kg} kg</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'المزايدات' : 'Bids'}</span>
              <p className="text-lg font-bold flex items-center gap-1">
                <Users className="h-4 w-4" /> {bids.length}
              </p>
            </div>
          </div>
        </div>

        {/* Price & Bid Section - Center */}
        <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-transparent">
          <span className="text-sm text-muted-foreground mb-2">
            {language === 'ar' ? 'السعر الحالي للكيلو' : 'Current Price per kg'}
          </span>
          <div className="text-4xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            {auction.current_price}
            <span className="text-lg">{auction.currency}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {language === 'ar' ? `الإجمالي: ${(auction.current_price * auction.quantity_kg).toLocaleString()}` 
              : `Total: ${(auction.current_price * auction.quantity_kg).toLocaleString()}`} {auction.currency}
          </p>

          {/* User Position */}
          {userRank && (
            <div className={`mt-4 rounded-lg p-3 w-full ${userRank.isLeading ? 'bg-success/20 border border-success' : 'bg-warning/20 border border-warning'}`}>
              <div className="flex items-center justify-center gap-3">
                {getRankIcon(userRank.rank)}
                <span className="font-bold">
                  {userRank.isLeading 
                    ? (language === 'ar' ? 'أنت في المقدمة!' : "You're Leading!")
                    : (language === 'ar' ? `ترتيبك #${userRank.rank}` : `Your Rank #${userRank.rank}`)}
                </span>
              </div>
            </div>
          )}

          <Button 
            className="mt-4 w-full h-12 text-lg" 
            onClick={onBid}
            disabled={!user}
          >
            <Target className="h-5 w-5 ml-2" />
            {language === 'ar' ? 'ارفع المزايدة' : 'Place Bid'}
          </Button>
          
          <p className="text-xs text-muted-foreground mt-2">
            {language === 'ar' 
              ? `الحد الأدنى للزيادة: +${auction.min_increment}`
              : `Min increment: +${auction.min_increment}`}
          </p>
        </div>

        {/* Bid History - Right Section */}
        <div className="p-6 bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4" />
            <span className="font-semibold">{language === 'ar' ? 'سجل المزايدات' : 'Bid History'}</span>
          </div>
          
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {bids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === 'ar' ? 'لا توجد مزايدات بعد' : 'No bids yet'}
                </p>
              ) : (
                bids.map((bid, index) => (
                  <div 
                    key={bid.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      bid.bidder_id === user?.id 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getRankIcon(index + 1)}
                      <div className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                        #{getPaddleNumber(bid.bidder_id)}
                      </div>
                      {bid.bidder_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          {language === 'ar' ? 'أنت' : 'You'}
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono font-bold text-primary">
                      {bid.bid_amount} {auction.currency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};

export default LiveAuctions;
