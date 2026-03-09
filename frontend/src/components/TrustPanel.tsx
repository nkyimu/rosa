import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES } from "../config/wagmi";

const circleTrustAbi = [
  { type: "function", name: "trustScore",    inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTrustEdges", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }] }], stateMutability: "view" },
  { type: "function", name: "trust",         inputs: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revokeTrust",   inputs: [{ name: "trustee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
] as const;

type TrustEdge = { trustee: `0x${string}`; expiresAt: bigint };

export function TrustPanel() {
  const { address, isConnected } = useAccount();
  const [vouchAddress, setVouchAddress] = useState("");
  const [vouchMonths, setVouchMonths]   = useState(12);
  const [formError, setFormError]       = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: trustScore } = useReadContract({
    address: CONTRACT_ADDRESSES.circleTrust,
    abi: circleTrustAbi,
    functionName: "trustScore",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: givenEdges } = useReadContract({
    address: CONTRACT_ADDRESSES.circleTrust,
    abi: circleTrustAbi,
    functionName: "getTrustEdges",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  function handleVouch(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(vouchAddress)) {
      setFormError("Enter a valid Ethereum address (0x...)");
      return;
    }
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + vouchMonths * 30 * 24 * 60 * 60);
    writeContract({ address: CONTRACT_ADDRESSES.circleTrust, abi: circleTrustAbi, functionName: "trust", args: [vouchAddress as `0x${string}`, expiresAt] });
  }

  function handleRevoke(trustee: `0x${string}`) {
    writeContract({ address: CONTRACT_ADDRESSES.circleTrust, abi: circleTrustAbi, functionName: "revokeTrust", args: [trustee] });
  }

  if (!isConnected) {
    return <div className="text-center py-12 text-gray-500">Connect your wallet to manage trust</div>;
  }

  const score = Number((trustScore as bigint | undefined) ?? 0n);
  const edges = (givenEdges ?? []) as TrustEdge[];
  const scoreColor = score >= 80 ? "text-emerald-700 bg-emerald-100" : score >= 50 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Your Trust Score</h3>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}>
          {score} / 100
        </span>
        <p className="text-sm text-gray-500 mt-2">Based on how many people vouch for you. Higher score = access to better circles.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Vouch for Someone</h3>
        <p className="text-sm text-gray-500 mb-4">Vouching adds a trust edge and increases their score.</p>
        <form onSubmit={handleVouch} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wallet Address</label>
            <input type="text" value={vouchAddress} onChange={(e) => setVouchAddress(e.target.value)}
              placeholder="0x..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Trust Duration: <span className="text-emerald-600">{vouchMonths} months</span>
            </label>
            <input type="range" min={1} max={24} value={vouchMonths} onChange={(e) => setVouchMonths(Number(e.target.value))} className="w-full accent-emerald-600" />
          </div>
          {formError && <p className="text-red-600 text-xs">{formError}</p>}
          {isSuccess && <p className="text-green-700 text-xs">Trust added successfully</p>}
          <button type="submit" disabled={isPending || isConfirming}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {isPending || isConfirming ? "Submitting..." : "Vouch"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">You Trust ({edges.length})</h3>
        {edges.length === 0 ? (
          <p className="text-sm text-gray-400">You have not vouched for anyone yet</p>
        ) : (
          edges.map((edge) => {
            const expiresDate = new Date(Number(edge.expiresAt) * 1000);
            const isExpired = edge.expiresAt > 0n && expiresDate < new Date();
            const shortAddr = `${edge.trustee.slice(0, 8)}...${edge.trustee.slice(-4)}`;
            return (
              <div key={edge.trustee} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-mono text-gray-700">{shortAddr}</p>
                  {edge.expiresAt > 0n && (
                    <p className={`text-xs ${isExpired ? "text-red-500" : "text-gray-400"}`}>
                      {isExpired ? "Expired" : `Expires ${expiresDate.toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <button onClick={() => handleRevoke(edge.trustee)} className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50">
                  Revoke
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
