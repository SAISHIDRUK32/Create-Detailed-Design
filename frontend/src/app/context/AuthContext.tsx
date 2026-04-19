/**
 * AuthContext - Authentication State Management
 *
 * Supports two modes:
 * 1. Supabase mode - Full auth via Supabase
 * 2. Demo mode - Fallback with mock users when Supabase not configured
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isDemoMode, handleSupabaseError } from '../config/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'admin';
  verificationStatus: 'verified' | 'pending' | 'unverified';
  trustScore: number;
  mfaEnabled: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'buyer' | 'seller';
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convert Supabase user + profile to our User type
async function supabaseUserToUser(supabaseUser: SupabaseUser): Promise<User> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || supabaseUser.user_metadata?.name || 'User',
    avatar: profile?.avatar,
    role: profile?.role || 'buyer',
    verificationStatus: profile?.verification_status || 'pending',
    trustScore: profile?.trust_score || 50,
    mfaEnabled: profile?.mfa_enabled || false,
    createdAt: new Date(profile?.created_at || supabaseUser.created_at),
  };
}

// Mock user database for demo mode
const mockUsers: Map<string, { user: User; password: string }> = new Map([
  ['admin@aura.com', {
    user: {
      id: 'admin-1',
      email: 'admin@aura.com',
      name: 'Admin User',
      role: 'admin',
      verificationStatus: 'verified',
      trustScore: 100,
      mfaEnabled: true,
      createdAt: new Date('2024-01-01'),
    },
    password: 'admin123',
  }],
  ['demo@aura.com', {
    user: {
      id: 'user-1',
      email: 'demo@aura.com',
      name: 'Alex Rivera',
      role: 'buyer',
      verificationStatus: 'verified',
      trustScore: 85,
      mfaEnabled: false,
      createdAt: new Date('2024-06-15'),
    },
    password: 'demo123',
  }],
  ['seller@aura.com', {
    user: {
      id: 'seller-1',
      email: 'seller@aura.com',
      name: 'TimeCollector Pro',
      role: 'seller',
      verificationStatus: 'verified',
      trustScore: 95,
      mfaEnabled: false,
      createdAt: new Date('2024-03-01'),
    },
    password: 'seller123',
  }],
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: restore from localStorage
      const savedUser = localStorage.getItem('aura_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          parsed.createdAt = new Date(parsed.createdAt);
          setUser(parsed);
        } catch {
          localStorage.removeItem('aura_user');
        }
      }
      setIsLoading(false);
      return;
    }

    // Supabase mode: listen for auth changes
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let subscription: any;

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          const userData = await supabaseUserToUser(session.user);
          setUser(userData);
        }
      } catch (error) {
        console.error('Session error:', error);
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    // Listen for auth changes
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await supabaseUserToUser(session.user);
          setUser(userData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    });

    subscription = data.subscription;

    initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe().catch(() => {});
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // Demo mode
    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 800));

      const userData = mockUsers.get(email.toLowerCase());

      if (!userData) {
        setIsLoading(false);
        return { success: false, error: 'No account found with this email' };
      }

      if (userData.password !== password) {
        setIsLoading(false);
        return { success: false, error: 'Incorrect password' };
      }

      setUser(userData.user);
      localStorage.setItem('aura_user', JSON.stringify(userData.user));
      setIsLoading(false);
      return { success: true };
    }

    // Supabase mode
    if (!supabase) {
      setIsLoading(false);
      return { success: false, error: 'Authentication not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        console.error('Login error:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      if (data.user) {
        try {
          const userData = await supabaseUserToUser(data.user);
          setUser(userData);
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          // Still allow login even if profile fetch fails
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || 'User',
            role: 'buyer',
            verificationStatus: 'pending',
            trustScore: 50,
            mfaEnabled: false,
            createdAt: new Date(data.user.created_at),
          });
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      console.error('Login exception:', error);
      return { success: false, error: handleSupabaseError(error) };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // Demo mode
    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (mockUsers.has(data.email.toLowerCase())) {
        setIsLoading(false);
        return { success: false, error: 'An account with this email already exists' };
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        verificationStatus: 'pending',
        trustScore: 50,
        mfaEnabled: false,
        createdAt: new Date(),
      };

      mockUsers.set(data.email.toLowerCase(), { user: newUser, password: data.password });
      setUser(newUser);
      localStorage.setItem('aura_user', JSON.stringify(newUser));
      setIsLoading(false);
      return { success: true };
    }

    // Supabase mode
    if (!supabase) {
      setIsLoading(false);
      return { success: false, error: 'Authentication not configured' };
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          },
        },
      });

      if (error) {
        setIsLoading(false);
        console.error('Signup error:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      if (authData.user) {
        try {
          // Profile is auto-created via database trigger
          const userData = await supabaseUserToUser(authData.user);
          setUser(userData);
        } catch (profileError) {
          console.error('Profile fetch after signup:', profileError);
          // Still allow signup to complete
          setUser({
            id: authData.user.id,
            email: authData.user.email || '',
            name: data.name,
            role: data.role,
            verificationStatus: 'pending',
            trustScore: 50,
            mfaEnabled: false,
            createdAt: new Date(authData.user.created_at),
          });
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      console.error('Signup exception:', error);
      return { success: false, error: handleSupabaseError(error) };
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      setUser(null);
      localStorage.removeItem('aura_user');
    } else if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    if (isDemoMode) {
      localStorage.setItem('aura_user', JSON.stringify(updatedUser));
    } else if (supabase) {
      // Update profile in Supabase
      await supabase
        .from('profiles')
        .update({
          name: updates.name,
          avatar: updates.avatar,
          role: updates.role,
        })
        .eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isDemoMode,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
