import React, { createContext, useContext, useState } from 'react';
import { setAuthToken } from './api';

interface AuthContextValue {
  isLoggedIn: boolean;
  userEmail: string | null;
  login: (email: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  userEmail: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  function login(email: string, token: string) {
    setAuthToken(token);
    setUserEmail(email);
    setIsLoggedIn(true);
  }

  function logout() {
    setAuthToken(null);
    setUserEmail(null);
    setIsLoggedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
