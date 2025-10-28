import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

export interface ValidationResponse {
  id: string;
  postId: string;
  validatorId: string;
  validator: {
    id: string;
    username: string;
    league: string;
    karma: number;
  };
  verdict: 'AUTHENTIC' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  notes?: string;
  blockchainTxHash?: string;
  createdAt: string;
}

export interface ConsensusResult {
  reached: boolean;
  finalVerdict: 'VERIFIED' | 'FLAGGED' | 'PENDING';
  validatorCount: number;
  consensusPercentage: number;
  verdictCounts: {
    authentic: number;
    fake: number;
    uncertain: number;
  };
}

export interface ValidationStats {
  totalValidations: number;
  authenticCount: number;
  fakeCount: number;
  uncertainCount: number;
  consensusReached: boolean;
}

export interface SubmitValidationData {
  postId: string;
  verdict: 'AUTHENTIC' | 'FAKE' | 'UNCERTAIN';
  confidence: number;
  notes?: string;
}

interface ValidationStore {
  validations: ValidationResponse[];
  consensus: ConsensusResult | null;
  stats: ValidationStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  submitValidation: (data: SubmitValidationData) => Promise<ValidationResponse>;
  getValidations: (postId: string, page?: number, limit?: number) => Promise<{
    validations: ValidationResponse[];
    stats: ValidationStats;
    consensus: ConsensusResult;
    total: number;
    page: number;
    limit: number;
  }>;
  getConsensus: (postId: string) => Promise<ConsensusResult>;
  
  // State management
  setValidations: (validations: ValidationResponse[]) => void;
  setConsensus: (consensus: ConsensusResult) => void;
  setStats: (stats: ValidationStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useValidationStore = create<ValidationStore>()(
  devtools(
    (set, get) => ({
      validations: [],
      consensus: null,
      stats: null,
      isLoading: false,
      error: null,

      submitValidation: async (data: SubmitValidationData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/validations', data);
          const validation = response.data;

          // Add to local state
          set((state) => ({
            validations: [validation, ...state.validations],
            isLoading: false,
          }));

          return validation;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to submit validation';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getValidations: async (postId: string, page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('limit', limit.toString());

          const response = await apiClient.get(`/validations/post/${postId}?${params}`);
          const data = response.data;

          set({
            validations: data.validations,
            stats: data.stats,
            consensus: data.consensus,
            isLoading: false,
          });

          return data;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load validations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getConsensus: async (postId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.get(`/validations/post/${postId}/consensus`);
          const consensus = response.data;

          set({ consensus, isLoading: false });
          return consensus;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load consensus';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // State management
      setValidations: (validations) => set({ validations }),
      
      setConsensus: (consensus) => set({ consensus }),
      
      setStats: (stats) => set({ stats }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      reset: () => set({
        validations: [],
        consensus: null,
        stats: null,
        isLoading: false,
        error: null,
      }),
    }),
    {
      name: 'validation-store',
    }
  )
);