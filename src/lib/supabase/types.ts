/**
 * Database types. Hand-maintained to mirror supabase/migrations.
 * Regenerate once a project is linked:  npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GiftStatus = "draft" | "scheduled" | "live" | "archived";
export type PurchaseStatus = "pending" | "paid" | "refunded";
export type AssetType = "photo" | "audio" | "video";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          locale: "en" | "es";
          referral_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          locale?: "en" | "es";
          referral_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string | null;
          locale?: "en" | "es";
          updated_at?: string;
        };
        Relationships: [];
      };
      gifts: {
        Row: {
          id: string;
          short_id: string;
          user_id: string;
          template_slug: string;
          data: Json;
          status: GiftStatus;
          is_premium: boolean;
          watermark: boolean;
          password_hash: string | null;
          unlock_at: string | null;
          timezone: string | null;
          locale: "en" | "es";
          created_at: string;
          updated_at: string;
          published_at: string | null;
          storage_pruned_at: string | null;
        };
        Insert: {
          id?: string;
          short_id: string;
          user_id: string;
          template_slug: string;
          data?: Json;
          status?: GiftStatus;
          is_premium?: boolean;
          watermark?: boolean;
          password_hash?: string | null;
          unlock_at?: string | null;
          timezone?: string | null;
          locale?: "en" | "es";
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          storage_pruned_at?: string | null;
        };
        Update: {
          template_slug?: string;
          data?: Json;
          status?: GiftStatus;
          is_premium?: boolean;
          watermark?: boolean;
          password_hash?: string | null;
          unlock_at?: string | null;
          timezone?: string | null;
          locale?: "en" | "es";
          updated_at?: string;
          published_at?: string | null;
          storage_pruned_at?: string | null;
        };
        Relationships: [];
      };
      gift_assets: {
        Row: {
          id: string;
          gift_id: string;
          type: AssetType;
          path: string;
          order: number;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          gift_id: string;
          type: AssetType;
          path: string;
          order?: number;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          type?: AssetType;
          path?: string;
          order?: number;
          meta?: Json;
        };
        Relationships: [];
      };
      gift_views: {
        Row: {
          id: string;
          gift_id: string;
          viewer_hash: string;
          opened_at: string;
          watch_pct: number;
          device: string | null;
        };
        Insert: {
          id?: string;
          gift_id: string;
          viewer_hash: string;
          opened_at?: string;
          watch_pct?: number;
          device?: string | null;
        };
        Update: { watch_pct?: number };
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          gift_id: string;
          emoji: string;
          text: string | null;
          audio_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gift_id: string;
          emoji: string;
          text?: string | null;
          audio_path?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          product: string;
          template_slugs: string[];
          amount: number;
          currency: string;
          status: PurchaseStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          product: string;
          template_slugs?: string[];
          amount: number;
          currency?: string;
          status?: PurchaseStatus;
          created_at?: string;
        };
        Update: {
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: PurchaseStatus;
        };
        Relationships: [];
      };
      template_unlocks: {
        Row: {
          id: string;
          user_id: string;
          template_slug: string;
          purchase_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_slug: string;
          purchase_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referred_user_id: string | null;
          gift_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_user_id: string;
          referred_user_id?: string | null;
          gift_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      gift_stats: {
        Row: {
          gift_id: string;
          opens: number;
          unique_viewers: number;
          avg_watch_pct: number;
          reactions: number;
          last_opened_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_template_unlock: { Args: { p_user: string; p_slug: string }; Returns: boolean };
      gift_storage_refs: { Args: Record<string, never>; Returns: { path: string }[] };
      storage_orphans: { Args: { p_limit?: number }; Returns: { name: string; bytes: number }[] };
      purge_stale_drafts: { Args: { p_days?: number }; Returns: number };
      get_public_gift: { Args: { p_short_id: string; p_password?: string | null }; Returns: Json };
      set_gift_password: { Args: { p_gift_id: string; p_password: string | null }; Returns: undefined };
      record_gift_view: {
        Args: { p_short_id: string; p_viewer_hash: string; p_device?: string | null };
        Returns: Json;
      };
      update_gift_view_progress: { Args: { p_view_id: string; p_pct: number }; Returns: undefined };
      add_reaction: {
        Args: { p_short_id: string; p_emoji: string; p_text?: string | null; p_audio_path?: string | null };
        Returns: string;
      };
    };
    Enums: {
      gift_status: GiftStatus;
      purchase_status: PurchaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
