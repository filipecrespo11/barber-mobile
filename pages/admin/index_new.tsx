"use client";
import React, { useState } from "react";
import { apiRequest, API_CONFIG } from "../../src/services/api";
import {
  validateAdminAccess,
  saveAuthData,
  useAuthState,
  type User
} from "../../utils/adminHelpers";

// Tipos para a API
interface LoginResponse {
  usuario?: User;
  user?: User;
  data?: {
    usuario?: User;
    user?: User;
    token?: string;
  };
  token?: string;
  message?: string;
}

// Componente de Login Admin melhorado
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res: LoginResponse = await apiRequest(API_CONFIG.endpoints.auth.login, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const usuario = res.usuario || res.user || res.data?.usuario || res.data?.user;
      const token = res.token || res.data?.token;

      if (!usuario) {
        setError("Resposta inválida do servidor");
        return;
      }

      // Validar se o usuário tem permissões de admin
      const adminOk = validateAdminAccess(usuario, token);

      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Validação de admin concluída');
        console.log('🔐 Permissões verificadas');
        console.log('🔐 Status admin:', adminOk ? 'Autorizado' : 'Negado');
      }

      if (adminOk) {
        // Salvar dados usando o utilitário
        saveAuthData(usuario, token);

        // Recarregar a página para atualizar o estado global
        window.location.reload();
      } else {
        setError("Acesso negado. Apenas administradores podem entrar.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Erro ao autenticar.");
      } else {
        setError("Erro ao autenticar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow max-w-md w-full"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login Admin</h2>

        {error && (
          <div className="mb-4 text-red-600 text-center bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-2 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@exemplo.com"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua senha"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// Componente principal da página Admin melhorado
export default function AdminPage() {
  const { isAuthenticated, isLoading, logout } = useAuthState();

  // Função para abrir novo agendamento
  const handleNewAgendamento = () => {
    const event = new CustomEvent('openNewAgendamento');
    window.dispatchEvent(event);
  };

  // Função para logout
  const handleLogout = () => {
    if (confirm('Deseja sair da conta de administrador?')) {
      logout();
      window.location.reload();
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar login
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Se estiver autenticado, mostrar painel admin
  return (
    <>
      {/* Header com controles */}
      <div className="fixed top-4 right-4 z-[9999]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50 transition"
            title="Sair"
          >
            Sair
          </button>

          <button
            onClick={handleNewAgendamento}
            className="bg-blue-600 text-white px-3 py-2 text-sm rounded shadow hover:bg-blue-700 transition font-bold"
          >
            Novo Agendamento
          </button>

          <button
            onClick={() => {
              // TODO: Implementar navegação para criar admin
              alert('Funcionalidade em desenvolvimento');
            }}
            className="bg-yellow-500 text-black px-3 py-2 text-sm rounded shadow hover:bg-yellow-600 transition font-bold"
          >
            Criar Novo Admin
          </button>
        </div>
      </div>

      {/* Painel principal */}
      <div className="pt-20">
        <AdminAgendamentosPanel />
      </div>
    </>
  );
}

// Import do componente do painel
import AdminAgendamentosPanel from "../../components/AdminAgendamentosPanel";
