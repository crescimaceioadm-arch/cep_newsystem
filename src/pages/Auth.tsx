import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnectionStatus = 'checking' | 'connected' | 'error';

const Auth = () => {
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Verifica se já está logado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    // Checa sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase
          .from('atendimentos')
          .select('count', { count: 'exact', head: true });

        if (error) {
          setConnectionStatus('error');
          setErrorMessage(error.message);
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
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">CP</span>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">
            Cresci e Perdi
          </CardTitle>
          <p className="text-muted-foreground">
            Sistema de Gestão
          </p>
        </CardHeader>
        <CardContent>
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#F97316',
                    brandAccent: '#EA580C',
                    inputText: '#1E3A8A',
                    inputBackground: '#FFFFFF',
                    inputBorder: '#E5E7EB',
                    inputBorderFocus: '#F97316',
                    inputBorderHover: '#F97316',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                },
              },
              style: {
                button: {
                  fontWeight: '600',
                },
                anchor: {
                  color: '#F97316',
                },
                message: {
                  color: '#DC2626',
                },
              },
            }}
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'E-mail',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  link_text: 'Já tem uma conta? Entre',
                  email_input_placeholder: 'Seu e-mail',
                  password_input_placeholder: 'Sua senha',
                },
                sign_up: {
                  email_label: 'E-mail',
                  password_label: 'Senha',
                  button_label: 'Criar Conta',
                  link_text: 'Não tem conta? Cadastre-se',
                  email_input_placeholder: 'Seu e-mail',
                  password_input_placeholder: 'Crie uma senha (mín. 6 caracteres)',
                },
                forgotten_password: {
                  email_label: 'E-mail',
                  button_label: 'Enviar instruções',
                  link_text: 'Esqueceu a senha?',
                  email_input_placeholder: 'Seu e-mail',
                },
              },
            }}
            redirectTo={`${window.location.origin}/`}
          />
        </CardContent>
      </Card>

      {/* Indicador de Status da Conexão */}
      <div className="mt-6 flex items-center gap-2">
        {connectionStatus === 'checking' && (
          <Badge variant="outline" className="flex items-center gap-2 bg-white/10 text-white border-white/20">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando conexão...
          </Badge>
        )}
        
        {connectionStatus === 'connected' && (
          <Badge className="flex items-center gap-2 bg-green-600/80 hover:bg-green-600">
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
              <span className="text-xs text-red-300 max-w-xs text-center">
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
