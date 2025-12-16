import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnectionStatus = 'checking' | 'connected' | 'error';

const Auth = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true });

        if (error) {
          // Se tabela não existe, tenta outra tabela conhecida
          const { error: fallbackError } = await supabase
            .from('atendimentos')
            .select('count', { count: 'exact', head: true });

          if (fallbackError) {
            setConnectionStatus('error');
            setErrorMessage(fallbackError.message);
          } else {
            setConnectionStatus('connected');
          }
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        setConnectionStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-foreground">
            Cresci e Perdi
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Sistema de Gestão
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Página de autenticação em construção.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Para acessar o sistema, use a rota <code className="bg-muted px-1 rounded">/</code>
          </p>
        </CardContent>
      </Card>

      {/* Indicador de Status da Conexão Supabase */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Status da Conexão Supabase
        </span>
        
        {connectionStatus === 'checking' && (
          <Badge variant="outline" className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        )}
        
        {connectionStatus === 'connected' && (
          <Badge className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        )}
        
        {connectionStatus === 'error' && (
          <div className="flex flex-col items-center gap-1">
            <Badge variant="destructive" className="flex items-center gap-2">
              <WifiOff className="h-3 w-3" />
              Erro de Conexão
            </Badge>
            {errorMessage && (
              <span className="text-xs text-destructive max-w-xs text-center">
                {errorMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
