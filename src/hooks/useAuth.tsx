import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'supervisor' | 'support' | 'viewer' | 'supplier' | 'roaster' | 'cafe' | 'farm' | 'maintenance';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  userRole: AppRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        setIsAdmin(false);
        setIsStaff(false);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch admin/staff status when user changes
  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsStaff(false);
        setUserRole(null);
        return;
      }

      try {
        // Check admin status
        const { data: adminData } = await supabase.rpc('is_verified_admin', {
          _user_id: user.id
        });
        setIsAdmin(adminData === true);

        // Check staff status
        const { data: staffData } = await supabase.rpc('is_staff', {
          _user_id: user.id
        });
        setIsStaff(staffData === true);

        // Get user role
        const { data: roleData } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });
        setUserRole(roleData as AppRole | null);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setIsAdmin(false);
        setIsStaff(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoles();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStaff(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, isStaff, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
