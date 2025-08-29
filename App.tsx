import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Storage } from './src/utils/storage';
import LoginScreen from './src/LoginScreen';
import AgendamentosScreen from './src/AgendamentosScreen';
import AgendamentoFormScreen from './src/AgendamentoFormScreen';
import type { User, AgendamentoData } from './src/types';

type Screen = 'login' | 'agendamentos' | 'form';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingAgendamento, setEditingAgendamento] = useState<AgendamentoData | null>(null);

  // Verificar se já está logado
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const isLoggedIn = await Storage.isLoggedIn();
      const isAdmin = await Storage.isAdmin();
      
      if (isLoggedIn && isAdmin) {
        const userData = await Storage.getUser();
        if (userData) {
          setUser(userData);
          setCurrentScreen('agendamentos');
        }
      }
    } catch (error) {
      console.log('Erro ao verificar login:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setCurrentScreen('agendamentos');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('login');
  };

  const handleNewAgendamento = () => {
    setEditingAgendamento(null);
    setCurrentScreen('form');
  };

  const handleEditAgendamento = (agendamento: AgendamentoData) => {
    setEditingAgendamento(agendamento);
    setCurrentScreen('form');
  };

  const handleFormSave = () => {
    setEditingAgendamento(null);
    setCurrentScreen('agendamentos');
  };

  const handleFormCancel = () => {
    setEditingAgendamento(null);
    setCurrentScreen('agendamentos');
  };

  // Loading inicial
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Renderizar tela baseada no estado
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      
      case 'agendamentos':
        return (
          <AgendamentosScreen
            user={user!}
            onLogout={handleLogout}
            onEditAgendamento={handleEditAgendamento}
            onNewAgendamento={handleNewAgendamento}
          />
        );
      
      case 'form':
        return (
          <AgendamentoFormScreen
            agendamento={editingAgendamento}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        );
      
      default:
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      {renderScreen()}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
