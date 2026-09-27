import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, getToken, setToken } from "../api/client";
import type { User } from "../types";

export interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextValue {
  user: User | null;
  booting: boolean;
  toast: (message: string, type?: Toast["type"]) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  overlay: {
    show: (title: string, subtitle?: string) => void;
    hide: () => void;
    visible: boolean;
    title: string;
    subtitle: string;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [overlayState, setOverlayState] = useState({ visible: false, title: "", subtitle: "" });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api<User>("/api/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const setAuth = useCallback((token: string, u: User) => {
    setToken(token);
    setUser(u);
  }, []);

  const overlay = useMemo(
    () => ({
      show: (title: string, subtitle = "") => setOverlayState({ visible: true, title, subtitle }),
      hide: () => setOverlayState({ visible: false, title: "", subtitle: "" }),
      get visible() {
        return overlayState.visible;
      },
      get title() {
        return overlayState.title;
      },
      get subtitle() {
        return overlayState.subtitle;
      },
    }),
    [overlayState]
  );

  return (
    <AppContext.Provider value={{ user, booting, toast, toasts, dismissToast, logout, setAuth, overlay }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
