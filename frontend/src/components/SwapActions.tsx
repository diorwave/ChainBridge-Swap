import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Handshake,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { AtomicSwapOffer, AcceptOfferRequest } from '../types/swap';

interface SwapActionsProps {
  offer: AtomicSwapOffer | null;
  onClose: () => void;
  onAction: () => void;
  onError: (message: string) => void;
}

export function SwapActions({ offer, onClose, onAction, onError }: SwapActionsProps) {
  const [acceptorAddress, setAcceptorAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!offer) return null;

  const handleAccept = async () => {
    if (!acceptorAddress) {
      setError('Please enter your receiving address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data: AcceptOfferRequest = { acceptor_address: acceptorAddress };
      await apiClient.acceptOffer(offer.swap_id, data);
      setSuccess('Offer accepted! Wait for initiator to lock funds.');
      setTimeout(() => {
        onAction();
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept offer';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockInitiator = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.lockInitiator(offer.swap_id);
      setSuccess('Funds locked! Wait for acceptor to lock their funds.');
      setTimeout(() => {
        onAction();
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to lock funds';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockAcceptor = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.lockAcceptor(offer.swap_id);
      setSuccess('Funds locked! Wait for initiator to claim.');
      setTimeout(() => {
        onAction();
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to lock funds';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimInitiator = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.claimInitiator(offer.swap_id);
      setSuccess(`Claimed! Secret revealed: ${result.secret.substring(0, 16)}...`);
      setTimeout(() => {
        onAction();
        onClose();
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim funds';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAcceptor = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.claimAcceptor(offer.swap_id);
      setSuccess('Swap completed! You received your funds.');
      setTimeout(() => {
        onAction();
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim funds';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#343a55] bg-[#0f1320] shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-violet-100">Swap Actions</h3>
            <button
              onClick={onClose}
              className="text-[#9aa3c7] hover:text-violet-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="rounded-lg border border-[#343a55] bg-[#141a2a] p-4">
              <div className="text-sm text-[#9aa3c7]">Swap ID</div>
              <div className="font-mono text-xs text-[#d8def7]">{offer.swap_id}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="text-sm text-blue-200/80">Offering</div>
                <div className="text-xl font-bold text-blue-100">
                  {offer.initiator_amount} {offer.initiator_asset.toUpperCase()}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-sm text-emerald-200/80">Wants</div>
                <div className="text-xl font-bold text-emerald-100">
                  {offer.acceptor_amount} {offer.acceptor_asset.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="text-sm font-semibold text-amber-200">
                Status: {offer.status}
              </div>
            </div>
          </div>

          {offer.status === 'offered' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#aab1ce]">
                  Your Receiving Address ({offer.initiator_asset.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={acceptorAddress}
                  onChange={(e) => setAcceptorAddress(e.target.value)}
                  className="w-full rounded-lg border border-[#3a3f58] bg-[#11182a] px-4 py-3 font-mono text-sm text-[#d8def7] placeholder:text-[#707894] outline-none transition focus:border-[#b07cff]"
                  placeholder={`Your ${offer.initiator_asset.toUpperCase()} address`}
                />
              </div>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? 'Accepting...' : (
                  <>
                    <Handshake className="h-5 w-5" />
                    Accept Offer
                  </>
                )}
              </button>
            </div>
          )}

          {offer.status === 'accepted' && (
            <button
              onClick={handleLockInitiator}
              disabled={loading}
              className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? 'Locking...' : (
                <>
                  <Lock className="h-5 w-5" />
                  Lock Your Funds (Initiator)
                </>
              )}
            </button>
          )}

          {offer.status === 'initiator_locked' && (
            <button
              onClick={handleLockAcceptor}
              disabled={loading}
              className="w-full bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? 'Locking...' : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Lock Your Funds (Acceptor)
                </>
              )}
            </button>
          )}

          {offer.status === 'acceptor_locked' && (
            <button
              onClick={handleClaimInitiator}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? 'Claiming...' : (
                <>
                  <Zap className="h-5 w-5" />
                  Claim Funds (Reveal Secret)
                </>
              )}
            </button>
          )}

          {offer.status === 'initiator_claimed' && (
            <button
              onClick={handleClaimAcceptor}
              disabled={loading}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? 'Claiming...' : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Claim Funds (Use Secret)
                </>
              )}
            </button>
          )}

          {error && (
            <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-4">
              <span className="inline-flex items-center gap-2 text-red-200">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            </div>
          )}

          {success && (
            <div className="mt-4 rounded border border-emerald-400/40 bg-emerald-500/10 p-4">
              <span className="inline-flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
