/**
 * Database types. Hand-maintained to mirror supabase/migrations.
 * Regenerate once a project is linked:  npm run db:types
 */
export type WentAs = "first" | "date" | "anniversary" | "birthday" | "friends";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GiftStatus = "draft" | "scheduled" | "live" | "archived";
export type PurchaseStatus = "pending" | "paid" | "refunded";
export type AssetType = "photo" | "audio" | "video";
export type ReminderOccasion = "birthday" | "anniversary" | "valentines" | "other";

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
      place_reviews: {
        Row: {
          id: string;
          place_id: string;
          user_id: string;
          stars: number;
          cost: number | null;
          went_as: WentAs | null;
          body: string | null;
          place_name: string | null;
          lat: number | null;
          lng: number | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          place_id: string;
          user_id: string;
          stars: number;
          cost?: number | null;
          went_as?: WentAs | null;
          body?: string | null;
          place_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          locale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stars?: number;
          cost?: number | null;
          went_as?: WentAs | null;
          body?: string | null;
          place_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          locale?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: { email: string; product: string; locale: string | null; created_at: string };
        Insert: { email: string; product?: string; locale?: string | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          /** Null once the buyer deleted their account: the sale is kept for the accounts (0011). */
          user_id: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          product: string;
          template_slugs: string[];
          amount: number;
          currency: string;
          status: PurchaseStatus;
          created_at: string;
          creator_code: string | null;
          ref: string | null;
          discount_amount: number | null;
          kind: string | null;
          /** The withdrawal sentence the buyer ticked at checkout, and when (0012). Null without the tickbox. */
          terms_consent: string | null;
          terms_consent_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string | null;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          product: string;
          template_slugs?: string[];
          amount: number;
          currency?: string;
          status?: PurchaseStatus;
          created_at?: string;
          creator_code?: string | null;
          ref?: string | null;
          discount_amount?: number | null;
          kind?: string | null;
          terms_consent?: string | null;
          terms_consent_at?: string | null;
        };
        Update: {
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: PurchaseStatus;
          amount?: number;
          currency?: string;
          creator_code?: string | null;
          ref?: string | null;
          discount_amount?: number | null;
          kind?: string | null;
          terms_consent?: string | null;
          terms_consent_at?: string | null;
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
        Update: { purchase_id?: string | null };
        Relationships: [];
      };
      couple_passes: {
        Row: {
          id: string;
          purchase_id: string;
          owner_user_id: string;
          partner_user_id: string | null;
          invite_code: string;
          starts_at: string;
          ends_at: string;
          renewal_reminded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          owner_user_id: string;
          partner_user_id?: string | null;
          invite_code: string;
          starts_at?: string;
          ends_at: string;
          renewal_reminded_at?: string | null;
          created_at?: string;
        };
        Update: {
          partner_user_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          renewal_reminded_at?: string | null;
        };
        Relationships: [];
      };
      gift_cards: {
        Row: {
          id: string;
          code: string;
          purchase_id: string | null;
          buyer_user_id: string | null;
          recipient_name: string | null;
          note: string | null;
          redeemed_by: string | null;
          redeemed_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          purchase_id?: string | null;
          buyer_user_id?: string | null;
          recipient_name?: string | null;
          note?: string | null;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          redeemed_by?: string | null;
          redeemed_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      creators: {
        Row: {
          code: string;
          name: string;
          contact: string | null;
          commission_pct: number;
          discount_pct: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          contact?: string | null;
          commission_pct?: number;
          discount_pct?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          contact?: string | null;
          commission_pct?: number;
          discount_pct?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          recipient_name: string;
          occasion: ReminderOccasion;
          month: number;
          day: number;
          locale: "en" | "es";
          template_slug: string | null;
          last_sent_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_name: string;
          occasion: ReminderOccasion;
          month: number;
          day: number;
          locale?: "en" | "es";
          template_slug?: string | null;
          last_sent_year?: number | null;
          created_at?: string;
        };
        Update: {
          recipient_name?: string;
          occasion?: ReminderOccasion;
          month?: number;
          day?: number;
          locale?: "en" | "es";
          template_slug?: string | null;
          last_sent_year?: number | null;
        };
        Relationships: [];
      };
      email_optouts: {
        Row: { email_sha256: string; created_at: string };
        Insert: { email_sha256: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      /** One free reply per paid premium gift answered (0012). Service role only. */
      free_replies: {
        /** reply_gift_id goes null when the reply is deleted: the gift it answered stays answered. */
        Row: { original_gift_id: string; reply_gift_id: string | null; created_at: string };
        Insert: { original_gift_id: string; reply_gift_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      /** A gift card's name and note between checkout and fulfilment, never sent to Stripe (0012). Service role only. */
      gift_card_details: {
        Row: { purchase_id: string; recipient_name: string | null; note: string | null; created_at: string };
        Insert: { purchase_id: string; recipient_name?: string | null; note?: string | null; created_at?: string };
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
      place_rating_summary: { Args: { ids: string[] }; Returns: { place_id: string; stars: number; reviews: number; cost: number | null }[] };
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
