import { useEffect, useState } from 'react';
import { ClipboardList, History } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Swap } from '../types/swap';

interface SwapListProps {
  refreshTrigger: number;
}

const statusConfig = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  locked: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Locked' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' },
};

export function SwapList({ refreshTrigger }: SwapListProps) {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listSwaps();
      setSwaps(data);
    } catch (err) {
      console.error('Failed to fetch swaps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwaps();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(fetchSwaps, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && swaps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (swaps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 inline-flex items-center gap-2">
          <History className="h-6 w-6 text-primary-600" />
          Swap History
        </h2>
        <div className="text-center py-12">
          <ClipboardList className="h-14 w-14 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg">No swaps yet</p>
          <p className="text-gray-400 text-sm mt-2">Create your first atomic swap above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 inline-flex items-center gap-2">
        <History className="h-6 w-6 text-primary-600" />
        Swap History
      </h2>
      
      <div className="space-y-4">
        {swaps.map((swap) => {
          const status = statusConfig[swap.status] || statusConfig.pending;
          
          return (
            <div
              key={swap.swap_id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary-300 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div className="font-mono text-sm text-gray-600 mb-2 md:mb-0">
                  {swap.swap_id}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">Depix Amount:</span>
                  <span className="font-semibold text-gray-900 md:block">{swap.depix_amount}</span>
                </div>
                
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">BTC Amount:</span>
                  <span className="font-semibold text-gray-900 md:block">{swap.btc_amount}</span>
                </div>
                
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">Depix TX:</span>
                  <span className="font-mono text-xs text-gray-900 md:block break-all">
                    {swap.depix_txid || 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">BTC TX:</span>
                  <span className="font-mono text-xs text-gray-900 md:block break-all">
                    {swap.btc_txid || 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">Hashlock:</span>
                  <span className="font-mono text-xs text-gray-900 md:block break-all">
                    {swap.hashlock.substring(0, 16)}...
                  </span>
                </div>
                
                <div className="flex justify-between md:block">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900 md:block">
                    {new Date(swap.created_at * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
