import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NotificationPermissionCard() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");

  useEffect(() => {
    const hasSupport = typeof window !== "undefined" && "Notification" in window;
    setSupported(hasSupport);
    if (hasSupport) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequest = async () => {
    if (!supported) {
      toast.error("Notificacao nao suportada neste navegador");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("Permissao de notificacao concedida");
      } else if (result === "denied") {
        toast.error("Permissao de notificacao negada");
      } else {
        toast.message("Permissao de notificacao nao concedida");
      }
    } catch (error: any) {
      toast.error("Erro ao solicitar permissao: " + error?.message);
    }
  };

  const getStatusText = () => {
    if (!supported) return "Nao suportado";
    if (permission === "granted") return "Permitido";
    if (permission === "denied") return "Negado";
    if (permission === "default") return "Pendente";
    return "Desconhecido";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissao de Notificacoes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Status: <strong>{getStatusText()}</strong>
        </div>
        <Button onClick={handleRequest} disabled={!supported || permission === "granted"}>
          Solicitar permissao
        </Button>
      </CardContent>
    </Card>
  );
}
