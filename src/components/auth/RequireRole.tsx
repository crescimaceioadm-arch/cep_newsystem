import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser, hasAccess, DEFAULT_ROUTE } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface RequireRoleProps {
  children: ReactNode;
}

export function RequireRole({ children }: RequireRoleProps) {
  const { cargo, loading, hasPermission } = useUser();
  const location = useLocation();
  const currentPath = location.pathname;

  // Mostra loading enquanto verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Verifica se tem acesso à rota atual usando permissões individuais
  const menuPermissao = `menu:${currentPath}` as any;
  const temAcesso = hasPermission(menuPermissao);
  
  if (!temAcesso) {
    // Redireciona para rota padrão do cargo
    const defaultRoute = DEFAULT_ROUTE[cargo];
    console.log(`Acesso negado: ${cargo} tentou acessar ${currentPath}, redirecionando para ${defaultRoute}`);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}
