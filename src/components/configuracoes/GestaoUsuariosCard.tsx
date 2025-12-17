import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/UserContext";
import { Shield, User, Save, Loader2, Trash2 } from "lucide-react";
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
];

export function GestaoUsuariosCard() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cargoChanges, setCargoChanges] = useState<Record<string, UserRole>>({});
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UserProfile | null>(null);

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
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Controle de Acesso por Usuário
          </CardTitle>
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
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
