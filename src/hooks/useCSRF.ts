import { useState, useEffect, useCallback } from 'react';
import { CSRFClient } from '@/lib/csrf-client';

interface UseCSRFReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  secureFetch: (url: string, options?: RequestInit) => Promise<Response>;
  addTokenToFormData: (formData: FormData) => FormData;
  getTokenForInput: () => string | null;
}

export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await CSRFClient.refreshToken();
      const newToken = await CSRFClient.getToken();
      setToken(newToken);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh CSRF token';
      setError(errorMessage);
      console.error('CSRF token refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const secureFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      try {
        return await CSRFClient.secureFetch(url, options);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Secure fetch failed';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  const addTokenToFormData = useCallback(
    (formData: FormData): FormData => {
      if (token) {
        formData.append('csrf-token', token);
      } else {
        console.warn('CSRF token not available when adding to FormData');
      }
      return formData;
    },
    [token],
  );

  const getTokenForInput = useCallback((): string | null => {
    return token;
  }, [token]);

  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await CSRFClient.initialize();
        const currentToken = await CSRFClient.getToken();
        setToken(currentToken);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to initialize CSRF token';
        setError(errorMessage);
        console.error('CSRF initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCSRF();
  }, []);

  return {
    token,
    isLoading,
    error,
    refreshToken,
    secureFetch,
    addTokenToFormData,
    getTokenForInput,
  };
}
