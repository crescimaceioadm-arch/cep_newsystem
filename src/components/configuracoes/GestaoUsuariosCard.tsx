import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/UserContext";
import { Shield, User, Save, Loader2, Trash2, Lock, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
}

const CARGO_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-blue-600' },
  { value: 'caixa', label: 'Caixa', color: 'bg-orange-500' },
  { value: 'avaliadora', label: 'Avaliadora', color: 'bg-green-600' },
  { value: 'geral', label: 'Geral', color: 'bg-purple-500' },
  { value: 'social_media', label: 'Social Media', color: 'bg-pink-500' },
  { value: 'mkt', label: 'MKT', color: 'bg-red-600' },
];

export function GestaoUsuariosCard() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cargoChanges, setCargoChanges] = useState<Record<string, UserRole>>({});
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UserProfile | null>(null);
  const [mostrarNovoUsuario, setMostrarNovoUsuario] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoCargo, setNovoCargo] = useState<UserRole>("geral");
  const [criadoUsuario, setCriadoUsuario] = useState(false);
  const [usuarioParaResetarSenha, setUsuarioParaResetarSenha] = useState<UserProfile | null>(null);
  const [resetandoSenha, setResettandoSenha] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, cargo')
        .order('nome');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCargoChange = (userId: string, newCargo: UserRole) => {
    setCargoChanges(prev => ({ ...prev, [userId]: newCargo }));
  };

  const handleSave = async (userId: string) => {
    const newCargo = cargoChanges[userId];
    if (!newCargo) return;

    setSaving(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cargo: newCargo })
        .eq('id', userId);

      if (error) throw error;

      setUsuarios(prev => 
        prev.map(u => u.id === userId ? { ...u, cargo: newCargo } : u)
      );
      setCargoChanges(prev => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });

      toast.success('Cargo atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar cargo: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;

    setDeleting(usuarioParaExcluir.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', usuarioParaExcluir.id);

      if (error) throw error;

      setUsuarios(prev => prev.filter(u => u.id !== usuarioParaExcluir.id));
      toast.success('Usuário excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir usuário: ' + err.message);
    } finally {
      setDeleting(null);
      setUsuarioParaExcluir(null);
    }
  };

  const handleResetarSenha = async () => {
    if (!usuarioParaResetarSenha) return;

    setResettandoSenha(true);
    try {
      // Email automático desativado por enquanto
      // Usuário deve resetar sua senha manualmente via perfil ou solicitar ao admin
      
      toast.success(`Email de reset desativado. Solicite ao usuário que acesse sua conta ou entre em contato com o admin.`);
      setUsuarioParaResetarSenha(null);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setResettandoSenha(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!novoEmail.trim() || !novoNome.trim()) {
      toast.error('Email e nome são obrigatórios');
      return;
    }

    setSaving('novo');
    try {
      // Criar usuário via signUp (cria em auth.users)
      const senhaTemporaria = Math.random().toString(36).slice(-12);
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: novoEmail.trim(),
        password: senhaTemporaria,
        options: {
          data: {
            nome: novoNome.trim(),
            cargo: novoCargo,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData?.user?.id) {
        // Criar ou atualizar perfil do usuário com o ID do auth.users
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            nome: novoNome.trim(),
            email: novoEmail.trim(),
            cargo: novoCargo,
          }, {
            onConflict: 'id'
          });

        if (profileError) throw profileError;

        toast.success(`✅ Usuário criado com sucesso!\n\nEmail: ${novoEmail}\nCargo: ${novoCargo}\nSenha: ${senhaTemporaria}\n\n⚠️ Compartilhe a senha acima com o novo usuário para que ele possa fazer login.`);
        
        // Limpar formulário e carregar usuários
        setNovoEmail('');
        setNovoNome('');
        setNovoCargo('geral');
        setMostrarNovoUsuario(false);
        fetchUsuarios();
      }
    } catch (err: any) {
      toast.error('Erro ao criar usuário: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const getCargoOption = (cargo: string | null) => {
    return CARGO_OPTIONS.find(opt => opt.value === cargo) || CARGO_OPTIONS[0];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Controle de Acesso por Usuário
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setMostrarNovoUsuario(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário cadastrado no sistema.
            </p>
          ) : (
            <div className="space-y-3">
              {usuarios.map((usuario) => {
                const currentCargo = cargoChanges[usuario.id] || (usuario.cargo as UserRole) || 'admin';
                const hasChange = cargoChanges[usuario.id] !== undefined;
                const cargoOption = getCargoOption(currentCargo);

                return (
                  <div 
                    key={usuario.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {usuario.nome || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {usuario.email || usuario.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={currentCargo}
                        onValueChange={(value) => handleCargoChange(usuario.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge className={`${cargoOption.color} text-white`}>
                              {cargoOption.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CARGO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <Badge className={`${opt.color} text-white`}>
                                {opt.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {hasChange && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(usuario.id)}
                          disabled={saving === usuario.id}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {saving === usuario.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        title="Resetar senha"
                        onClick={() => setUsuarioParaResetarSenha(usuario)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setUsuarioParaExcluir(usuario)}
                        disabled={deleting === usuario.id}
                      >
                        {deleting === usuario.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar novo usuário */}
      <Dialog open={mostrarNovoUsuario} onOpenChange={setMostrarNovoUsuario}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Select value={novoCargo} onValueChange={(value) => setNovoCargo(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ A senha será gerada automaticamente e mostrada após criação. Compartilhe com o novo usuário.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMostrarNovoUsuario(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarUsuario}
              disabled={saving !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar reset de senha */}
      <AlertDialog open={!!usuarioParaResetarSenha} onOpenChange={(open) => !open && setUsuarioParaResetarSenha(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Resetar Senha
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Deseja enviar um email para resetar a senha?</p>
              <p className="font-medium">
                {usuarioParaResetarSenha?.nome || usuarioParaResetarSenha?.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Um link para redefinição de senha será enviado para {usuarioParaResetarSenha?.email}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetarSenha}
              disabled={resetandoSenha}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {resetandoSenha ? 'Enviando...' : 'Enviar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!usuarioParaExcluir} onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir este usuário?</p>
              <p className="font-medium">
                {usuarioParaExcluir?.nome || usuarioParaExcluir?.email || 'Usuário'}
              </p>
              <p className="text-sm text-muted-foreground">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
