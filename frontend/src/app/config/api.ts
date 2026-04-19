/**
 * API Client - Centralized HTTP client for backend communication
 *
 * Features:
 * - Base URL configuration
 * - JWT token injection via interceptor pattern
 * - Typed response helpers
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get stored auth token
function getToken(): string | null {
  return localStorage.getItem('aura_token');
}

// Set auth token
export function setToken(token: string): void {
  localStorage.setItem('aura_token', token);
}

// Remove auth token
export function removeToken(): void {
  localStorage.removeItem('aura_token');
}

// Build headers with auth
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Generic API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// API methods
export const api = {
  // Auth
  auth: {
    register: (data: { name: string; email: string; password: string; role: string }) =>
      apiRequest<{ success: boolean; token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      apiRequest<{ success: boolean; token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMe: () =>
      apiRequest<{ user: any }>('/auth/me'),

    updateMe: (updates: Record<string, any>) =>
      apiRequest<{ user: any }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
  },

  // Auctions
  auctions: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiRequest<{ auctions: any[]; total: number; page: number; totalPages: number }>(
        `/auctions${query}`
      );
    },

    get: (id: string) =>
      apiRequest<{ auction: any }>(`/auctions/${id}`),

    create: (data: Record<string, any>) =>
      apiRequest<{ auction: any }>('/auctions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, updates: Record<string, any>) =>
      apiRequest<{ auction: any }>(`/auctions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),

    toggleWatch: (id: string) =>
      apiRequest<{ watching: boolean; watcherCount: number }>(`/auctions/${id}/watch`, {
        method: 'POST',
      }),
  },

  // Bids
  bids: {
    place: (auctionId: string, amount: number) =>
      apiRequest<{ success: boolean; bid: any }>(`/bids/${auctionId}`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),

    getForAuction: (auctionId: string) =>
      apiRequest<{ bids: any[] }>(`/bids/${auctionId}`),

    getMyBids: () =>
      apiRequest<{ bids: any[] }>('/bids/user/me'),
  },

  // Health
  health: () => apiRequest<{ status: string; timestamp: string }>('/health'),
};

export default api;
