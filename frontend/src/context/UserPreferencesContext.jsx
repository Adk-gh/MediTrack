// C:\Users\HP\MediTrack\frontend\src\contexts\UserPreferencesContext.jsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

const DEFAULT_PREFERENCES = {
  language: 'English',
  dateFormat: 'MM/DD/YYYY',
};

const UserPreferencesContext = createContext(null);

export const UserPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setPreferences(DEFAULT_PREFERENCES);
        return;
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || 'Failed to load user preferences.'
        );
      }

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(result?.data?.preferences || {}),
      });
    } catch (error) {
      console.error('[UserPreferences] Failed to fetch preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates) => {
    const previousPreferences = { ...preferences };

    const nextPreferences = {
      ...preferences,
      ...updates,
    };

    setPreferences(nextPreferences);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: updates,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || 'Failed to save user preferences.'
        );
      }

      const savedPreferences = result?.data?.preferences || nextPreferences;

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...savedPreferences,
      });

      return {
        success: true,
        preferences: savedPreferences,
      };
    } catch (error) {
      console.error('[UserPreferences] Failed to save preferences:', error);
      setPreferences(previousPreferences);
      throw error;
    }
  }, [preferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const value = {
    preferences,
    loading,
    updatePreferences,
    refreshPreferences: fetchPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);

  if (!context) {
    throw new Error(
      'useUserPreferences must be used inside UserPreferencesProvider'
    );
  }

  return context;
};

export default UserPreferencesContext;