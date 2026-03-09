import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeAbiParameters, parseAbiParameters, parseUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../config/wagmi";

const intentRegistryAbi = [
  { type: "function", name: "submitIntent", inputs: [{ name: "intentType", type: "uint8" }, { name: "params", type: "bytes" }, { name: "expiresAt", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

const CYCLE_OPTIONS = [
  { label: "Weekly",   value: (7  * 24 * 60 * 60).toString() },
  { label: "Biweekly", value: (14 * 24 * 60 * 60).toString() },
  { label: "Monthly",  value: (30 * 24 * 60 * 60).toString() },
];

export function IntentForm() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("10");
  const [cycleDuration, setCycleDuration] = useState(CYCLE_OPTIONS[2]!.value);
  const [preferredSize, setPreferredSize] = useState(5);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) return;
    const params = encodeAbiParameters(
      parseAbiParameters("uint256 contributionAmount, uint256 cycleDuration, uint8 preferredSize"),
      [parseUnits(amount, 18), BigInt(cycleDuration), preferredSize]
    );
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
    writeContract({ address: CONTRACT_ADDRESSES.intentRegistry, abi: intentRegistryAbi, functionName: "submitIntent", args: [0, params, expiresAt] });
  }

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">Intent Submitted!</h3>
        <p className="text-green-700 text-sm">The agent will match you with a savings circle soon.</p>
        {txHash && (
          <a href={`https://alfajores.celoscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-green-600 underline">View on CeloScan</a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Join a Savings Circle</h2>
      <p className="text-gray-500 text-sm mb-6">Submit your intent — the agent matches you with compatible members automatically.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Amount (cUSD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="10" required />
          </div>
          <p className="text-xs text-gray-400 mt-1">The agent matches you with members within 10% of this amount</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {CYCLE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setCycleDuration(opt.value)}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${cycleDuration === opt.value ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-200 hover:border-emerald-400"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Circle Size: <span className="text-emerald-600">{preferredSize} members</span>
          </label>
          <input type="range" min={5} max={20} value={preferredSize} onChange={(e) => setPreferredSize(Number(e.target.value))} className="w-full accent-emerald-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5 (smaller)</span><span>20 (larger)</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Your Circle Intent:</p>
          <ul className="space-y-1">
            <li>Contribute <strong>${amount} cUSD</strong> per round</li>
            <li><strong>{CYCLE_OPTIONS.find(o => o.value === cycleDuration)?.label}</strong> cycles</li>
            <li><strong>{preferredSize} members</strong></li>
            <li>Total payout: <strong>${(Number(amount) * preferredSize).toFixed(0)} cUSD</strong></li>
          </ul>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error.message.slice(0, 120)}</div>}
        <button type="submit" disabled={isPending || isConfirming || !isConnected}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isPending ? "Confirm in wallet..." : isConfirming ? "Submitting intent..." : !isConnected ? "Connect wallet first" : "Submit Intent"}
        </button>
      </form>
    </div>
  );
}
