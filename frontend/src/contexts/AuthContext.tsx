import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authAPI } from "../api/api";
import type { SignupData, User } from "../utils/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if we should skip auth check (on public pages)
  const shouldSkipAuthCheck = () => {
    const path = window.location.pathname;
    const publicPaths = ["/login", "/signup"];
    return publicPaths.includes(path);
  };

  const initAuth = useCallback(async () => {
    // Skip if already initialized
    if (isInitialized) {
      return;
    }

    try {
      const savedUser = localStorage.getItem("user");

      // If no saved user and we're on a public page, skip API call
      if (!savedUser && shouldSkipAuthCheck()) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.log(e);
          localStorage.removeItem("user");
        }
      }

      if (savedUser || !shouldSkipAuthCheck()) {
        try {
          const response = await authAPI.me();
          const userData = response.data;

          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.log("Auth check failed:", error);
          setUser(null);
          localStorage.removeItem("user");
        }
      }
    } catch (error) {
      console.error("Init auth error:", error);
      setUser(null);
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Initialize only once on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authAPI.login({ email, password });
      const userData = response.data.user;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (data: SignupData): Promise<User> => {
    try {
      const response = await authAPI.signup(data);
      const userData = response.data.user;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      const userData = response.data;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Refresh user error:", error);
      await logout();
    }
  };

  // Derive computed values from state
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isEmployee,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
