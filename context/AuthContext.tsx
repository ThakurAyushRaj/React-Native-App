import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import { loadStoredUser, logoutUser, saveStoredUser, User } from "@/utils/auth";

type AuthContextValue = {
  user: User | null;
  isAuthLoading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedUser = await loadStoredUser();
    setUser(storedUser);
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setIsAuthLoading(false));
  }, [refreshUser]);

  const updateUser = useCallback(async (updatedUser: User) => {
    await saveStoredUser(updatedUser);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoading, refreshUser, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
