import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authAPI } from "../api/api";
import type { User } from "../utils/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    ownerName: string;
    ownerEmail: string;
    companyName: string;
    planId: number;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        try {
          const response = await authAPI.me();
          setUser(response.data);
        } catch (error) {
          console.log(error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error) {
      console.log(error);
    }
  };

  const signup = async (data: {
    ownerName: string;
    ownerEmail: string;
    companyName: string;
    planId: number;
    password: string;
  }) => {
    const response = await authAPI.signup(data);
    const { token: newToken, user: newUser } = response.data;

    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log(error);
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      console.log(error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "admin",
    isEmployee: user?.role === "employee",
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
