import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "caixa_selecionado";

export type CaixaOption = "Caixa 1" | "Caixa 2" | "Caixa 3";

interface CaixaContextType {
  caixaSelecionado: CaixaOption | null;
  setCaixaSelecionado: (caixa: CaixaOption) => void;
  limparCaixa: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const CaixaContext = createContext<CaixaContextType | undefined>(undefined);

export function CaixaProvider({ children }: { children: ReactNode }) {
  const [caixaSelecionado, setCaixaState] = useState<CaixaOption | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["Caixa 1", "Caixa 2", "Caixa 3"].includes(stored)) {
      setCaixaState(stored as CaixaOption);
    }
  }, []);

  const setCaixaSelecionado = (caixa: CaixaOption) => {
    setCaixaState(caixa);
    localStorage.setItem(STORAGE_KEY, caixa);
    setShowModal(false);
  };

  const limparCaixa = () => {
    setCaixaState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CaixaContext.Provider
      value={{
        caixaSelecionado,
        setCaixaSelecionado,
        limparCaixa,
        showModal,
        setShowModal,
      }}
    >
      {children}
    </CaixaContext.Provider>
  );
}

export function useCaixa() {
  const context = useContext(CaixaContext);
  if (!context) {
    throw new Error("useCaixa must be used within a CaixaProvider");
  }
  return context;
}
