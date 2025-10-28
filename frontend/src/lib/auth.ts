import apiClient from './api';
import { ethers } from 'ethers';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  walletAddress?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    userId: string;
    username: string;
    email: string;
    karma: number;
    league: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async validateToken(): Promise<any> {
    const response = await apiClient.post('/auth/validate');
    return response.data;
  },

  // Wallet authentication
  async getWalletChallenge(walletAddress: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/wallet/challenge', { walletAddress });
    return response.data;
  },

  async verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/wallet/verify', {
      walletAddress,
      signature,
      message,
    });
    return response.data;
  },

  async linkWallet(walletAddress: string, signature: string, message: string): Promise<{ success: boolean }> {
    const response = await apiClient.post('/auth/wallet/link', {
      walletAddress,
      signature,
      message,
    });
    return response.data;
  },

  // Wallet connection helper
  async connectWallet(): Promise<AuthResponse> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];

    // Get challenge message
    const { message } = await this.getWalletChallenge(walletAddress);

    // Sign message
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);

    // Verify signature and authenticate
    return this.verifyWalletSignature(walletAddress, signature, message);
  },
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
