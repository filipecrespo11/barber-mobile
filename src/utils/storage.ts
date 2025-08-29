import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

export const Storage = {
  // Token
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem('token', token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token');
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem('token');
  },

  // User
  async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem('user');
  },

  // Logout completo
  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['token', 'user']);
  },

  // Verificar se está logado
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    const user = await this.getUser();
    return !!(token && user);
  },

  // Verificar se é admin
  async isAdmin(): Promise<boolean> {
    const user = await this.getUser();
    return user?.isAdmin === true;
  },
};
