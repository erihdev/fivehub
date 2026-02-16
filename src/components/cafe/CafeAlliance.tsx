import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Crown, Plus, UserPlus, ShoppingBag, Percent } from "lucide-react";
import { toast } from "sonner";

interface Alliance {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  leader_cafe_id: string;
  min_members: number;
  max_members: number;
  discount_percentage: number;
  status: string;
  members_count?: number;
}

interface AllianceMember {
  id: string;
  cafe_id: string;
  role: string;
  cafe_name?: string;
}

const CafeAlliance = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [myAlliance, setMyAlliance] = useState<Alliance | null>(null);
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAlliance, setNewAlliance] = useState({ name: "", name_ar: "", description: "" });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Check if user is in an alliance
    const { data: membership } = await supabase
      .from("cafe_alliance_members")
      .select("alliance_id, role")
      .eq("cafe_id", user?.id)
      .single();

    if (membership) {
      const { data: alliance } = await supabase
        .from("cafe_alliance_groups")
        .select("*")
        .eq("id", membership.alliance_id)
        .single();

      if (alliance) {
        setMyAlliance(alliance);

        // Fetch members
        const { data: membersList } = await supabase
          .from("cafe_alliance_members")
          .select("*")
          .eq("alliance_id", alliance.id);

        if (membersList) setMembers(membersList);
      }
    }

    // Fetch all active alliances
    const { data: alliancesList } = await supabase
      .from("cafe_alliance_groups")
      .select("*")
      .eq("status", "active");

    if (alliancesList) {
      // Get member counts
      const alliancesWithCounts = await Promise.all(
        alliancesList.map(async (a) => {
          const { count } = await supabase
            .from("cafe_alliance_members")
            .select("*", { count: "exact", head: true })
            .eq("alliance_id", a.id);
          return { ...a, members_count: count || 0 };
        })
      );
      setAlliances(alliancesWithCounts);
    }

    setLoading(false);
  };

  const createAlliance = async () => {
    if (!newAlliance.name) {
      toast.error(language === "ar" ? "يرجى إدخال اسم التحالف" : "Please enter alliance name");
      return;
    }

    const { data: alliance, error } = await supabase
      .from("cafe_alliance_groups")
      .insert({
        name: newAlliance.name,
        name_ar: newAlliance.name_ar || newAlliance.name,
        description: newAlliance.description,
        leader_cafe_id: user?.id,
        discount_percentage: 10, // Start with 10% discount
      })
      .select()
      .single();

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error creating alliance");
      return;
    }

    // Add creator as leader
    await supabase.from("cafe_alliance_members").insert({
      alliance_id: alliance.id,
      cafe_id: user?.id,
      role: "leader",
    });

    toast.success(language === "ar" ? "تم إنشاء التحالف!" : "Alliance created!");
    setCreateOpen(false);
    fetchData();
  };

  const joinAlliance = async (allianceId: string) => {
    const { error } = await supabase.from("cafe_alliance_members").insert({
      alliance_id: allianceId,
      cafe_id: user?.id,
      role: "member",
    });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error joining alliance");
    } else {
      toast.success(language === "ar" ? "تم الانضمام للتحالف!" : "Joined alliance!");
      fetchData();
    }
  };

  const leaveAlliance = async () => {
    const { error } = await supabase
      .from("cafe_alliance_members")
      .delete()
      .eq("cafe_id", user?.id);

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error leaving alliance");
    } else {
      toast.success(language === "ar" ? "تم الخروج من التحالف" : "Left alliance");
      setMyAlliance(null);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "تحالف المقاهي" : "Café Alliance Network"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "اتحدوا للحصول على خصومات أكبر" : "Unite for bigger discounts"}
            </p>
          </div>
        </div>

        {!myAlliance && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {language === "ar" ? "إنشاء تحالف" : "Create Alliance"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === "ar" ? "إنشاء تحالف جديد" : "Create New Alliance"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === "ar" ? "اسم التحالف (إنجليزي)" : "Alliance Name (English)"}
                  </label>
                  <Input
                    value={newAlliance.name}
                    onChange={(e) => setNewAlliance({ ...newAlliance, name: e.target.value })}
                    placeholder="Coffee Alliance"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === "ar" ? "اسم التحالف (عربي)" : "Alliance Name (Arabic)"}
                  </label>
                  <Input
                    value={newAlliance.name_ar}
                    onChange={(e) => setNewAlliance({ ...newAlliance, name_ar: e.target.value })}
                    placeholder="تحالف القهوة"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === "ar" ? "الوصف" : "Description"}
                  </label>
                  <Input
                    value={newAlliance.description}
                    onChange={(e) => setNewAlliance({ ...newAlliance, description: e.target.value })}
                  />
                </div>
                <Button onClick={createAlliance} className="w-full">
                  {language === "ar" ? "إنشاء" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* My Alliance */}
      {myAlliance && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {language === "ar" ? myAlliance.name_ar : myAlliance.name}
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Percent className="w-3 h-3" />
                {myAlliance.discount_percentage}% {language === "ar" ? "خصم" : "Discount"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{myAlliance.description}</p>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{members.length} {language === "ar" ? "أعضاء" : "Members"}</span>
              </div>
              <Button variant="outline" size="sm">
                <ShoppingBag className="w-4 h-4 mr-1" />
                {language === "ar" ? "طلب جماعي" : "Group Order"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {members.map((member) => (
                <Badge key={member.id} variant={member.role === "leader" ? "default" : "outline"}>
                  {member.role === "leader" && <Crown className="w-3 h-3 mr-1" />}
                  {member.cafe_name || "Café"}
                </Badge>
              ))}
            </div>

            <Button variant="destructive" size="sm" onClick={leaveAlliance}>
              {language === "ar" ? "مغادرة التحالف" : "Leave Alliance"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Alliances */}
      {!myAlliance && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {language === "ar" ? "التحالفات المتاحة" : "Available Alliances"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alliances.map((alliance) => (
              <Card key={alliance.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">
                      {language === "ar" ? alliance.name_ar : alliance.name}
                    </h4>
                    <Badge variant="secondary">
                      <Percent className="w-3 h-3 mr-1" />
                      {alliance.discount_percentage}%
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {alliance.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {alliance.members_count}/{alliance.max_members}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinAlliance(alliance.id)}
                      disabled={(alliance.members_count || 0) >= alliance.max_members}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {language === "ar" ? "انضمام" : "Join"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {alliances.length === 0 && !loading && (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                {language === "ar" ? "لا توجد تحالفات متاحة، كن أول من ينشئ واحداً!" : "No alliances available, be the first to create one!"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CafeAlliance;
