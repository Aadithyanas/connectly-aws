const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://craft-accordingly-ave-details.trycloudflare.com/api';

export const api = {
  get: async (endpoint: string) => {
    return makeRequest(endpoint, { method: 'GET' });
  },
  post: async (endpoint: string, body: any) => {
    return makeRequest(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put: async (endpoint: string, body: any) => {
    return makeRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch: async (endpoint: string, body: any) => {
    return makeRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete: async (endpoint: string) => {
    return makeRequest(endpoint, { method: 'DELETE' });
  }
};

async function makeRequest(endpoint: string, options: RequestInit) {
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    // 304 Not Modified and 204 No Content have empty bodies — avoid JSON parse error
    if (response.status === 304 || response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
    } catch (error) {
      console.error('API Request failed:', error);
      // Log more details about the error if possible
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
}
