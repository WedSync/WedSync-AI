'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminSecurityContextType {
  isSecureSession: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  setSecurityLevel: (level: 'low' | 'medium' | 'high') => void;
  refreshSecurityToken: () => Promise<void>;
}

const AdminSecurityContext = createContext<
  AdminSecurityContextType | undefined
>(undefined);

interface AdminSecurityProviderProps {
  children: ReactNode;
}

export function AdminSecurityProvider({
  children,
}: AdminSecurityProviderProps) {
  const [isSecureSession, setIsSecureSession] = useState(false);
  const [securityLevel, setSecurityLevelState] = useState<
    'low' | 'medium' | 'high'
  >('medium');

  const setSecurityLevel = (level: 'low' | 'medium' | 'high') => {
    setSecurityLevelState(level);
    // Update session security based on level
    setIsSecureSession(level === 'high');
  };

  const refreshSecurityToken = async () => {
    // Implement security token refresh logic
    try {
      // API call to refresh security token
      await fetch('/api/admin/security/refresh', { method: 'POST' });
      setIsSecureSession(true);
    } catch (error) {
      console.error('Failed to refresh security token:', error);
      setIsSecureSession(false);
    }
  };

  return (
    <AdminSecurityContext.Provider
      value={{
        isSecureSession,
        securityLevel,
        setSecurityLevel,
        refreshSecurityToken,
      }}
    >
      {children}
    </AdminSecurityContext.Provider>
  );
}

export function useAdminSecurity() {
  const context = useContext(AdminSecurityContext);
  if (context === undefined) {
    throw new Error(
      'useAdminSecurity must be used within an AdminSecurityProvider',
    );
  }
  return context;
}
