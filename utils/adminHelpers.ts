// utils/adminHelpers.ts
// Utilitários para validação de permissões de administrador

// Import React for the hook
import React from 'react';

export interface User {
  id: string;
  email: string;
  nome?: string;
  isAdmin?: boolean;
  admin?: boolean;
  is_admin?: boolean;
  role?: string;
  perfil?: string;
  tipo?: string;
  [key: string]: any; // Para campos dinâmicos
}

export interface JwtClaims {
  isAdmin?: boolean;
  admin?: boolean;
  is_admin?: boolean;
  role?: string;
  perfil?: string;
  permissao?: string;
  tipo?: string;
  tipoUsuario?: string;
  tipo_usuario?: string;
  papel?: string;
  grupo?: string;
  roles?: string[];
  permissoes?: string[];
  scopes?: string[];
  nivel?: number;
  nivelAcesso?: number;
  nivel_acesso?: number;
  accessLevel?: number;
  [key: string]: any;
}

// Helpers para conversão e validação
export const toStr = (v: any): string => (v == null ? '' : String(v)).toLowerCase();

export const truthy = (v: any): boolean =>
  v === true || v === 'true' || v === 1 || v === '1' || toStr(v) === 'sim';

export const adminishWord = (s: string): boolean => {
  const x = s.toLowerCase();
  return x === 'admin' || x === 'administrator' || x === 'administrador' || x === 'adm' ||
         x.includes('admin') || x.includes('adm') || x.includes('geren') ||
         x.includes('manager') || x.includes('super') || x.includes('root') || x.includes('owner');
};

export const hasAdminSignal = (obj: any, depth = 0): boolean => {
  if (!obj || depth > 3) return false;
  if (typeof obj === 'string') return adminishWord(obj);
  if (typeof obj === 'number') return obj >= 1; // níveis de acesso numéricos
  if (typeof obj === 'boolean') return obj === true;
  if (Array.isArray(obj)) return obj.some((v) => hasAdminSignal(v, depth + 1));
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const key = toStr(k);
      if (/(admin|adm|geren|manager|super|root|owner|acess|nivel|role|perfil|permiss|tipo|papel|grupo|cargo|func|cat)/.test(key)) {
        if (truthy(v) || adminishWord(toStr(v))) return true;
        if (hasAdminSignal(v, depth + 1)) return true;
      }
    }
  }
  return false;
};

// Função principal para validar se usuário é admin
export const isUserAdmin = (user: any): boolean => {
  if (!user || typeof user !== 'object') return false;

  // Verificações diretas
  if (truthy(user.isAdmin) || truthy(user.admin) || truthy(user.is_admin) ||
      truthy(user.isAdm) || truthy(user.adm) || truthy(user.superuser)) {
    return true;
  }

  // Verificação por sinais de admin no objeto
  if (hasAdminSignal(user)) return true;

  return false;
};

// Decodifica JWT e retorna as claims
export const decodeJwtClaims = (token?: string): JwtClaims | null => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.warn('Erro ao decodificar JWT:', error);
    return null;
  }
};

// Verifica se as claims do JWT indicam privilégios de admin
export const isClaimsAdmin = (claims: JwtClaims): boolean => {
  if (!claims || typeof claims !== 'object') return false;

  // Verificações diretas
  if (truthy(claims.isAdmin) || truthy(claims.admin) || truthy(claims.is_admin)) {
    return true;
  }

  // Verificação por role
  const role = toStr(claims.role || claims.perfil || claims.permissao ||
                    claims.tipo || claims.tipoUsuario || claims.tipo_usuario ||
                    claims.papel || claims.grupo);

  if (role === 'admin' || role === 'administrator' || role.includes('adm') ||
      role.includes('geren') || role.includes('super') || role.includes('root')) {
    return true;
  }

  // Verificação por arrays de roles/permissoes
  const arr = (claims.roles || claims.permissoes || claims.scopes || []) as any[];
  if (Array.isArray(arr) &&
      arr.some((r) => toStr(typeof r === 'string' ? r : (r?.name || r?.role)).includes('adm'))) {
    return true;
  }

  // Verificação por nível numérico
  const nivel = Number(claims.nivel || claims.nivelAcesso || claims.nivel_acesso || claims.accessLevel || 0);
  if (!Number.isNaN(nivel) && nivel >= 7) return true;

  return false;
};

// Função unificada para validar acesso de admin
export const validateAdminAccess = (user: any, token?: string): boolean => {
  // Primeiro verifica o usuário
  if (isUserAdmin(user)) return true;

  // Se não encontrou no usuário, verifica o token
  if (token) {
    const claims = decodeJwtClaims(token);
    if (claims && isClaimsAdmin(claims)) return true;
  }

  return false;
};

// Função para salvar dados do usuário autenticado
export const saveAuthData = (user: any, token?: string): void => {
  try {
    const userToStore = {
      ...user,
      isAdmin: validateAdminAccess(user, token)
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userToStore));
      if (token) {
        localStorage.setItem('token', token);
      }
    }
  } catch (error) {
    console.error('Erro ao salvar dados de autenticação:', error);
  }
};

// Função para limpar dados de autenticação
export const clearAuthData = (): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    }
  } catch (error) {
    console.error('Erro ao limpar dados de autenticação:', error);
  }
};

// Hook personalizado para gerenciar estado de autenticação
export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const checkAuth = React.useCallback(() => {
    try {
      if (typeof window === 'undefined') return;

      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        const isValid = validateAdminAccess(parsedUser, token || undefined);

        if (isValid) {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          // Dados inválidos, limpar
          clearAuthData();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = React.useCallback((userData: any, token?: string) => {
    saveAuthData(userData, token);
    checkAuth();
  }, [checkAuth]);

  const logout = React.useCallback(() => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  React.useEffect(() => {
    checkAuth();

    // Escutar mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token' || e.key === 'authToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuth
  };
};
