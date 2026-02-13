import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  CornerUpLeft,
  Handshake,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { AtomicSwapOffer } from '../types/swap';

interface OfferListProps {
  refreshTrigger: number;
  onAccept: (offer: AtomicSwapOffer) => void;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: LucideIcon }> = {
  offered: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Open', icon: ClipboardList },
  accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Accepted', icon: Handshake },
  initiator_locked: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Initiator Locked', icon: Lock },
  acceptor_locked: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Both Locked', icon: ShieldCheck },
  initiator_claimed: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Secret Revealed', icon: Sparkles },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: CheckCircle2 },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded', icon: CornerUpLeft },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled', icon: Ban },
};

export function OfferList({ refreshTrigger, onAccept }: OfferListProps) {
  const [offers, setOffers] = useState<AtomicSwapOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'active'>('all');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      let data: AtomicSwapOffer[];
      
      if (filter === 'open') {
        data = await apiClient.listOpenOffers();
      } else if (filter === 'active') {
        data = await apiClient.listOffers();
        data = data.filter(o => 
          ['accepted', 'initiator_locked', 'acceptor_locked', 'initiator_claimed'].includes(o.status)
        );
      } else {
        data = await apiClient.listOffers();
      }
      
      setOffers(data);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [refreshTrigger, filter]);

  useEffect(() => {
    const interval = setInterval(fetchOffers, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  if (loading && offers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-primary-600" />
          Swap Offers
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'open'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'active'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-14 w-14 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg">No {filter} offers</p>
          <p className="text-gray-400 text-sm mt-2">
            {filter === 'open' ? 'Create an offer or wait for others to post' : 'Check back later'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const status = statusConfig[offer.status] || statusConfig.offered;
            const canAccept = offer.status === 'offered';
            const StatusIcon = status.icon;
            
            return (
              <div
                key={offer.swap_id}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary-300 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div className="font-mono text-sm text-gray-600 mb-2 md:mb-0">
                    {offer.swap_id}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Offering</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offer.initiator_amount} {offer.initiator_asset.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Wants</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offer.acceptor_amount} {offer.acceptor_asset.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Initiator Address:</span>
                    <div className="font-mono text-xs text-gray-900 break-all">
                      {offer.initiator_address}
                    </div>
                  </div>
                  
                  {offer.acceptor_address && (
                    <div>
                      <span className="text-gray-600">Acceptor Address:</span>
                      <div className="font-mono text-xs text-gray-900 break-all">
                        {offer.acceptor_address}
                      </div>
                    </div>
                  )}
                  
                  {offer.initiator_txid && (
                    <div>
                      <span className="text-gray-600">Initiator TX:</span>
                      <div className="font-mono text-xs text-gray-900 break-all">
                        {offer.initiator_txid}
                      </div>
                    </div>
                  )}
                  
                  {offer.acceptor_txid && (
                    <div>
                      <span className="text-gray-600">Acceptor TX:</span>
                      <div className="font-mono text-xs text-gray-900 break-all">
                        {offer.acceptor_txid}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <div className="text-gray-900">
                      {new Date(offer.created_at * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>

                {canAccept && (
                  <button
                    onClick={() => onAccept(offer)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition shadow-lg inline-flex items-center justify-center gap-2"
                  >
                    <Handshake className="h-5 w-5" />
                    Accept This Offer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
