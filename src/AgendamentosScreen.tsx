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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, API_CONFIG } from './services/api';
import { Storage } from './utils/storage';
import { normalizeStr, parseDate, formatDate, formatPhone } from './utils/formatters';
import type { AgendamentoData, User } from './types';

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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());

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

  // Funções para formatar data
  const formatDateToDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Funções para lidar com seleção de data de início
  const handleStartDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (date) {
      setSelectedStartDate(date);
      setDateStart(formatDateToDisplay(date));
    }
  };

  const openStartDatePicker = () => {
    setShowStartDatePicker(!showStartDatePicker);
  };

  // Funções para lidar com seleção de data de fim
  const handleEndDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (date) {
      setSelectedEndDate(date);
      setDateEnd(formatDateToDisplay(date));
    }
  };

  const openEndDatePicker = () => {
    setShowEndDatePicker(!showEndDatePicker);
  };

  // Limpar filtros de data
  const clearDateFilters = () => {
    setDateStart('');
    setDateEnd('');
    setSelectedStartDate(new Date());
    setSelectedEndDate(new Date());
  };

  // Filtros rápidos
  const setTodayFilter = () => {
    const today = new Date();
    setSelectedStartDate(today);
    setSelectedEndDate(today);
    setDateStart(formatDateToDisplay(today));
    setDateEnd(formatDateToDisplay(today));
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - dayOfWeek + 6);
    
    setSelectedStartDate(startOfWeek);
    setSelectedEndDate(endOfWeek);
    setDateStart(formatDateToDisplay(startOfWeek));
    setDateEnd(formatDateToDisplay(endOfWeek));
  };

  const setThisMonthFilter = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setSelectedStartDate(startOfMonth);
    setSelectedEndDate(endOfMonth);
    setDateStart(formatDateToDisplay(startOfMonth));
    setDateEnd(formatDateToDisplay(endOfMonth));
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
              if (!id) {
                Alert.alert('Erro', 'ID do agendamento não encontrado');
                return;
              }
              
              await apiRequest(API_CONFIG.endpoints.agendamentos.remover(id), {
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
        
        {/* Filtros de Data */}
        <View style={styles.dateFilters}>
          <Text style={styles.dateFilterLabel}>Filtrar por período:</Text>
          
          <View style={styles.dateFilterRow}>
            {/* Data Início */}
            <View style={styles.dateFilterItem}>
              <Text style={styles.dateLabel}>De:</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={openStartDatePicker}
              >
                <Text style={[styles.dateText, !dateStart && styles.placeholderText]}>
                  {dateStart || 'Início'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Data Fim */}
            <View style={styles.dateFilterItem}>
              <Text style={styles.dateLabel}>Até:</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={openEndDatePicker}
              >
                <Text style={[styles.dateText, !dateEnd && styles.placeholderText]}>
                  {dateEnd || 'Fim'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Botão Limpar */}
            {(dateStart || dateEnd) && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearDateFilters}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros Rápidos */}
          <View style={styles.quickFilters}>
            <TouchableOpacity style={styles.quickFilterButton} onPress={setTodayFilter}>
              <Text style={styles.quickFilterText}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterButton} onPress={setThisWeekFilter}>
              <Text style={styles.quickFilterText}>Esta Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterButton} onPress={setThisMonthFilter}>
              <Text style={styles.quickFilterText}>Este Mês</Text>
            </TouchableOpacity>
          </View>

          {/* Seletores de Data */}
          {showStartDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date(2030, 11, 31)}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.datePickerDone}
                  onPress={() => setShowStartDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showEndDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={handleEndDateChange}
                maximumDate={new Date(2030, 11, 31)}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.datePickerDone}
                  onPress={() => setShowEndDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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
    backgroundColor: '#071625ff',
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
    backgroundColor: '#fcd600ff',
  },
  deleteButton: {
    backgroundColor: '#f31307ff',
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
  // Estilos para filtros de data
  dateFilters: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dateFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  dateFilterItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  clearButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerDone: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Filtros rápidos
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickFilterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
  },
  quickFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
