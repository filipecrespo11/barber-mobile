// components/AuthGuard.tsx
// Componente para proteger rotas que requerem autenticação de admin
"use client";
import React from "react";
import { useAuthState } from "../utils/adminHelpers";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthState();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você precisa estar logado como administrador para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Exemplo de uso:
// <AuthGuard>
//   <AdminDashboard />
// </AuthGuard>
