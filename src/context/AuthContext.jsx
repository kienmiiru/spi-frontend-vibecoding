import { createContext, useContext, useEffect, useState } from "react";
import {
  saveAuth,
  clearAuth,
  getUser,
} from "../utils/auth";

import { apiFetch } from "../lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();

    if (storedUser) {
      setUser(storedUser);
    }

    setLoading(false);
  }, []);

  const login = async ({ username, password }) => {
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response || !response.token || !response.user) {
        throw new Error("Invalid response from server");
      }

      saveAuth(response);
      setUser(response.user);

      return response.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
