import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { apiRequest, API_CONFIG } from './services/api';
import { generateTimeSlots, formatPhone, isDateInPast, isTimeInPast } from './utils/formatters';
import type { AgendamentoData } from './types';

interface AgendamentoFormScreenProps {
  agendamento?: AgendamentoData | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function AgendamentoFormScreen({
  agendamento,
  onSave,
  onCancel,
}: AgendamentoFormScreenProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    servico: 'corte',
    data: '',
    horario: '09:00',
  });

  const isEditing = !!agendamento;
  const timeSlots = generateTimeSlots();

  // Buscar horários ocupados para a data selecionada
  const buscarHorariosOcupados = async (dataSelecionada: string) => {
    if (!dataSelecionada || dataSelecionada.length < 10) return;

    try {
      setLoadingHorarios(true);
      
      // Converter data para formato ISO
      const [day, month, year] = dataSelecionada.split('/');
      const dataISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      const response = await apiRequest(API_CONFIG.endpoints.agendamentos.listar);
      
      if (response.success && Array.isArray(response.data)) {
        // Filtrar agendamentos da data selecionada
        const agendamentosDaData = response.data.filter((ag: any) => {
          return ag.data === dataISO;
        });
        
        // Extrair apenas os horários ocupados
        const horarios = agendamentosDaData.map((ag: any) => ag.horario);
        
        // Se estiver editando, remover o horário atual dos ocupados
        if (isEditing && agendamento) {
          const horarioAtual = agendamento.horario || agendamento.hora;
          const horariosFiltered = horarios.filter((h: string) => h !== horarioAtual);
          setHorariosOcupados(horariosFiltered);
        } else {
          setHorariosOcupados(horarios);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar horários ocupados:', error);
      setHorariosOcupados([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  // Filtrar horários disponíveis
  const horariosDisponiveis = timeSlots.filter(horario => !horariosOcupados.includes(horario));

  // Inicializar form
  useEffect(() => {
    if (agendamento) {
      const dataFormatted = agendamento.data || '';
      setFormData({
        nome: agendamento.nome || '',
        telefone: agendamento.telefone || '',
        servico: agendamento.servico || 'corte',
        data: dataFormatted,
        horario: agendamento.horario || agendamento.hora || '09:00',
      });
      
      // Se há data, converter para o seletor
      if (dataFormatted) {
        // Se a data vem no formato ISO (YYYY-MM-DD), converter para DD/MM/YYYY
        let displayDate = dataFormatted;
        if (dataFormatted.includes('-') && dataFormatted.length === 10) {
          const [year, month, day] = dataFormatted.split('-');
          displayDate = `${day}/${month}/${year}`;
        }
        setFormData(prev => ({ ...prev, data: displayDate }));
        setSelectedDate(parseDisplayDate(displayDate));
      }
    }
  }, [agendamento]);

  // Buscar horários ocupados quando a data mudar
  useEffect(() => {
    if (formData.data && formData.data.length === 10) {
      buscarHorariosOcupados(formData.data);
    } else {
      setHorariosOcupados([]);
    }
  }, [formData.data, isEditing]);

  // Ajustar horário selecionado se não estiver disponível
  useEffect(() => {
    if (horariosDisponiveis.length > 0 && !horariosDisponiveis.includes(formData.horario)) {
      // Se o horário atual não está disponível, selecionar o primeiro disponível
      setFormData(prev => ({ ...prev, horario: horariosDisponiveis[0] }));
    }
  }, [horariosDisponiveis, formData.horario]);

  // Função para formatar data para DD/MM/YYYY
  const formatDateToDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Função para converter DD/MM/YYYY para Date
  const parseDisplayDate = (dateStr: string): Date => {
    if (!dateStr || dateStr.length !== 10) return new Date();
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Inicializar data selecionada quando há agendamento ou mudança na data do form
  useEffect(() => {
    if (formData.data) {
      setSelectedDate(parseDisplayDate(formData.data));
    }
  }, []);

  // Lidar com mudança no seletor de data
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false); // No Android, fecha após seleção
    }
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDateToDisplay(date);
      setFormData(prev => ({ ...prev, data: formattedDate }));
    }
  };

  // Abrir seletor de data
  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(!showDatePicker); // No iOS, toggle
    } else {
      setShowDatePicker(true); // No Android, sempre abre
    }
  };

  // Formatar telefone automaticamente
  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setFormData(prev => ({ ...prev, telefone: formatted }));
  };

  // Validar formulário
  const validateForm = (): boolean => {
    if (!formData.nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }

    if (!formData.telefone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return false;
    }

    if (!formData.data.trim()) {
      Alert.alert('Erro', 'Data é obrigatória');
      return false;
    }

    // Validar formato da data (dd/mm/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.data)) {
      Alert.alert('Erro', 'Data deve estar no formato DD/MM/AAAA');
      return false;
    }

    // Verificar se data não está no passado
    if (isDateInPast(formData.data)) {
      Alert.alert('Erro', 'Não é possível agendar para datas passadas');
      return false;
    }

    // Verificar se horário não está no passado (se for hoje)
    if (isTimeInPast(formData.data, formData.horario)) {
      Alert.alert('Erro', 'Não é possível agendar para horários passados');
      return false;
    }

    // Verificar se horário não está ocupado (apenas para novos agendamentos)
    if (!isEditing && horariosOcupados.includes(formData.horario)) {
      Alert.alert('Erro', 'Este horário já está ocupado. Escolha outro horário.');
      return false;
    }

    return true;
  };

  // Salvar agendamento
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
      const convertDateFormat = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''), // Apenas números
        servico: formData.servico,
        data: convertDateFormat(formData.data), // Converter formato da data
        horario: formData.horario,
      };

      if (isEditing) {
        // Atualizar
        const id = agendamento!.id || agendamento!._id;
        if (!id) {
          throw new Error('ID do agendamento não encontrado');
        }
        
        await apiRequest(API_CONFIG.endpoints.agendamentos.atualizar(id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        Alert.alert('Sucesso', 'Agendamento atualizado com sucesso');
      } else {
        // Criar novo
        const result = await apiRequest(API_CONFIG.endpoints.agendamentos.criar, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        
        Alert.alert('Sucesso', 'Agendamento criado com sucesso');
      }

      onSave();

    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Erro ao salvar agendamento';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Text>
        
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[styles.headerButton, loading && styles.headerButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={styles.content} contentContainerStyle={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do cliente"
            value={formData.nome}
            onChangeText={(text) => setFormData(prev => ({ ...prev, nome: text }))}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefone *</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            value={formData.telefone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Serviço *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.servico}
              onValueChange={(value) => setFormData(prev => ({ ...prev, servico: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Corte" value="corte" />
              <Picker.Item label="Barba" value="barba" />
            </Picker>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Data *</Text>
          <TouchableOpacity 
            style={[styles.input, styles.dateButton]}
            onPress={openDatePicker}
          >
            <Text style={[styles.dateText, !formData.data && styles.placeholderText]}>
              {formData.data || 'Selecione uma data'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()} // Não permitir datas passadas
                maximumDate={new Date(2030, 11, 31)} // Limite máximo razoável
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Concluído</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Horário * 
            {loadingHorarios && <Text style={styles.loadingText}> (carregando...)</Text>}
            {!loadingHorarios && formData.data && horariosOcupados.length > 0 && (
              <Text style={styles.loadingText}>
                {` (${horariosOcupados.length} horário${horariosOcupados.length > 1 ? 's' : ''} ocupado${horariosOcupados.length > 1 ? 's' : ''})`}
              </Text>
            )}
          </Text>
          <View style={styles.pickerContainer}>
            {loadingHorarios ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Verificando horários disponíveis...</Text>
              </View>
            ) : horariosDisponiveis.length === 0 && formData.data ? (
              <View style={styles.noHorariosContainer}>
                <Text style={styles.noHorariosText}>
                  Nenhum horário disponível para esta data
                </Text>
              </View>
            ) : (
              <Picker
                selectedValue={formData.horario}
                onValueChange={(value) => setFormData(prev => ({ ...prev, horario: value }))}
                style={styles.picker}
                enabled={!loadingHorarios && horariosDisponiveis.length > 0}
              >
                {horariosDisponiveis.map((time: string) => (
                  <Picker.Item key={time} label={time} value={time} />
                ))}
              </Picker>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons 
                name={isEditing ? "save" : "add"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Salvar Alterações' : 'Criar Agendamento'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 8,
  },
  noHorariosContainer: {
    padding: 15,
    alignItems: 'center',
  },
  noHorariosText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
