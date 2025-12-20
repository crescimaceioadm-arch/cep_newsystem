// Forçando um novo deploy na Vercel
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAtendimentosByStatus } from "@/hooks/useAtendimentos";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvaliacaoModal } from "@/components/avaliacao/AvaliacaoModal";
import { Atendimento } from "@/types/database";

export default function Avaliacao() {
  const { data, isLoading, error } = useAtendimentosByStatus("aguardando_avaliacao");
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleIniciarAvaliacao = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setIsDialogOpen(true);
  };

  return (
    <MainLayout title="Avaliação">
      <main className="space-y-4">
        {isLoading && <div className="text-muted-foreground">Carregando...</div>}

        {error && (
          <div className="text-destructive">
            Erro ao carregar atendimentos para avaliação.
          </div>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="text-muted-foreground">
            Nenhum atendimento aguardando avaliação.
          </div>
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <section aria-label="Atendimentos aguardando avaliação" className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chegada</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome_cliente}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.hora_chegada).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleIniciarAvaliacao(a)}
                      >
                        Iniciar Avaliação
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        <AvaliacaoModal
          atendimento={selectedAtendimento}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </main>
    </MainLayout>
  );
}
