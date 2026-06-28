import React, { createContext, useContext } from "react";

const AuthContext = createContext({
  user: { role: "admin", email: "admin@local" },
  isAuthenticated: true,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  authChecked: true,
  appPublicSettings: null,
  logout: () => {},
  navigateToLogin: () => {},
  checkUserAuth: async () => {},
  checkAppState: async () => {},
});

export const AuthProvider = ({ children }) => {
  const value = {
    user: { role: "admin", email: "admin@local" },
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    authChecked: true,
    appPublicSettings: null,
    logout: () => {
      window.location.href = "/admin/";
    },
    navigateToLogin: () => {
      window.location.href = "/admin/";
    },
    checkUserAuth: async () => {},
    checkAppState: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
