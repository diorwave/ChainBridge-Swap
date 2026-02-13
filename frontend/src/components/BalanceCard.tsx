import { useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Balance } from '../types/swap';

export function BalanceCard() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getBalances();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !balance) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchBalances}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 inline-flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary-600" />
        Wallet Balances
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Depix</div>
          <div className="text-3xl font-bold">
            {balance?.depix_balance.toFixed(8) || '0.00000000'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Bitcoin</div>
          <div className="text-3xl font-bold">
            {balance?.btc_balance.toFixed(8) || '0.00000000'}
          </div>
        </div>
      </div>

      <button
        onClick={fetchBalances}
        className="w-full md:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium inline-flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}
