import { useState, useEffect } from "react";

export interface TrustTierData {
  score: number;
  tier: "NEWCOMER" | "MEMBER" | "CREDITOR" | "ELDER";
  capabilities: string[];
  progressToNextTier: number;
}

export interface CreditLine {
  id: string;
  borrower: string;
  issuer: string;
  amount: number;
  drawn: number;
  remaining: number;
  dueDate: string;
  status: "active" | "overdue" | "settled";
}

export interface CreditReport {
  totalAvailable: number;
  totalUsed: number;
  activeLineCount: number;
  defaultHistory: number;
  creditScore: number;
}

export interface BarterMatch {
  id: string;
  offering: string;
  seeking: string;
  compatibility: number;
  offerer: string;
}

export interface BarterIntent {
  id: string;
  offering: string;
  seeking: string;
  status: "open" | "matched" | "settled";
  createdAt: string;
}

// Fetch trust score and tier data
export function useTrustScore(address: string | undefined) {
  const [data, setData] = useState<TrustTierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    const fetchTrustScore = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/trust/${address}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch trust score");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustScore();
  }, [address]);

  return { data, loading, error };
}

// Fetch active credit lines
export function useCreditLines(address: string | undefined) {
  const [data, setData] = useState<CreditLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    const fetchCreditLines = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/credit-lines/${address}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch credit lines");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditLines();
  }, [address]);

  return { data, loading, error };
}

// Fetch credit report
export function useCreditReport(address: string | undefined) {
  const [data, setData] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    const fetchCreditReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/credit-report/${address}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch credit report");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditReport();
  }, [address]);

  return { data, loading, error };
}

// Fetch barter matches
export function useBarterMatches() {
  const [data, setData] = useState<BarterMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/barter/matches`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch barter matches");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  return { data, loading, error };
}

// Submit credit issue
export async function submitCreditIssue(borrower: string, amount: number, durationDays: number) {
  const response = await fetch(`/api/credit/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ borrower, amount, durationDays }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Submit barter intent
export async function submitBarterIntent(offering: string, seeking: string) {
  const response = await fetch(`/api/barter/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offering, seeking }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Download credit report as JSON
export async function downloadCreditReport(address: string) {
  const response = await fetch(`/api/credit-report/${address}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `credit-report-${address.slice(0, 8)}-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
