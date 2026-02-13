import { useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CreateSwapRequest } from '../types/swap';

interface SwapFormProps {
  onSwapCreated: () => void;
}

export function SwapForm({ onSwapCreated }: SwapFormProps) {
  const [formData, setFormData] = useState<CreateSwapRequest>({
    depix_amount: 0,
    btc_amount: 0,
    depix_recipient: '',
    btc_recipient: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const swap = await apiClient.createSwap(formData);
      setSuccess(`Swap created successfully! ID: ${swap.swap_id}`);
      setFormData({
        depix_amount: 0,
        btc_amount: 0,
        depix_recipient: '',
        btc_recipient: '',
      });
      onSwapCreated();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create swap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Swap</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Depix Amount
            </label>
            <input
              type="number"
              step="0.00000001"
              value={formData.depix_amount || ''}
              onChange={(e) => setFormData({ ...formData, depix_amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="0.00000000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitcoin Amount
            </label>
            <input
              type="number"
              step="0.00000001"
              value={formData.btc_amount || ''}
              onChange={(e) => setFormData({ ...formData, btc_amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="0.00000000"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Depix Recipient Address
          </label>
          <input
            type="text"
            value={formData.depix_recipient}
            onChange={(e) => setFormData({ ...formData, depix_recipient: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition font-mono text-sm"
            placeholder="Enter Depix address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bitcoin Recipient Address
          </label>
          <input
            type="text"
            value={formData.btc_recipient}
            onChange={(e) => setFormData({ ...formData, btc_recipient: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition font-mono text-sm"
            placeholder="Enter Bitcoin address"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <span className="text-red-800 inline-flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-center">
              <span className="text-green-800 inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-4 rounded-lg font-semibold text-lg hover:from-primary-600 hover:to-secondary-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Creating Swap...
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create Atomic Swap
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
