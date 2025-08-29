import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { apiRequest, API_CONFIG } from './services/api';
import { Storage } from './utils/storage';
import type { User, LoginResponse } from './types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha email e senha');
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<LoginResponse>(API_CONFIG.endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Acessar resposta como any para permitir propriedades dinâmicas
      const responseAny = response as any;

      // Tentar múltiplas formas de extrair usuário e token
      const usuario = responseAny.usuario || responseAny.user || 
                     response.data?.usuario || response.data?.user || 
                     (response.data as any);
      const token = responseAny.token || response.data?.token || 
                   responseAny.accessToken || responseAny.access_token;

      if (!usuario) {
        Alert.alert('Erro', 'Usuário não encontrado na resposta do servidor');
        return;
      }

      if (!token) {
        Alert.alert('Erro', 'Token não encontrado na resposta do servidor');
        return;
      }

      // Verificar se é admin
      if (!usuario.isAdmin) {
        Alert.alert('Acesso Negado', 'Apenas administradores podem acessar este app');
        return;
      }

      // Salvar dados
      await Storage.setToken(token);
      await Storage.setUser(usuario);

      // Callback de sucesso
      onLoginSuccess(usuario);

    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Erro ao fazer login';
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
      <View style={styles.content}>
        <Image
          source={require('../assets/lopesclubicon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Login </Text>
        <Text style={styles.subtitle}>Gerenciamento de Agenda</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 190,
    height: 190,
    alignSelf: 'center',
    marginBottom: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 48,
  },
  form: {
    gap: 16,
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
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
