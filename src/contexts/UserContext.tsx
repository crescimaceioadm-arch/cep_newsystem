import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { getDateBrasilia } from '@/lib/utils';
import type { TipoPermissao } from '@/hooks/usePermissoesUsuario';

export type UserRole = 'admin' | 'caixa' | 'avaliadora' | 'geral' | 'social_media' | 'mkt';

interface UserProfile {
  id: string;
  cargo: UserRole;
  nome?: string;
  email?: string;
  precisa_mudar_senha?: boolean;
  permissoes?: Map<TipoPermissao, boolean>;
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
  hasPermission: (permissao: TipoPermissao) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Permissões por cargo
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/', '/recepcao', '/recepcao/clientes', '/vendas', '/avaliacao', '/atendimentos/historico', '/vendas/historico', 
    '/financeiro', '/estoque', '/dashboard', '/configuracoes', '/auth', '/marketing', '/performance-vendas', '/logs-atividades',
    '/cockpit-real-time'
  ],
  caixa: [
    '/recepcao', '/vendas', '/vendas/historico', '/atendimentos/historico', '/financeiro', '/dashboard', '/auth', '/performance-vendas'
  ],
  avaliadora: [
    '/recepcao', '/avaliacao', '/atendimentos/historico', '/auth'
  ],
  geral: [
    '/', '/recepcao', '/vendas', '/avaliacao', '/atendimentos/historico', '/vendas/historico', '/financeiro', '/auth', '/marketing', '/performance-vendas'
  ],
  social_media: [
    '/marketing', '/auth'
  ],
  mkt: [
    '/marketing', '/auth', '/dashboard'
  ],
};

// Rota padrão por cargo (para redirecionamento)
export const DEFAULT_ROUTE: Record<UserRole, string> = {
  admin: '/cockpit-real-time',
  caixa: '/dashboard',
  avaliadora: '/avaliacao',
  geral: '/vendas',
  social_media: '/marketing',
  mkt: '/marketing',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca perfil do usuário e suas permissões individuais
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, cargo, nome, email, precisa_mudar_senha')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar perfil:', error.message);
        setProfile(null);
        return;
      }

      if (data) {
        // Buscar permissões individuais do usuário
        const { data: permissoesData } = await supabase
          .from('permissoes_usuario')
          .select('permissao, concedida')
          .eq('user_id', userId);

        // Criar mapa de permissões
        const permissoesMap = new Map<TipoPermissao, boolean>();
        if (permissoesData) {
          permissoesData.forEach((p) => {
            permissoesMap.set(p.permissao as TipoPermissao, p.concedida);
          });
        }

        setProfile({
          id: data.id,
          cargo: (data.cargo as UserRole) || 'geral',
          nome: data.nome,
          email: data.email,
          precisa_mudar_senha: data.precisa_mudar_senha || false,
          permissoes: permissoesMap,
        });
      } else {
        console.warn('Perfil não encontrado para usuário:', userId);
        setProfile(null);
      }
    } catch (err) {
      console.error('Exceção ao buscar perfil:', err);
      setProfile(null);
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
            const todayStr = getDateBrasilia();
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
          const todayStr = getDateBrasilia();
          localStorage.setItem('session_date', todayStr);
        } catch {}
      } else {
        setProfile(null);
        try {
          localStorage.removeItem('session_date');
        } catch {}
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargo atual (fallback para 'geral' se não encontrado)
  const cargo: UserRole = profile?.cargo || 'geral';

  // Verificar se usuário tem permissão específica
  const hasPermission = (permissao: TipoPermissao): boolean => {
    // Primeiro, verificar se há uma negação explícita para esta permissão
    if (profile?.permissoes && profile.permissoes.has(permissao)) {
      const permissaoDefinida = profile.permissoes.get(permissao);
      console.log(`[hasPermission] ${permissao}: definida explicitamente como`, permissaoDefinida);
      // Se está explicitamente definida como false, negar
      if (permissaoDefinida === false) {
        return false;
      }
      // Se está definida como true, conceder
      if (permissaoDefinida === true) {
        return true;
      }
    }

    // Se não há definição explícita, usar permissões do cargo (comportamento padrão)
    console.log(`[hasPermission] ${permissao}: não definida, usando cargo ${cargo}`);
    
    // Convertendo permissão para path de menu se aplicável
    if (permissao.startsWith('menu:')) {
      const menuPath = permissao.replace('menu:', '');
      const acesso = hasAccess(cargo, menuPath);
      console.log(`[hasPermission] menu ${menuPath}: cargo ${cargo} tem acesso?`, acesso);
      return acesso;
    }

    // Para ações e exportações, admin tem tudo por padrão
    if (cargo === 'admin') return true;

    // Para outros cargos, definir permissões específicas
    if (permissao === 'action:editar_venda' || permissao === 'action:deletar_venda') {
      return ['admin', 'caixa', 'geral'].includes(cargo);
    }
    if (permissao === 'action:editar_avaliacao' || permissao === 'action:deletar_avaliacao') {
      return ['admin', 'avaliadora'].includes(cargo);
    }
    if (permissao.startsWith('financeiro:')) {
      return ['admin', 'caixa', 'geral'].includes(cargo);
    }
    if (permissao.startsWith('export:')) {
      return ['admin', 'caixa', 'geral'].includes(cargo);
    }

    return false;
  };

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
    hasPermission,
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
