// Legacy swap types
export interface Swap {
  swap_id: string;
  depix_amount: number;
  btc_amount: number;
  hashlock: string;
  timelock: number;
  status: 'pending' | 'locked' | 'completed' | 'failed' | 'refunded';
  depix_txid: string | null;
  btc_txid: string | null;
  created_at: number;
}

export interface Balance {
  depix_balance: number;
  btc_balance: number;
}

export interface CreateSwapRequest {
  depix_amount: number;
  btc_amount: number;
  depix_recipient: string;
  btc_recipient: string;
}

// New atomic swap types
export type SwapStatus = 
  | 'offered' 
  | 'accepted' 
  | 'initiator_locked' 
  | 'acceptor_locked' 
  | 'initiator_claimed' 
  | 'completed' 
  | 'refunded' 
  | 'cancelled';

export interface AtomicSwapOffer {
  swap_id: string;
  status: SwapStatus;
  initiator_asset: 'btc' | 'depix';
  initiator_amount: number;
  acceptor_asset: 'btc' | 'depix';
  acceptor_amount: number;
  initiator_address: string;
  acceptor_address: string | null;
  hashlock: string;
  initiator_timelock: number;
  acceptor_timelock: number;
  initiator_txid: string | null;
  acceptor_txid: string | null;
  created_at: number;
  accepted_at: number | null;
}

export interface CreateOfferRequest {
  initiator_asset: 'btc' | 'depix';
  initiator_amount: number;
  acceptor_asset: 'btc' | 'depix';
  acceptor_amount: number;
  initiator_address: string;
}

export interface AcceptOfferRequest {
  acceptor_address: string;
}
