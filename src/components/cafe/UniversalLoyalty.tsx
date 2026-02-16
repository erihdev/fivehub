import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Plus, Gift, Star, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyCard {
  id: string;
  card_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_points: number;
  tier: string;
}

interface Transaction {
  id: string;
  card_id: string;
  transaction_type: string;
  points: number;
  description: string;
  order_amount: number;
  created_at: string;
}

const UniversalLoyalty = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);

  const [newCard, setNewCard] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
  });

  const [earnPoints, setEarnPoints] = useState({
    order_amount: 0,
    description: "",
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("universal_loyalty_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setCards(data);
    setLoading(false);
  };

  const fetchTransactions = async (cardId: string) => {
    const { data } = await supabase
      .from("universal_loyalty_transactions")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setTransactions(data);
  };

  const generateCardNumber = () => {
    return `DAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  };

  const createCard = async () => {
    if (!newCard.customer_name) {
      toast.error(language === "ar" ? "يرجى إدخال اسم العميل" : "Please enter customer name");
      return;
    }

    const { error } = await supabase.from("universal_loyalty_cards").insert({
      card_number: generateCardNumber(),
      ...newCard,
    });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error creating card");
    } else {
      toast.success(language === "ar" ? "تم إنشاء البطاقة!" : "Card created!");
      setCreateOpen(false);
      setNewCard({ customer_name: "", customer_phone: "", customer_email: "" });
      fetchCards();
    }
  };

  const addPoints = async () => {
    if (!selectedCard || earnPoints.order_amount <= 0) return;

    const pointsToAdd = Math.floor(earnPoints.order_amount); // 1 point per dollar

    // Add transaction
    await supabase.from("universal_loyalty_transactions").insert({
      card_id: selectedCard.id,
      cafe_id: user?.id,
      transaction_type: "earn",
      points: pointsToAdd,
      description: earnPoints.description || (language === "ar" ? "شراء من المقهى" : "Café purchase"),
      order_amount: earnPoints.order_amount,
    });

    // Update card points
    await supabase
      .from("universal_loyalty_cards")
      .update({
        total_points: selectedCard.total_points + pointsToAdd,
        tier: getTierFromPoints(selectedCard.total_points + pointsToAdd),
      })
      .eq("id", selectedCard.id);

    toast.success(`+${pointsToAdd} ${language === "ar" ? "نقطة" : "points"}`);
    setEarnOpen(false);
    setEarnPoints({ order_amount: 0, description: "" });
    fetchCards();
  };

  const getTierFromPoints = (points: number): string => {
    if (points >= 10000) return "platinum";
    if (points >= 5000) return "gold";
    if (points >= 1000) return "silver";
    return "bronze";
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum": return "bg-gradient-to-r from-slate-400 to-slate-600";
      case "gold": return "bg-gradient-to-r from-yellow-400 to-amber-600";
      case "silver": return "bg-gradient-to-r from-gray-300 to-gray-500";
      default: return "bg-gradient-to-r from-orange-400 to-orange-600";
    }
  };

  const filteredCards = cards.filter(card =>
    card.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.card_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.customer_phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "بطاقة الولاء الموحدة" : "Universal Loyalty Card"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "نظام نقاط مشترك بين جميع المقاهي" : "Shared points system across all cafés"}
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {language === "ar" ? "بطاقة جديدة" : "New Card"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "إنشاء بطاقة ولاء" : "Create Loyalty Card"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "اسم العميل" : "Customer Name"}
                </label>
                <Input
                  value={newCard.customer_name}
                  onChange={(e) => setNewCard({ ...newCard, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "رقم الهاتف" : "Phone Number"}
                </label>
                <Input
                  value={newCard.customer_phone}
                  onChange={(e) => setNewCard({ ...newCard, customer_phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === "ar" ? "البريد الإلكتروني" : "Email"}
                </label>
                <Input
                  type="email"
                  value={newCard.customer_email}
                  onChange={(e) => setNewCard({ ...newCard, customer_email: e.target.value })}
                />
              </div>
              <Button onClick={createCard} className="w-full">
                {language === "ar" ? "إنشاء البطاقة" : "Create Card"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={language === "ar" ? "بحث بالاسم أو رقم البطاقة أو الهاتف..." : "Search by name, card number, or phone..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
          <Card
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedCard(card);
              fetchTransactions(card.id);
            }}
          >
            <div className={`h-24 ${getTierColor(card.tier)} rounded-t-lg p-4 text-white`}>
              <div className="flex items-center justify-between">
                <Star className="w-6 h-6" />
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {card.tier.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm opacity-75 mt-2">{card.card_number}</p>
            </div>
            <CardContent className="p-4">
              <h4 className="font-semibold">{card.customer_name}</h4>
              <p className="text-sm text-muted-foreground">{card.customer_phone}</p>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-2xl font-bold text-primary">{card.total_points}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "نقطة" : "points"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCard(card);
                    setEarnOpen(true);
                  }}
                >
                  <Gift className="w-4 h-4 mr-1" />
                  {language === "ar" ? "إضافة نقاط" : "Add Points"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Points Dialog */}
      <Dialog open={earnOpen} onOpenChange={setEarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "إضافة نقاط" : "Add Points"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "العميل" : "Customer"}
              </p>
              <p className="font-semibold">{selectedCard?.customer_name}</p>
              <p className="text-sm">{selectedCard?.card_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === "ar" ? "قيمة الطلب ($)" : "Order Amount ($)"}
              </label>
              <Input
                type="number"
                min={0}
                value={earnPoints.order_amount}
                onChange={(e) => setEarnPoints({ ...earnPoints, order_amount: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                = {Math.floor(earnPoints.order_amount)} {language === "ar" ? "نقطة" : "points"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === "ar" ? "وصف (اختياري)" : "Description (optional)"}
              </label>
              <Input
                value={earnPoints.description}
                onChange={(e) => setEarnPoints({ ...earnPoints, description: e.target.value })}
              />
            </div>
            <Button onClick={addPoints} className="w-full">
              {language === "ar" ? "إضافة النقاط" : "Add Points"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions */}
      {selectedCard && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "ar" ? "سجل المعاملات" : "Transaction History"} - {selectedCard.customer_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {tx.transaction_type === "earn" ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.transaction_type === "earn" ? "text-green-500" : "text-red-500"}`}>
                    {tx.transaction_type === "earn" ? "+" : "-"}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UniversalLoyalty;
