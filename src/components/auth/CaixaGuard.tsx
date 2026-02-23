import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useCaixa } from "@/contexts/CaixaContext";
import { SelecionarCaixaModal } from "@/components/layout/SelecionarCaixaModal";
import { getDateBrasilia } from "@/lib/utils";

const STORAGE_KEY_NAO_ABRIR_CAIXA3 = "admin_nao_abrir_caixa3";

/**
 * Component that guards access and shows cash register selection modal
 * when user is authenticated but hasn't selected a cash register
 */
export function CaixaGuard() {
  const { user, loading, cargo, profile } = useUser();
  const { caixaSelecionado, setShowModal, initializeCaixaForRole } = useCaixa();
  const location = useLocation();

  // Auto-inicializar caixa para admin
  useEffect(() => {
    if (!loading && user && profile) {
      initializeCaixaForRole(cargo, user.id);
    }
  }, [user, loading, cargo, profile, initializeCaixaForRole]);

  useEffect(() => {
    // Only show modal if:
    // 1. User is authenticated (not loading and has user)
    // 2. User has a role that uses cash registers (caixa, geral, admin)
    // 3. No cash register is selected
    // 4. Not on auth page
    const needsCaixa = cargo === "caixa" || cargo === "geral" || cargo === "admin";
    const isAuthPage = location.pathname === "/auth";
    
    // Verificar se admin já escolheu "não abrir" hoje
    let adminJaEscolheuNaoAbrir = false;
    if (cargo === "admin") {
      const dataEscolha = localStorage.getItem(STORAGE_KEY_NAO_ABRIR_CAIXA3);
      const hoje = getDateBrasilia();
      adminJaEscolheuNaoAbrir = dataEscolha === hoje;
    }
    
    if (!loading && user && needsCaixa && !caixaSelecionado && !isAuthPage && !adminJaEscolheuNaoAbrir) {
      setShowModal(true);
    }
  }, [user, loading, cargo, caixaSelecionado, location.pathname, setShowModal]);

  return <SelecionarCaixaModal />;
}
