import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useCaixa } from "@/contexts/CaixaContext";
import { SelecionarCaixaModal } from "@/components/layout/SelecionarCaixaModal";

/**
 * Component that guards access and shows cash register selection modal
 * when user is authenticated but hasn't selected a cash register
 */
export function CaixaGuard() {
  const { user, loading, cargo } = useUser();
  const { caixaSelecionado, setShowModal } = useCaixa();
  const location = useLocation();

  useEffect(() => {
    // Only show modal if:
    // 1. User is authenticated (not loading and has user)
    // 2. User has a role that uses cash registers (admin, caixa, geral)
    // 3. No cash register is selected
    // 4. Not on auth page
    const needsCaixa = cargo === "caixa" || cargo === "geral";
    const isAuthPage = location.pathname === "/auth";
    
    if (!loading && user && needsCaixa && !caixaSelecionado && !isAuthPage) {
      setShowModal(true);
    }
  }, [user, loading, cargo, caixaSelecionado, location.pathname, setShowModal]);

  return <SelecionarCaixaModal />;
}
