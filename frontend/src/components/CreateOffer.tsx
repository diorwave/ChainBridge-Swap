import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bitcoin,
  CheckCircle2,
  ChevronDown,
  Gem,
  History,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { Balance, CreateOfferRequest } from '../types/swap';

interface CreateOfferProps {
  onOfferCreated: () => void;
  onToggleHistory: () => void;
}

export function CreateOffer({ onOfferCreated, onToggleHistory }: CreateOfferProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [initiatorAmountInput, setInitiatorAmountInput] = useState('');
  const [acceptorAmountInput, setAcceptorAmountInput] = useState('');
  const [formData, setFormData] = useState<CreateOfferRequest>({
    initiator_asset: 'depix',
    initiator_amount: 0,
    acceptor_asset: 'btc',
    acceptor_amount: 0,
    initiator_address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsAssetMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const data = await apiClient.getBalances();
        setBalance(data);
      } catch {
        // Keep form usable even if balance endpoint fails.
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, []);

  const assetMeta = {
    depix: {
      label: 'DEPIX',
      Icon: Gem,
      chipClass: 'from-[#5f76ff] to-[#7d92ff]',
      iconShellClass: 'bg-[#dbe2ff] text-[#5f76ff]',
    },
    btc: {
      label: 'BTC',
      Icon: Bitcoin,
      chipClass: 'from-[#f7931a] to-[#f7b14b]',
      iconShellClass: 'bg-[#ffe3bf] text-[#f7931a]',
    },
  } as const;

  const initiatorMeta = assetMeta[formData.initiator_asset];
  const acceptorMeta = assetMeta[formData.acceptor_asset];
  const initiatorAmount = parseFloat(initiatorAmountInput);
  const acceptorAmount = parseFloat(acceptorAmountInput);

  const getBalanceForAsset = (asset: 'btc' | 'depix') => {
    if (!balance) return null;
    return asset === 'btc' ? balance.btc_balance : balance.depix_balance;
  };

  const selectedInitiatorBalance = getBalanceForAsset(formData.initiator_asset);
  const selectedAcceptorBalance = getBalanceForAsset(formData.acceptor_asset);
  const initiatorInsufficient =
    selectedInitiatorBalance !== null && Number.isFinite(initiatorAmount) && initiatorAmount > selectedInitiatorBalance;
  const acceptorInsufficient =
    selectedAcceptorBalance !== null && Number.isFinite(acceptorAmount) && acceptorAmount > selectedAcceptorBalance;

  const sanitizeNumericInput = (value: string) => {
    const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const [integerPart, ...decimalParts] = normalized.split('.');
    if (decimalParts.length === 0) return integerPart;
    return `${integerPart}.${decimalParts.join('')}`;
  };

  const handleAssetSelect = (asset: 'btc' | 'depix') => {
    setFormData({
      ...formData,
      initiator_asset: asset,
      acceptor_asset: asset === 'btc' ? 'depix' : 'btc',
    });
    setIsAssetMenuOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!Number.isFinite(initiatorAmount) || initiatorAmount <= 0) {
      setLoading(false);
      setError('Please enter a valid amount you are offering');
      return;
    }

    if (!Number.isFinite(acceptorAmount) || acceptorAmount <= 0) {
      setLoading(false);
      setError('Please enter a valid amount you want');
      return;
    }

    if (initiatorInsufficient) {
      setLoading(false);
      setError(`Insufficient ${formData.initiator_asset.toUpperCase()} balance for this offer amount`);
      return;
    }

    try {
      const offer = await apiClient.createOffer({
        ...formData,
        initiator_amount: initiatorAmount,
        acceptor_amount: acceptorAmount,
      });
      setSuccess(`Offer created! ID: ${offer.swap_id}`);
      setFormData({
        initiator_asset: 'depix',
        initiator_amount: 0,
        acceptor_asset: 'btc',
        acceptor_amount: 0,
        initiator_address: '',
      });
      setInitiatorAmountInput('');
      setAcceptorAmountInput('');
      onOfferCreated();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#2f2f44] bg-[#0f1320] shadow-[0_35px_80px_rgba(6,8,16,0.7)]">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-[#24283d] px-7 py-4">
          <p className="text-lg font-semibold text-violet-100">Automatic Swap</p>
          <button
            type="button"
            onClick={onToggleHistory}
            className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-full border border-[#4a3e70] bg-[#2f2650]  p-2 text-sm font-semibold text-violet-100 transition hover:bg-[#3a2f60]"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
        <div className="px-7 pb-7 pt-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#343a55] bg-[#191e30] px-3 py-2">
              <p className="text-xs text-[#8f97b6]">DEPIX Balance</p>
              <p className="text-sm font-semibold text-[#d8def7]">
                {balance ? balance.depix_balance.toFixed(8) : '--'}
              </p>
            </div>
            <div className="rounded-xl border border-[#343a55] bg-[#191e30] px-3 py-2">
              <p className="text-xs text-[#8f97b6]">BTC Balance</p>
              <p className="text-sm font-semibold text-[#d8def7]">
                {balance ? balance.btc_balance.toFixed(8) : '--'}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-[#24283d] bg-[#0f1320]">
            <div className="border-b border-[#24283d] p-5">
              <div className="mb-4">
                <div ref={pickerRef} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setIsAssetMenuOpen((prev) => !prev)}
                    className={`inline-flex items-center cursor-pointer gap-2 rounded-full border border-white/25 bg-gradient-to-r ${initiatorMeta.chipClass} pl-2 pr-3 py-1.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:brightness-105`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${initiatorMeta.iconShellClass}`}>
                      <initiatorMeta.Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{initiatorMeta.label}</span>
                    <ChevronDown className={`h-4 w-4 transition ${isAssetMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAssetMenuOpen && (
                    <div className="absolute left-0 z-20 mt-2 w-44 rounded-2xl cursor-pointer border border-[#3e4568] bg-[#171d2f]/95 p-2 shadow-2xl backdrop-blur">
                      <button
                        type="button"
                        onClick={() => handleAssetSelect('depix')}
                        className="flex w-full items-center gap-2 rounded-xl cursor-pointer px-3 py-2 text-left text-sm text-[#d7ddf3] transition hover:bg-[#242c45]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dbe2ff] text-[#5f76ff]">
                          <Gem className="h-3.5 w-3.5" />
                        </span>
                        <span>DEPIX</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetSelect('btc')}
                        className="flex w-full items-center gap-2 rounded-xl cursor-pointer px-3 py-2 text-left text-sm text-[#d7ddf3] transition hover:bg-[#242c45]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe3bf] text-[#f7931a]">
                          <Bitcoin className="h-3.5 w-3.5" />
                        </span>
                        <span>BTC</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={initiatorAmountInput}
                onChange={(e) => setInitiatorAmountInput(sanitizeNumericInput(e.target.value))}
                className="w-full bg-transparent text-5xl font-medium text-[#cfd5ec] placeholder:text-[#5d6483] outline-none"
                placeholder="0.00000000"
                required
              />
              {initiatorInsufficient && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Amount exceeds available {formData.initiator_asset.toUpperCase()} balance.
                </p>
              )}
            </div>

            <div className="p-5">
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-[#8f97b6]">Asset You Want</p>
                <div className={`inline-flex items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r ${acceptorMeta.chipClass} pl-2 pr-3 py-1.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${acceptorMeta.iconShellClass}`}>
                    <acceptorMeta.Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{acceptorMeta.label}</span>
                </div>
              </div>
              <div className="mb-4 border-b border-[#24283d] pb-4">
                <label className="mb-2 block text-sm font-medium text-[#aab1ce]">Amount You Want</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={acceptorAmountInput}
                  onChange={(e) => setAcceptorAmountInput(sanitizeNumericInput(e.target.value))}
                  className="w-full bg-transparent text-5xl font-medium text-[#cfd5ec] placeholder:text-[#5d6483] outline-none"
                  placeholder="0.00000000"
                  required
                />
                {acceptorInsufficient && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Amount exceeds available {formData.acceptor_asset.toUpperCase()} balance.
                  </p>
                )}
              </div>
              <label className="mb-2 block text-sm font-medium text-[#aab1ce]">
                Your Receiving Address ({formData.acceptor_asset.toUpperCase()})
              </label>
              <input
                type="text"
                value={formData.initiator_address}
                onChange={(e) => setFormData({ ...formData, initiator_address: e.target.value })}
                className="mt-4 w-full rounded-xl border border-[#3a3f58] bg-[#191e30] px-4 py-3 font-mono text-sm text-[#d8def7] placeholder:text-[#707894] outline-none focus:border-[#b07cff]"
                placeholder={`Your ${formData.acceptor_asset.toUpperCase()} address to receive funds`}
                required
              />
              <p className="mt-2 text-xs text-[#7f87a6]">
                This is where you'll receive the {formData.acceptor_asset.toUpperCase()} from the acceptor
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <span className="inline-flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-[#9c7add] py-4 text-xl font-semibold text-white transition hover:bg-[#ad8aef] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating Offer...' : 'Create Swap Offer'}
          </button>
        </div>
      </form>
    </div>
  );
}
