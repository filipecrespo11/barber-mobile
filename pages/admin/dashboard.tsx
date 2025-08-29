// pages/admin/dashboard.tsx
// Exemplo de como usar as melhorias implementadas
"use client";
import React from "react";
import { useAuthState } from "../../utils/adminHelpers";
import AuthGuard from "../../components/AuthGuard";

function AdminDashboardContent() {
  const { user, logout } = useAuthState();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard Admin</h1>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Informações do Usuário</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Nome:</strong> {user?.nome || 'N/A'}</p>
        <p><strong>Admin:</strong> {user?.isAdmin ? 'Sim' : 'Não'}</p>

        <button
          onClick={() => {
            if (confirm('Deseja sair?')) {
              logout();
            }
          }}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard>
      <AdminDashboardContent />
    </AuthGuard>
  );
}
