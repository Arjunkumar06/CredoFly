import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../services/api';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUsername: string | null;
  isLoading: boolean;
  loginAdmin: (token: string, username: string) => void;
  logoutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      const storedAuth = sessionStorage.getItem('credofly_admin_auth');
      const storedUser = sessionStorage.getItem('credofly_admin_user');

      if (storedAuth) {
        try {
          const res = await adminApi.verify(storedAuth);
          if (res.data.success) {
            setIsAdminAuthenticated(true);
            setAdminUsername(storedUser || 'admin');
          } else {
            sessionStorage.removeItem('credofly_admin_auth');
            sessionStorage.removeItem('credofly_admin_user');
            setIsAdminAuthenticated(false);
          }
        } catch {
          sessionStorage.removeItem('credofly_admin_auth');
          sessionStorage.removeItem('credofly_admin_user');
          setIsAdminAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkAdminAuth();
  }, []);

  const loginAdmin = (basicAuthToken: string, username: string) => {
    sessionStorage.setItem('credofly_admin_auth', basicAuthToken);
    sessionStorage.setItem('credofly_admin_user', username);
    setIsAdminAuthenticated(true);
    setAdminUsername(username);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('credofly_admin_auth');
    sessionStorage.removeItem('credofly_admin_user');
    setIsAdminAuthenticated(false);
    setAdminUsername(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminUsername,
        isLoading,
        loginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
