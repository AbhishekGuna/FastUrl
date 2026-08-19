import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { clearToken, getMe, getToken, signIn as apiSignIn, signOut as apiSignOut } from "../api/client";
import type { AuthUser } from "../api/types";

interface AuthState {
  user: AuthUser | null;
  status: "checking" | "authed" | "guest";
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("checking");

  useEffect(() => {
    if (!getToken()) {
      setStatus("guest");
      return;
    }
    getMe()
      .then((u) => {
        setUser(u);
        setStatus("authed");
      })
      .catch(() => {
        clearToken();
        setStatus("guest");
      });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiSignIn(email, password);
    const u = await getMe();
    setUser(u);
    setStatus("authed");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiSignOut();
    } catch {
      // Ignore API errors during sign out to ensure local state is cleared
    } finally {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  const value = useMemo(() => ({ user, status, signIn, signOut }), [user, status, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
