export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      copy_subscriptions: {
        Row: {
          allocation: number
          id: string
          max_open_positions: number
          max_trade_size: number
          risk_multiplier: number
          started_at: string
          status: string
          stop_loss: number
          total_pnl: number | null
          trader_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation?: number
          id?: string
          max_open_positions?: number
          max_trade_size?: number
          risk_multiplier?: number
          started_at?: string
          status?: string
          stop_loss?: number
          total_pnl?: number | null
          trader_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation?: number
          id?: string
          max_open_positions?: number
          max_trade_size?: number
          risk_multiplier?: number
          started_at?: string
          status?: string
          stop_loss?: number
          total_pnl?: number | null
          trader_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_subscriptions_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          closed_at: string | null
          current_price: number | null
          entry_price: number
          id: string
          market_id: string
          market_title: string
          opened_at: string
          outcome: string
          pnl: number | null
          pnl_percent: number | null
          position_type: string
          size: number
          status: string
          subscription_id: string | null
          trader_id: string | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          current_price?: number | null
          entry_price: number
          id?: string
          market_id: string
          market_title: string
          opened_at?: string
          outcome: string
          pnl?: number | null
          pnl_percent?: number | null
          position_type: string
          size: number
          status?: string
          subscription_id?: string | null
          trader_id?: string | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          current_price?: number | null
          entry_price?: number
          id?: string
          market_id?: string
          market_title?: string
          opened_at?: string
          outcome?: string
          pnl?: number | null
          pnl_percent?: number | null
          position_type?: string
          size?: number
          status?: string
          subscription_id?: string | null
          trader_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "copy_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      traders: {
        Row: {
          active_positions: number | null
          address: string
          avatar_url: string | null
          created_at: string
          followers_count: number | null
          id: string
          is_verified: boolean | null
          last_synced_at: string | null
          risk_score: string | null
          roi_all_time: number | null
          roi_daily: number | null
          roi_monthly: number | null
          roi_weekly: number | null
          total_trades: number | null
          total_volume: number | null
          username: string | null
          win_rate: number | null
        }
        Insert: {
          active_positions?: number | null
          address: string
          avatar_url?: string | null
          created_at?: string
          followers_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          risk_score?: string | null
          roi_all_time?: number | null
          roi_daily?: number | null
          roi_monthly?: number | null
          roi_weekly?: number | null
          total_trades?: number | null
          total_volume?: number | null
          username?: string | null
          win_rate?: number | null
        }
        Update: {
          active_positions?: number | null
          address?: string
          avatar_url?: string | null
          created_at?: string
          followers_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          risk_score?: string | null
          roi_all_time?: number | null
          roi_daily?: number | null
          roi_monthly?: number | null
          roi_weekly?: number | null
          total_trades?: number | null
          total_volume?: number | null
          username?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          executed_at: string
          id: string
          market_id: string
          market_title: string
          outcome: string
          pnl: number | null
          position_id: string | null
          price: number
          size: number
          status: string
          subscription_id: string | null
          trade_type: string
          trader_id: string | null
          user_id: string | null
        }
        Insert: {
          executed_at?: string
          id?: string
          market_id: string
          market_title: string
          outcome: string
          pnl?: number | null
          position_id?: string | null
          price: number
          size: number
          status?: string
          subscription_id?: string | null
          trade_type: string
          trader_id?: string | null
          user_id?: string | null
        }
        Update: {
          executed_at?: string
          id?: string
          market_id?: string
          market_title?: string
          outcome?: string
          pnl?: number | null
          position_id?: string | null
          price?: number
          size?: number
          status?: string
          subscription_id?: string | null
          trade_type?: string
          trader_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "copy_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
