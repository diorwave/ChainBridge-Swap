import type { 
  Balance, 
  Swap, 
  CreateSwapRequest,
  AtomicSwapOffer,
  CreateOfferRequest,
  AcceptOfferRequest
} from '../types/swap';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
const API_ROOT = API_BASE.replace(/\/api\/v1\/?$/, '');

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async requestAbsolute<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getRootInfo(): Promise<{ message: string; features: string[]; docs: string }> {
    return this.requestAbsolute<{ message: string; features: string[]; docs: string }>(`${API_ROOT}/`);
  }

  async getHealth(): Promise<{ status: string; version: string }> {
    return this.requestAbsolute<{ status: string; version: string }>(`${API_ROOT}/health`);
  }

  // Balance
  async getBalances(): Promise<Balance> {
    return this.request<Balance>('/balances');
  }

  // Legacy swaps
  async createSwap(data: CreateSwapRequest): Promise<Swap> {
    return this.request<Swap>('/swaps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSwap(swapId: string): Promise<Swap> {
    return this.request<Swap>(`/swaps/${swapId}`);
  }

  async listSwaps(): Promise<Swap[]> {
    return this.request<Swap[]>('/swaps');
  }

  async redeemSwap(swapId: string, secret: string): Promise<{ status: string; swap_id: string }> {
    return this.request<{ status: string; swap_id: string }>(`/swaps/${swapId}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ swap_id: swapId, secret }),
    });
  }

  async refundSwap(swapId: string): Promise<{ status: string; swap_id: string }> {
    return this.request<{ status: string; swap_id: string }>(`/swaps/${swapId}/refund`, {
      method: 'POST',
    });
  }

  // Atomic swaps
  async createOffer(data: CreateOfferRequest): Promise<AtomicSwapOffer> {
    return this.request<AtomicSwapOffer>('/atomic/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listOffers(status?: string): Promise<AtomicSwapOffer[]> {
    const url = status ? `/atomic/offers?status=${status}` : '/atomic/offers';
    return this.request<AtomicSwapOffer[]>(url);
  }

  async listOpenOffers(): Promise<AtomicSwapOffer[]> {
    return this.request<AtomicSwapOffer[]>('/atomic/offers/open');
  }

  async getOffer(swapId: string): Promise<AtomicSwapOffer> {
    return this.request<AtomicSwapOffer>(`/atomic/offers/${swapId}`);
  }

  async acceptOffer(swapId: string, data: AcceptOfferRequest): Promise<AtomicSwapOffer> {
    return this.request<AtomicSwapOffer>(`/atomic/offers/${swapId}/accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async lockInitiator(swapId: string): Promise<AtomicSwapOffer> {
    return this.request<AtomicSwapOffer>(`/atomic/offers/${swapId}/lock-initiator`, {
      method: 'POST',
    });
  }

  async lockAcceptor(swapId: string): Promise<AtomicSwapOffer> {
    return this.request<AtomicSwapOffer>(`/atomic/offers/${swapId}/lock-acceptor`, {
      method: 'POST',
    });
  }

  async claimInitiator(swapId: string): Promise<{ status: string; message: string; secret: string; swap_id: string }> {
    return this.request<{ status: string; message: string; secret: string; swap_id: string }>(`/atomic/offers/${swapId}/claim-initiator`, {
      method: 'POST',
    });
  }

  async claimAcceptor(swapId: string): Promise<{ status: string; message: string }> {
    return this.request(`/atomic/offers/${swapId}/claim-acceptor`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
