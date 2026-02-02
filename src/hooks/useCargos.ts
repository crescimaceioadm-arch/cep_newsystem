import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Cargo {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useCargos() {
  return useQuery({
    queryKey: ['cargos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .order('nome');

      if (error) throw error;
      return (data || []) as Cargo[];
    },
  });
}

export function useCreateCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novosCargo: { nome: string; descricao: string; cor: string }) => {
      const { data, error } = await supabase
        .from('cargos')
        .insert([novosCargo])
        .select()
        .single();

      if (error) throw error;
      return data as Cargo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar cargo: ' + error.message);
    },
  });
}

export function useUpdateCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dados }: Partial<Cargo> & { id: string }) => {
      const { data, error } = await supabase
        .from('cargos')
        .update(dados)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Cargo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar cargo: ' + error.message);
    },
  });
}

export function useDeleteCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo deletado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao deletar cargo: ' + error.message);
    },
  });
}
