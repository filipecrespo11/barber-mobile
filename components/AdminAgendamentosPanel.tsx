// components/AdminAgendamentosPanel.tsx
"use client";
import React, { useState, useEffect } from "react";
import { apiRequest, API_CONFIG } from "../src/services/api";
import { useAuthState } from "../utils/adminHelpers";

interface Agendamento {
  id: string | number;
  nome: string;
  telefone: string;
  servico: string;
  data: string;
  horario: string;
  _id?: string;
}

export default function AdminAgendamentosPanel() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuthState();

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  const carregarAgendamentos = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_CONFIG.endpoints.agendamentos.listar);
      setAgendamentos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError("Erro ao carregar agendamentos");
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAgendamento = () => {
    // Lógica para abrir modal de novo agendamento
    console.log("Abrir novo agendamento");
  };

  useEffect(() => {
    const handleOpenNew = () => handleNewAgendamento();
    window.addEventListener('openNewAgendamento', handleOpenNew);
    return () => window.removeEventListener('openNewAgendamento', handleOpenNew);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2">Carregando agendamentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
        <button
          onClick={carregarAgendamentos}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Painel de Agendamentos</h1>
        <div className="text-sm text-gray-600">
          Bem-vindo, {user?.nome || user?.email}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Agendamentos</h2>
        </div>

        <div className="p-6">
          {agendamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhum agendamento encontrado</p>
              <button
                onClick={handleNewAgendamento}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Criar primeiro agendamento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agendamentos.map((agendamento) => (
                    <tr key={agendamento.id || agendamento._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{agendamento.nome}</div>
                        <div className="text-sm text-gray-500">{agendamento.telefone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agendamento.servico}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(agendamento.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agendamento.horario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Editar
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
