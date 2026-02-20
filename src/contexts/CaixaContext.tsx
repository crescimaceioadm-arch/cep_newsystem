import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole } from "./UserContext";

const STORAGE_KEY = "caixa_selecionado";

export type CaixaOption = "Caixa 1" | "Caixa 2";

interface CaixaContextType {
  caixaSelecionado: CaixaOption | null;
  setCaixaSelecionado: (caixa: CaixaOption) => void;
  limparCaixa: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  initializeCaixaForRole: (cargo: UserRole | null, userId: string | null) => void;
}

// Default values for when context is not yet available
const defaultContextValue: CaixaContextType = {
  caixaSelecionado: null,
  setCaixaSelecionado: () => {},
  limparCaixa: () => {},
  showModal: false,
  setShowModal: () => {},
  initializeCaixaForRole: () => {},
};

const CaixaContext = createContext<CaixaContextType>(defaultContextValue);

export function CaixaProvider({ children }: { children: ReactNode }) {
  const [caixaSelecionado, setCaixaState] = useState<CaixaOption | null>(() => {
    // Initialize from localStorage synchronously to prevent flicker
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ["Caixa 1", "Caixa 2"].includes(stored)) {
        return stored as CaixaOption;
      }
    }
    return null;
  });
  const [showModal, setShowModal] = useState(false);

  const setCaixaSelecionado = (caixa: CaixaOption) => {
    setCaixaState(caixa);
    localStorage.setItem(STORAGE_KEY, caixa);
    setShowModal(false);
  };

  const limparCaixa = () => {
    setCaixaState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const initializeCaixaForRole = (cargo: UserRole | null, userId: string | null) => {
    // Auto-atribuir Caixa 1 para admin ao fazer login
    if (cargo === 'admin' && userId && !caixaSelecionado) {
      const caixa: CaixaOption = "Caixa 1";
      setCaixaState(caixa);
      localStorage.setItem(STORAGE_KEY, caixa);
    }
  };

  return (
    <CaixaContext.Provider
      value={{
        caixaSelecionado,
        setCaixaSelecionado,
        limparCaixa,
        showModal,
        setShowModal,
        initializeCaixaForRole,
      }}
    >
      {children}
    </CaixaContext.Provider>
  );
}

export function useCaixa() {
  return useContext(CaixaContext);
}
