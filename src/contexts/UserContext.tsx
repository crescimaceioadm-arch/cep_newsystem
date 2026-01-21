import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'caixa' | 'avaliadora' | 'geral' | 'social_media';

interface UserProfile {
  id: string;
  cargo: UserRole;
  nome?: string;
  email?: string;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  cargo: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isCaixa: boolean;
  isAvaliadora: boolean;
  isGeral: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Permissões por cargo
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/', '/recepcao', '/vendas', '/avaliacao', '/atendimentos/historico', '/vendas/historico', 
    '/financeiro', '/estoque', '/dashboard', '/configuracoes', '/auth', '/marketing'
  ],
  caixa: [
    '/', '/recepcao', '/vendas', '/vendas/historico', '/atendimentos/historico', '/financeiro', '/dashboard', '/auth'
  ],
  avaliadora: [
    '/recepcao', '/avaliacao', '/atendimentos/historico', '/auth'
  ],
  geral: [
    '/', '/recepcao', '/vendas', '/avaliacao', '/atendimentos/historico', '/vendas/historico', '/financeiro', '/auth', '/marketing'
  ],
  social_media: [
    '/marketing', '/auth'
  ],
};

// Rota padrão por cargo (para redirecionamento)
export const DEFAULT_ROUTE: Record<UserRole, string> = {
  admin: '/',
  caixa: '/dashboard',
  avaliadora: '/avaliacao',
  geral: '/vendas',
  social_media: '/marketing',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca perfil do usuário
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, cargo, nome, email')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar perfil:', error.message);
        // Fallback para admin em caso de erro (desenvolvimento)
        setProfile({ id: userId, cargo: 'admin' });
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          cargo: (data.cargo as UserRole) || 'admin',
          nome: data.nome,
          email: data.email,
        });
      } else {
        // Perfil não existe, assume admin para desenvolvimento
        setProfile({ id: userId, cargo: 'admin' });
      }
    } catch (err) {
      console.error('Exceção ao buscar perfil:', err);
      setProfile({ id: userId, cargo: 'admin' });
    }
  };

  useEffect(() => {
    // Listener de mudança de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer fetch to avoid deadlock
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
          try {
            const todayStr = new Date().toISOString().slice(0, 10);
            localStorage.setItem('session_date', todayStr);
          } catch {}
        } else {
          setProfile(null);
          try {
            localStorage.removeItem('session_date');
          } catch {}
        }
      }
    );

    // Verifica sessão existente
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
        try {
          const todayStr = new Date().toISOString().slice(0, 10);
          localStorage.setItem('session_date', todayStr);
        } catch {}
      } else {
        // Sem usuário logado - define cargo padrão como admin para dev
        setProfile({ id: 'dev', cargo: 'admin' });
        try {
          localStorage.removeItem('session_date');
        } catch {}
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargo atual (fallback para admin)
  const cargo: UserRole = profile?.cargo || 'admin';

  const value: UserContextType = {
    user,
    session,
    profile,
    cargo,
    loading,
    isAdmin: cargo === 'admin',
    isCaixa: cargo === 'caixa',
    isAvaliadora: cargo === 'avaliadora',
    isGeral: cargo === 'geral',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
}

// Verifica se cargo tem acesso à rota
export function hasAccess(cargo: UserRole, path: string): boolean {
  const permissions = ROLE_PERMISSIONS[cargo] || [];
  return permissions.some(p => {
    if (p === path) return true;
    // Match parcial para sub-rotas
    if (path.startsWith(p + '/')) return true;
    return false;
  });
}
