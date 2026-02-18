import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDateBrasilia } from "@/lib/utils";

const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface InactivityContextType {
  resetTimer: () => void;
}

const defaultContextValue: InactivityContextType = {
  resetTimer: () => {},
};

const InactivityContext = createContext<InactivityContextType>(defaultContextValue);

export function InactivityProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const midnightRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = async () => {
    try {
      // Logout do Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }

    try {
      // Limpar localStorage
      const keysToRemove = [
        "session_date",
        "caixa_selecionado",
        "auth_token",
        "user_session",
      ];
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
      localStorage.clear();
    } catch (e) {
      console.warn("Erro ao limpar localStorage:", e);
    }

    try {
      // Limpar sessionStorage
      sessionStorage.clear();
    } catch (e) {
      console.warn("Erro ao limpar sessionStorage:", e);
    }

    toast.info("Sessão expirada");
    navigate("/auth", { replace: true });
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  };

  // Agenda logout no próximo meia-noite
  const scheduleMidnightLogout = () => {
    if (midnightRef.current) {
      clearTimeout(midnightRef.current);
    }
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0); // próximo 00:00
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    midnightRef.current = setTimeout(handleLogout, msUntilMidnight);
  };

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];

    const handleActivity = () => {
      resetTimer();
    };

    // Start the timer
    resetTimer();
    scheduleMidnightLogout();

    // Se abriu no dia seguinte, força logout
    const todayStr = getDateBrasilia();
    const storedDate = localStorage.getItem("session_date");
    if (storedDate && storedDate !== todayStr) {
      handleLogout();
    } else {
      localStorage.setItem("session_date", todayStr);
    }

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (midnightRef.current) {
        clearTimeout(midnightRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  return (
    <InactivityContext.Provider value={{ resetTimer }}>
      {children}
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  return useContext(InactivityContext);
}
