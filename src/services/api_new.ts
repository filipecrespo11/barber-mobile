import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResponse } from '../types';

// Definir __DEV__ para compatibilidade
const __DEV__ = process.env.NODE_ENV === 'development';

// Configuração da API
export const API_CONFIG = {
  // TROCAR PARA SEU IP LOCAL ou URL de produção
  baseURL: 'https://backbarbearialopez.onrender.com',
  endpoints: {
    auth: {
      login: '/auterota/login',
    },
    agendamentos: {
      listar: '/auterota/agendamentos',
      criar: '/auterota/agendamentos',
      atualizar: '/auterota/agendamentos',
      deletar: '/auterota/agendamentos',
    },
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string;
  skipAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, skipAuth = false } = options;

  const url = `${API_CONFIG.baseURL}${endpoint}`;

  const defaultOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Adicionar autenticação se necessário
  if (!skipAuth) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        defaultOptions.headers = {
          ...defaultOptions.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch (error) {
      console.log('Erro ao buscar token:', error);
    }
  }

  if (body) {
    defaultOptions.body = body;
  }

  try {
    if (__DEV__) {
      console.log('🚀 Fazendo requisição para:', url);
      console.log('📝 Método:', method);
    }

    const response = await fetch(url, defaultOptions);

    if (__DEV__) {
      console.log('📥 Status da resposta:', response.status);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Erro de conexão' };
      }

      if (__DEV__) {
        console.log('❌ Erro do servidor - Status:', response.status);
        console.log('❌ Dados do erro:', errorData);
        console.log('❌ URL:', url);
      }

      // Tratamento específico para diferentes tipos de erro
      let errorMessage = errorData?.message || `Erro HTTP ${response.status}`;

      if (response.status === 404) {
        errorMessage = 'Servidor não encontrado. Verifique se o backend está rodando.';
      } else if (response.status === 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
      } else if (response.status >= 400 && response.status < 500) {
        errorMessage = errorData?.message || 'Dados inválidos enviados.';
      }

      throw {
        status: response.status,
        data: errorData,
        message: errorMessage,
      };
    }

    const data = await response.json();

    if (__DEV__) {
      console.log('✅ Request concluído com sucesso');
    }

    return data as ApiResponse<T>;

  } catch (error: any) {
    if (__DEV__) {
      console.log('❌ Erro na requisição:', error.message);
    }

    if (error.status) {
      throw error;
    }

    throw {
      status: 0,
      message: 'Erro de conexão. Verifique sua internet.',
      data: null,
    };
  }
}
