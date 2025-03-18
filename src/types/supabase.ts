export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          billing_address: Json | null
          payment_method: Json | null
          notification_preferences: Json
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          billing_address?: Json | null
          payment_method?: Json | null
          notification_preferences?: Json
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          billing_address?: Json | null
          payment_method?: Json | null
          notification_preferences?: Json
        }
      }
      products: {
        Row: {
          id: string
          active: boolean
          name: string
          description: string | null
          image: string | null
          metadata: Json | null
        }
        Insert: {
          id: string
          active?: boolean
          name: string
          description?: string | null
          image?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          active?: boolean
          name?: string
          description?: string | null
          image?: string | null
          metadata?: Json | null
        }
      }
      prices: {
        Row: {
          id: string
          product_id: string | null
          active: boolean
          description: string | null
          unit_amount: number | null
          currency: string | null
          type: string | null
          interval: string | null
          interval_count: number | null
          trial_period_days: number | null
          metadata: Json | null
        }
        Insert: {
          id: string
          product_id?: string | null
          active?: boolean
          description?: string | null
          unit_amount?: number | null
          currency?: string | null
          type?: string | null
          interval?: string | null
          interval_count?: number | null
          trial_period_days?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          product_id?: string | null
          active?: boolean
          description?: string | null
          unit_amount?: number | null
          currency?: string | null
          type?: string | null
          interval?: string | null
          interval_count?: number | null
          trial_period_days?: number | null
          metadata?: Json | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          status: string
          price_id: string
          quantity: number
          cancel_at_period_end: boolean
          created: string
          current_period_start: string
          current_period_end: string
          ended_at: string | null
          cancel_at: string | null
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          metadata: Json | null
          customer_id: string | null
        }
        Insert: {
          id: string
          user_id: string
          status: string
          price_id: string
          quantity?: number
          cancel_at_period_end?: boolean
          created?: string
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          metadata?: Json | null
          customer_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          price_id?: string
          quantity?: number
          cancel_at_period_end?: boolean
          created?: string
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          metadata?: Json | null
          customer_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}