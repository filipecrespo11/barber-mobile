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
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    servico: 'Corte Masculino',
    data: '',
    horario: '09:00',
  });

  const isEditing = !!agendamento;
  const timeSlots = generateTimeSlots();

  // Inicializar form
  useEffect(() => {
    if (agendamento) {
      setFormData({
        nome: agendamento.nome || '',
        telefone: agendamento.telefone || '',
        servico: agendamento.servico || 'Corte Masculino',
        data: agendamento.data || '',
        horario: agendamento.horario || agendamento.hora || '09:00',
      });
    }
  }, [agendamento]);

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

    return true;
  };

  // Salvar agendamento
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''), // Apenas números
        servico: formData.servico,
        data: formData.data,
        horario: formData.horario,
      };

      if (isEditing) {
        // Atualizar
        const id = agendamento!.id || agendamento!._id;
        await apiRequest(`${API_CONFIG.endpoints.agendamentos.atualizar}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        Alert.alert('Sucesso', 'Agendamento atualizado com sucesso');
      } else {
        // Criar novo
        await apiRequest(API_CONFIG.endpoints.agendamentos.criar, {
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
              <Picker.Item label="Corte Masculino" value="Corte Masculino" />
              <Picker.Item label="Barba & Bigode" value="Barba & Bigode" />
              <Picker.Item label="Combo Completo" value="Combo Completo" />
              <Picker.Item label="Corte Infantil" value="Corte Infantil" />
            </Picker>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Data *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={formData.data}
            onChangeText={(text) => {
              // Auto-formatar data
              let formatted = text.replace(/\D/g, '');
              if (formatted.length >= 3 && formatted.length <= 4) {
                formatted = formatted.replace(/(\d{2})(\d{1,2})/, '$1/$2');
              } else if (formatted.length >= 5) {
                formatted = formatted.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
              }
              setFormData(prev => ({ ...prev, data: formatted }));
            }}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Horário *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.horario}
              onValueChange={(value) => setFormData(prev => ({ ...prev, horario: value }))}
              style={styles.picker}
            >
              {timeSlots.map((time: string) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
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
});
