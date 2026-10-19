import React, { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async (apiUrl) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        throw new Error('Unauthorized');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setUserProfile(result.data);
      }
    } catch (err) {
      console.error('UserContext: Error fetching profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    setUserProfile(null);
    setError(null);
  }, []);

  return (
    <UserContext.Provider value={{ userProfile, setUserProfile, isLoading, error, fetchProfile, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
