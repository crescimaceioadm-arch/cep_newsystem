import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface MudarSenhaObrigatoriaProps {
  onSuccess: () => void;
  email?: string;
}

export function MudarSenhaObrigatoria({ onSuccess, email }: MudarSenhaObrigatoriaProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostraSenhas, setMostraSenhas] = useState({
    atual: false,
    nova: false,
    confirma: false,
  });

  const validarSenha = (senha: string): string[] => {
    const erros: string[] = [];
    if (senha.length < 8) erros.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(senha)) erros.push('Pelo menos 1 letra maiúscula');
    if (!/[a-z]/.test(senha)) erros.push('Pelo menos 1 letra minúscula');
    if (!/[0-9]/.test(senha)) erros.push('Pelo menos 1 número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) erros.push('Pelo menos 1 caractere especial');
    return erros;
  };

  const handleMudarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!senhaAtual.trim()) {
      toast.error('Digite a senha atual');
      return;
    }

    if (senhaNova.length < 8) {
      toast.error('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (senhaNova !== senhaConfirma) {
      toast.error('As senhas não conferem');
      return;
    }

    const errosSenha = validarSenha(senhaNova);
    if (errosSenha.length > 0) {
      toast.error('Senha fraca:\n' + errosSenha.join('\n'));
      return;
    }

    setLoading(true);
    try {
      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: senhaNova,
      });

      if (updateError) throw updateError;

      // Marcar que não precisa mais mudar senha
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ precisa_mudar_senha: false })
          .eq('id', user.id);

        if (profileError) console.error('Erro ao atualizar perfil:', profileError);
      }

      toast.success('Senha alterada com sucesso!');
      onSuccess();
    } catch (err: any) {
      toast.error('Erro ao alterar senha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">CP</span>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">
            Criar Senha Pessoal
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Este é seu primeiro acesso. Por segurança, você deve criar uma senha pessoal agora.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleMudarSenha} className="space-y-4">
            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="atual">Senha Atual (Temporária)</Label>
              <div className="relative">
                <Input
                  id="atual"
                  type={mostraSenhas.atual ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite a senha temporária"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostraSenhas(p => ({ ...p, atual: !p.atual }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostraSenhas.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="nova">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova"
                  type={mostraSenhas.nova ? 'text' : 'password'}
                  value={senhaNova}
                  onChange={(e) => setSenhaNova(e.target.value)}
                  placeholder="Crie uma nova senha"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostraSenhas(p => ({ ...p, nova: !p.nova }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostraSenhas.nova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres: maiúscula, minúscula, número e caractere especial
              </p>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirma">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirma"
                  type={mostraSenhas.confirma ? 'text' : 'password'}
                  value={senhaConfirma}
                  onChange={(e) => setSenhaConfirma(e.target.value)}
                  placeholder="Confirme a nova senha"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostraSenhas(p => ({ ...p, confirma: !p.confirma }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostraSenhas.confirma ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Criar Senha Pessoal'
              )}
            </Button>
          </form>

          {email && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Usuário: {email}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
