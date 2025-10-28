import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaType?: string;
  validationStatus: 'PENDING' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';
  validationCount: number;
  author: {
    id: string;
    username: string;
    karma: number;
    league: string;
    avatarUrl?: string;
  };
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreatePostData {
  content: string;
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  files?: File[];
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ContentStore {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createPost: (data: CreatePostData) => Promise<Post>;
  getFeed: (pagination?: PaginationParams) => Promise<Post[]>;
  getReels: (pagination?: PaginationParams) => Promise<Post[]>;
  getDiscoveryFeed: (pagination?: PaginationParams, filters?: any) => Promise<Post[]>;
  getRecommendedPosts: (pagination?: PaginationParams) => Promise<Post[]>;
  getPost: (postId: string) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  
  // Engagement
  engageWithPost: (postId: string, type: 'LIKE' | 'COMMENT' | 'SHARE') => Promise<void>;
  removeEngagement: (postId: string, type: 'LIKE' | 'SHARE') => Promise<void>;
  getPostEngagements: (postId: string) => Promise<any>;
  getUserEngagementsForPost: (postId: string) => Promise<any>;
  
  // State management
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useContentStore = create<ContentStore>()(
  devtools(
    (set, get) => ({
      posts: [],
      isLoading: false,
      error: null,

      createPost: async (data: CreatePostData) => {
        set({ isLoading: true, error: null });
        
        try {
          const formData = new FormData();
          formData.append('content', data.content);
          
          if (data.mediaType) {
            formData.append('mediaType', data.mediaType);
          }
          
          if (data.files) {
            data.files.forEach((file) => {
              formData.append('files', file);
            });
          }

          const response = await apiClient.post('/content/posts', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          const newPost = response.data;
          set((state) => ({
            posts: [newPost, ...state.posts],
            isLoading: false,
          }));

          return newPost;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to create post';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getFeed: async (pagination = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          if (pagination.page) params.append('page', pagination.page.toString());
          if (pagination.limit) params.append('limit', pagination.limit.toString());
          if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
          if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

          const response = await apiClient.get(`/content/feed?${params}`);
          const posts = response.data;

          if (pagination.page === 1) {
            set({ posts, isLoading: false });
          } else {
            set((state) => ({
              posts: [...state.posts, ...posts],
              isLoading: false,
            }));
          }

          return posts;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load feed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getReels: async (pagination = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          if (pagination.page) params.append('page', pagination.page.toString());
          if (pagination.limit) params.append('limit', pagination.limit.toString());

          const response = await apiClient.get(`/content/reels?${params}`);
          const reels = response.data;

          set({ isLoading: false });
          return reels;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load reels';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getDiscoveryFeed: async (pagination = {}, filters = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          if (pagination.page) params.append('page', pagination.page.toString());
          if (pagination.limit) params.append('limit', pagination.limit.toString());
          if (filters.validationStatus) params.append('validationStatus', filters.validationStatus);
          if (filters.minKarma) params.append('minKarma', filters.minKarma.toString());
          if (filters.league) params.append('league', filters.league);

          const response = await apiClient.get(`/content/discover?${params}`);
          const posts = response.data;

          if (pagination.page === 1) {
            set({ posts, isLoading: false });
          } else {
            set((state) => ({
              posts: [...state.posts, ...posts],
              isLoading: false,
            }));
          }

          return posts;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load discovery feed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getRecommendedPosts: async (pagination = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          if (pagination.page) params.append('page', pagination.page.toString());
          if (pagination.limit) params.append('limit', pagination.limit.toString());

          const response = await apiClient.get(`/content/recommended?${params}`);
          const posts = response.data;

          if (pagination.page === 1) {
            set({ posts, isLoading: false });
          } else {
            set((state) => ({
              posts: [...state.posts, ...posts],
              isLoading: false,
            }));
          }

          return posts;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load recommended posts';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getPost: async (postId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.get(`/content/posts/${postId}`);
          const post = response.data;

          set({ isLoading: false });
          return post;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load post';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deletePost: async (postId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.delete(`/content/posts/${postId}`);
          
          set((state) => ({
            posts: state.posts.filter(post => post.id !== postId),
            isLoading: false,
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to delete post';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      engageWithPost: async (postId: string, type: 'LIKE' | 'COMMENT' | 'SHARE') => {
        try {
          await apiClient.post(`/content/posts/${postId}/engage`, { type });
          
          // Update local state
          set((state) => ({
            posts: state.posts.map(post => {
              if (post.id === postId) {
                const updatedCounts = { ...post.engagementCounts };
                if (type === 'LIKE') updatedCounts.likes += 1;
                else if (type === 'SHARE') updatedCounts.shares += 1;
                
                return { ...post, engagementCounts: updatedCounts };
              }
              return post;
            }),
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || `Failed to ${type.toLowerCase()} post`;
          set({ error: errorMessage });
          throw error;
        }
      },

      removeEngagement: async (postId: string, type: 'LIKE' | 'SHARE') => {
        try {
          await apiClient.delete(`/content/posts/${postId}/engage`, { data: { type } });
          
          // Update local state
          set((state) => ({
            posts: state.posts.map(post => {
              if (post.id === postId) {
                const updatedCounts = { ...post.engagementCounts };
                if (type === 'LIKE') updatedCounts.likes = Math.max(0, updatedCounts.likes - 1);
                else if (type === 'SHARE') updatedCounts.shares = Math.max(0, updatedCounts.shares - 1);
                
                return { ...post, engagementCounts: updatedCounts };
              }
              return post;
            }),
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || `Failed to remove ${type.toLowerCase()}`;
          set({ error: errorMessage });
          throw error;
        }
      },

      getPostEngagements: async (postId: string) => {
        try {
          const response = await apiClient.get(`/content/posts/${postId}/engagements`);
          return response.data;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load engagements';
          set({ error: errorMessage });
          throw error;
        }
      },

      getUserEngagementsForPost: async (postId: string) => {
        try {
          const response = await apiClient.get(`/content/posts/${postId}/user-engagements`);
          return response.data;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to load user engagements';
          set({ error: errorMessage });
          throw error;
        }
      },

      // State management
      setPosts: (posts) => set({ posts }),
      
      addPost: (post) => set((state) => ({ 
        posts: [post, ...state.posts] 
      })),
      
      updatePost: (postId, updates) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId ? { ...post, ...updates } : post
        ),
      })),
      
      removePost: (postId) => set((state) => ({
        posts: state.posts.filter(post => post.id !== postId),
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'content-store',
    }
  )
);