import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { User } from '../types';

export function getRoleHomeRoute(roleName?: string): string {
  switch (roleName) {
    case 'ADMIN':
      return '/';
    case 'MANAGER':
      return '/manager';
    case 'CASHIER':
    case 'SALESPERSON':
      return '/pos';
    case 'INVENTORY_STAFF':
      return '/inventory';
    case 'ACCOUNTANT':
      return '/expenses';
    default:
      return '/';
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (roles: string | string[]) => boolean;
  getHomeRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend
          const res = await axiosClient.get('/auth/me');
          if (res.data?.success && res.data?.data) {
            const dbUser = res.data.data;
            const updatedUser: User = {
              id: dbUser.id,
              username: dbUser.username,
              email: dbUser.email,
              fullName: dbUser.full_name,
              phone: dbUser.phone,
              roleId: dbUser.role_id,
              roleName: dbUser.role_name,
              isActive: Boolean(dbUser.is_active),
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (err) {
          console.error('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.roleName);
  };

  const getHomeRoute = () => getRoleHomeRoute(user?.roleName);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, getHomeRoute }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
