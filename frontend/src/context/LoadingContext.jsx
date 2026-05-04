import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState({
    show: false,
    message: 'Loading',
    theme: 'light',
  });

  const showLoading = useCallback((message = 'Loading', theme = 'light') => {
    setLoading({ show: true, message, theme });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export default LoadingContext;