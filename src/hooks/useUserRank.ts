'use client'

import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Master';

export interface RankInfo {
  tier: RankTier;
  xp: number;
  nextTierXP: number | null;
  progressPercentage: number;
  color: string;
  badgeBorder: string;
}

export function useUserRank(userId?: string) {
  const [rankInfo, setRankInfo] = useState<RankInfo>({
    tier: 'Bronze',
    xp: 0,
    nextTierXP: 200,
    progressPercentage: 0,
    color: 'text-[#CD7F32]',
    badgeBorder: 'border-[#CD7F32]/40 bg-[#CD7F32]/10',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchXP = async () => {
      try {
        setLoading(true);
        // Use custom Express API — no Supabase RPC
        const data = await api.get(`/profiles/${userId}/xp`);
        const xp: number = data?.xp ?? 0;

        let tier: RankTier = 'Bronze';
        let nextTierXP: number | null = 50;
        let color = 'text-[#CD7F32]';
        let badgeBorder = 'border-[#CD7F32]/40 bg-[#CD7F32]/10 shadow-[0_0_15px_rgba(205,127,50,0.2)]';
        let minimumXP = 0;

        if (xp >= 5000) {
          tier = 'Master';
          nextTierXP = null;
          color = 'text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400';
          badgeBorder = 'border-transparent bg-white/5 shadow-[0_0_20px_rgba(167,139,250,0.5)] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 bg-clip-padding';
        } else if (xp >= 1000) {
          tier = 'Diamond';
          nextTierXP = 5000;
          minimumXP = 1000;
          color = 'text-cyan-400 font-extrabold';
          badgeBorder = 'border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
        } else if (xp >= 100) {
          tier = 'Gold';
          nextTierXP = 1000;
          minimumXP = 100;
          color = 'text-yellow-400 font-bold';
          badgeBorder = 'border-yellow-400/50 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
        } else if (xp >= 20) {
          tier = 'Silver';
          nextTierXP = 100;
          minimumXP = 20;
          color = 'text-slate-300 font-semibold';
          badgeBorder = 'border-slate-300/40 bg-slate-300/10 shadow-[0_0_10px_rgba(203,213,225,0.2)]';
        }

        let progressPercentage = 100;
        if (nextTierXP) {
          const xpInCurrentTier = xp - minimumXP;
          const totalXpInTier = nextTierXP - minimumXP;
          progressPercentage = Math.min(100, Math.max(0, (xpInCurrentTier / totalXpInTier) * 100));
        }

        setRankInfo({ tier, xp, nextTierXP, progressPercentage, color, badgeBorder });
      } catch (err) {
        // Non-fatal — degrade to default Bronze rank silently
        console.warn('[useUserRank] XP fetch failed, defaulting to Bronze', err);
      } finally {
        setLoading(false);
      }
    };

    const handleUpdate = () => fetchXP();
    window.addEventListener('challenges:updated', handleUpdate);
    fetchXP();
    return () => window.removeEventListener('challenges:updated', handleUpdate);
  }, [userId]);

  return { rankInfo, loading };
}
