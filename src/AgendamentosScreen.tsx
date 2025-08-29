import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, API_CONFIG } from '../services/api';
import { Storage } from '../utils/storage';
import { normalizeStr, parseDate, formatDate, formatPhone } from '../utils/formatters';
import type { AgendamentoData, User } from '../types';

interface AgendamentosScreenProps {
  user: User;
  onLogout: () => void;
  onEditAgendamento: (agendamento: AgendamentoData) => void;
  onNewAgendamento: () => void;
}

export default function AgendamentosScreen({
  user,
  onLogout,
  onEditAgendamento,
  onNewAgendamento,
}: AgendamentosScreenProps) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Carregar agendamentos
  const loadAgendamentos = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await apiRequest(API_CONFIG.endpoints.agendamentos.listar, {
        method: 'GET',
      });

      if (response.success && response.data) {
        const list = (response.data as any[]).map((a: any) => ({
          ...a,
          id: a?.id ?? a?._id ?? a?.agendamento_id ?? a?.id_agendamento ?? a?.codigo,
          horario: a?.horario ?? a?.hora,
        })) as AgendamentoData[];
        
        setAgendamentos(list);
      } else {
        Alert.alert('Erro', response.message || 'Erro ao buscar agendamentos');
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtrar agendamentos
  const filteredAgendamentos = useMemo(() => {
    let filtered = agendamentos;

    // Filtro por texto
    if (searchTerm.trim()) {
      const term = normalizeStr(searchTerm);
      filtered = filtered.filter((ag) => {
        const nome = normalizeStr(ag.nome || '');
        const telefone = normalizeStr(ag.telefone || '');
        return nome.includes(term) || telefone.includes(term);
      });
    }

    // Filtro por data
    if (dateStart) {
      const startDate = parseDate(dateStart);
      if (startDate) {
        filtered = filtered.filter((ag) => {
          const agDate = parseDate(ag.data);
          return agDate && agDate >= startDate;
        });
      }
    }

    if (dateEnd) {
      const endDate = parseDate(dateEnd);
      if (endDate) {
        filtered = filtered.filter((ag) => {
          const agDate = parseDate(ag.data);
          return agDate && agDate <= endDate;
        });
      }
    }

    // Ordenar por data/hora
    return filtered.sort((a, b) => {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      if (!dateA || !dateB) return 0;
      
      const diff = dateA.getTime() - dateB.getTime();
      if (diff !== 0) return diff;
      
      return (a.horario || '').localeCompare(b.horario || '');
    });
  }, [agendamentos, searchTerm, dateStart, dateEnd]);

  // Paginação
  const pagedAgendamentos = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredAgendamentos.slice(0, startIndex + pageSize);
  }, [filteredAgendamentos, page, pageSize]);

  // Deletar agendamento
  const handleDelete = async (agendamento: AgendamentoData) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o agendamento de ${agendamento.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = agendamento.id || agendamento._id;
              await apiRequest(`${API_CONFIG.endpoints.agendamentos.deletar}/${id}`, {
                method: 'DELETE',
              });

              Alert.alert('Sucesso', 'Agendamento excluído com sucesso');
              loadAgendamentos(false);
            } catch (error: any) {
              Alert.alert('Erro', error?.message || 'Erro ao excluir agendamento');
            }
          },
        },
      ]
    );
  };

  // Logout
  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair do app?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        onPress: async () => {
          await Storage.logout();
          onLogout();
        },
      },
    ]);
  };

  // Carregar mais items
  const loadMore = () => {
    if (pagedAgendamentos.length < filteredAgendamentos.length) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    loadAgendamentos();
  }, []);

  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadAgendamentos(false);
  };

  // Render item da lista
  const renderAgendamento = ({ item }: { item: AgendamentoData }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.nome}</Text>
        <Text style={styles.cardDate}>{formatDate(item.data)}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.cardInfo}>📞 {formatPhone(item.telefone)}</Text>
        <Text style={styles.cardInfo}>✂️ {item.servico}</Text>
        <Text style={styles.cardInfo}>🕐 {item.horario}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEditAgendamento(item)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Agendamentos</Text>
          <Text style={styles.headerSubtitle}>Olá, {user.nome}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Lista */}
      <FlatList
        data={pagedAgendamentos}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderAgendamento}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum agendamento encontrado</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onNewAgendamento}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  logoutButton: {
    padding: 8,
  },
  filters: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
