/**
 * Supabase Client Configuration
 *
 * This file sets up the Supabase client for the frontend.
 * Supabase provides: Database, Auth, Real-time, Storage
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Demo mode flag (when Supabase is not configured)
export const isDemoMode = !isSupabaseConfigured;

// Type definitions for our database
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar: string | null;
          role: 'buyer' | 'seller' | 'admin';
          verification_status: 'verified' | 'pending' | 'unverified';
          trust_score: number;
          mfa_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      auctions: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          condition: string;
          images: string[];
          starting_price: number;
          current_bid: number;
          reserve_price: number;
          buy_now_price: number;
          min_increment: number;
          seller_id: string;
          seller_name: string;
          start_time: string;
          end_time: string;
          status: 'draft' | 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'sold' | 'cancelled';
          bid_count: number;
          winner_id: string | null;
          winner_name: string | null;
          enable_anti_snipe: boolean;
          reserve_met: boolean;
          is_live_stream: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['auctions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['auctions']['Insert']>;
      };
      bids: {
        Row: {
          id: string;
          auction_id: string;
          bidder_id: string;
          bidder_name: string;
          amount: number;
          status: 'winning' | 'outbid' | 'cancelled';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bids']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          auction_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['watchlist']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['watchlist']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          auction_id: string;
          user_id: string;
          user_name: string;
          message: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
    };
  };
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.error_description) {
    return error.error_description;
  }
  return 'An unexpected error occurred';
}

console.log(isDemoMode
  ? '⚠️ Running in DEMO mode (Supabase not configured)'
  : '✅ Supabase connected'
);
