import { create } from 'zustand';

export interface KarmaTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'AWARD' | 'DEDUCT';
  reason: string;
  balanceAfter: number;
  blockchainTxHash?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LeagueInfo {
  current: string;
  nextLeague?: string;
  karmaRequired?: number;
  karmaProgress: number;
  unlockedPowers: string[];
}

interface KarmaState {
  balance: number;
  transactions: KarmaTransaction[];
  leagueInfo: LeagueInfo | null;
  unlockedAstras: string[];
  isLoading: boolean;
  
  setBalance: (balance: number) => void;
  setTransactions: (transactions: KarmaTransaction[]) => void;
  addTransaction: (transaction: KarmaTransaction) => void;
  setLeagueInfo: (leagueInfo: LeagueInfo) => void;
  setUnlockedAstras: (astras: string[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  balance: 0,
  transactions: [],
  leagueInfo: null,
  unlockedAstras: [],
  isLoading: false,
};

export const useKarmaStore = create<KarmaState>((set) => ({
  ...initialState,
  
  setBalance: (balance) => set({ balance }),
  
  setTransactions: (transactions) => set({ transactions }),
  
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      balance: transaction.balanceAfter,
    })),
  
  setLeagueInfo: (leagueInfo) => set({ leagueInfo }),
  
  setUnlockedAstras: (astras) => set({ unlockedAstras: astras }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  reset: () => set(initialState),
}));
