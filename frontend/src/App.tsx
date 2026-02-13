import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Bitcoin,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Gem,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
  Undo2,
  XCircle,
} from 'lucide-react';
import { apiClient } from './api/client';
import { CreateOffer } from './components/CreateOffer';
import { SwapActions } from './components/SwapActions';
import type { AtomicSwapOffer } from './types/swap';

function offerStatusIcon(status: AtomicSwapOffer['status']) {
  if (status === 'offered') return CircleDot;
  if (status === 'accepted') return Sparkles;
  if (status === 'initiator_locked' || status === 'acceptor_locked') return LockKeyhole;
  if (status === 'initiator_claimed') return Sparkles;
  if (status === 'completed') return CheckCircle2;
  if (status === 'refunded') return RefreshCcw;
  return XCircle;
}

function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [offers, setOffers] = useState<AtomicSwapOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<AtomicSwapOffer | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState('Checking backend...');
  const [swapActionError, setSwapActionError] = useState<string | null>(null);

  const handleDataChanged = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!showHistory) return;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const offerData = await apiClient.listOffers();
        setOffers(offerData);
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [showHistory, refreshTrigger]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const [health, root] = await Promise.all([apiClient.getHealth(), apiClient.getRootInfo()]);
        setBackendStatus(`${health.status} (${health.version}) - ${root.message}`);
      } catch (err) {
        setBackendStatus(err instanceof Error ? `Backend check failed: ${err.message}` : 'Backend check failed');
      }
    };

    checkBackend();
  }, []);

  const handleOpenOfferActions = async (offerId: string) => {
    try {
      setSwapActionError(null);
      const offer = await apiClient.getOffer(offerId);
      setSelectedOffer(offer);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to fetch offer');
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#211b38]">
      <main className="relative z-10 flex min-h-screen items-start justify-center p-4 pt-8 md:pt-12">
        <div className="w-full max-w-[600px]">
          <div className="mb-6 text-center text-violet-100">
            <h1 className="text-3xl font-semibold md:text-4xl">
              <span className="inline-flex items-center gap-2">
                Depix
                <ArrowRightLeft className="h-6 w-6" />
                Bitcoin Atomic Swap
              </span>
            </h1>
            <p className="mt-2 text-sm text-violet-200/85">Trustless P2P cross-chain swaps using HTLC</p>
          </div>
          {swapActionError && (
            <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <span className="inline-flex items-center gap-2">
                <CircleAlert className="h-4 w-4" />
                Swap failed: {swapActionError}
              </span>
            </div>
          )}

          {showHistory ? (
            <div className="overflow-hidden rounded-[30px] border border-[#2f2f44] bg-[#0f1320] shadow-[0_35px_80px_rgba(6,8,16,0.7)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24283d] px-6 py-4">
                <p className="text-lg font-semibold text-violet-100">API Coverage Dashboard</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRefreshTrigger((prev) => prev + 1)}
                    className="inline-flex items-center gap-2 rounded-full cursor-pointer border border-[#4a3e70] bg-[#2f2650] p-2 text-xs font-semibold text-violet-100 transition hover:bg-[#3a2f60]"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="inline-flex items-center gap-2 rounded-full cursor-pointer border border-[#4a3e70] bg-[#2f2650] p-2 text-xs font-semibold text-violet-100 transition hover:bg-[#3a2f60]"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                {historyLoading && (
                  <div className="flex h-20 items-center justify-center rounded-2xl border border-[#343a55] bg-[#191e30]">
                    <Loader2 className="h-5 w-5 animate-spin text-[#aab1ce]" />
                  </div>
                )}

                {historyError && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span className="inline-flex items-center gap-2">
                      <CircleAlert className="h-4 w-4" />
                      {historyError}
                    </span>
                  </div>
                )}

                {!historyLoading && (
                  <section className="rounded-2xl border border-[#343a55] bg-[#191e30] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-violet-100">Offer History</p>
                      <p className="text-xs text-[#9aa3c7]">{offers.length} items</p>
                    </div>
                    <div>
                      {offers.length === 0 ? (
                        <div className="rounded-xl border border-[#4a3e70] bg-[#25203f] px-3 py-2 text-sm text-[#9aa3c7]">
                          No history yet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-[#343a55] overflow-hidden rounded-xl border border-[#343a55] bg-[#141a2a]">
                          {offers.map((offer) => {
                            const AssetIcon = offer.initiator_asset === 'btc' ? Bitcoin : Gem;
                            const StatusIcon = offerStatusIcon(offer.status);
                            return (
                              <li key={offer.swap_id} className="px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1 text-xs text-[#d8def7]">
                                    <div className="inline-flex items-center gap-2">
                                      <AssetIcon className="h-4 w-4 text-violet-200" />
                                      <span className="font-mono text-[#c7cff0]">{offer.swap_id}</span>
                                    </div>
                                    <p>
                                      {offer.initiator_amount} {offer.initiator_asset.toUpperCase()}
                                      {' -> '}
                                      {offer.acceptor_amount}{' '}
                                      {offer.acceptor_asset.toUpperCase()}
                                    </p>
                                    <p className="text-[#9aa3c7]">{new Date(offer.created_at * 1000).toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-[#4a3e70] bg-[#25203f] px-2 py-1 text-[11px] text-violet-200">
                                      <StatusIcon className="h-3.5 w-3.5" />
                                      {offer.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenOfferActions(offer.swap_id)}
                                      className="rounded-lg border border-[#4a3e70] bg-[#2f2650] cursor-pointer px-2.5 py-1.5 text-[11px] font-semibold text-violet-100 transition hover:bg-[#3a2f60]"
                                    >
                                      Open
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <CreateOffer
              onOfferCreated={handleDataChanged}
              onToggleHistory={() => setShowHistory(true)}
            />
          )}
        </div>
      </main>

      <SwapActions
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onAction={handleDataChanged}
        onError={(message) => setSwapActionError(message)}
      />
    </div>
  );
}

export default App;