import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checks for active session via cookies
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      if (response.data && response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request error:', error.message);
    } finally {
      setUser(null);
    }
  };

  const requestOtp = async (phoneNumber, countryCode) => {
    try {
      const response = await apiClient.post('/auth/phone/request-otp', { phoneNumber, countryCode });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to request OTP. Please try again.';
      return { success: false, message };
    }
  };

  const verifyOtp = async (phoneNumberNormalized, otp, name, countryCode) => {
    try {
      const response = await apiClient.post('/auth/phone/verify-otp', { phoneNumberNormalized, otp, name, countryCode });
      if (response.data && response.data.success && !response.data.isNewUser) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    requestOtp,
    verifyOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
