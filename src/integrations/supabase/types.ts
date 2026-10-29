export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      delivery_areas: {
        Row: {
          enabled: boolean;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          enabled?: boolean;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          enabled?: boolean;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      meal_slots: {
        Row: {
          available: boolean;
          label: string;
          slot: string;
          sort_order: number;
        };
        Insert: {
          available?: boolean;
          label: string;
          slot: string;
          sort_order: number;
        };
        Update: {
          available?: boolean;
          label?: string;
          slot?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      menu_extras: {
        Row: {
          available: boolean;
          id: string;
          name: string;
          price: number;
          sort_order: number;
        };
        Insert: {
          available?: boolean;
          id?: string;
          name: string;
          price: number;
          sort_order?: number;
        };
        Update: {
          available?: boolean;
          id?: string;
          name?: string;
          price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          available: boolean;
          created_at: string;
          description: string;
          id: string;
          image_key: string | null;
          name: string;
          price: number;
          sort_order: number;
        };
        Insert: {
          available?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          image_key?: string | null;
          name: string;
          price: number;
          sort_order?: number;
        };
        Update: {
          available?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          image_key?: string | null;
          name?: string;
          price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          event_type: string;
          id: string;
          order_id: string | null;
          read_at: string | null;
          recipient_id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          event_type: string;
          id?: string;
          order_id?: string | null;
          read_at?: string | null;
          recipient_id: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          order_id?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          extras: Json;
          id: string;
          line_total: number;
          menu_item_id: string | null;
          name: string;
          order_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          extras?: Json;
          id?: string;
          line_total: number;
          menu_item_id?: string | null;
          name: string;
          order_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          extras?: Json;
          id?: string;
          line_total?: number;
          menu_item_id?: string | null;
          name?: string;
          order_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: string;
          cancelled_at: string | null;
          confirmed_at: string | null;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          delivery_area_id: string | null;
          delivery_area_name: string;
          delivery_date: string;
          delivery_fee: number;
          id: string;
          meal_slot: string;
          notes: string | null;
          order_number: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          user_id: string;
        };
        Insert: {
          address: string;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          delivery_area_id?: string | null;
          delivery_area_name: string;
          delivery_date?: string;
          delivery_fee?: number;
          id?: string;
          meal_slot?: string;
          notes?: string | null;
          order_number?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          user_id: string;
        };
        Update: {
          address?: string;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          delivery_area_id?: string | null;
          delivery_area_name?: string;
          delivery_date?: string;
          delivery_fee?: number;
          id?: string;
          meal_slot?: string;
          notes?: string | null;
          order_number?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_delivery_area_id_fkey";
            columns: ["delivery_area_id"];
            isOneToOne: false;
            referencedRelation: "delivery_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_meal_slot_fkey";
            columns: ["meal_slot"];
            isOneToOne: false;
            referencedRelation: "meal_slots";
            referencedColumns: ["slot"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          order_id: string;
          receipt_path: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          submitted_at: string | null;
          transaction_ref: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          order_id: string;
          receipt_path?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          submitted_at?: string | null;
          transaction_ref?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          order_id?: string;
          receipt_path?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          submitted_at?: string | null;
          transaction_ref?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      refund_requests: {
        Row: {
          account_number: string;
          admin_note: string | null;
          amount: number;
          created_at: string;
          customer_decided_at: string | null;
          customer_decision: string | null;
          follow_up_admin_note: string | null;
          follow_up_note: string | null;
          follow_up_requested_at: string | null;
          follow_up_resolved_at: string | null;
          follow_up_status: string | null;
          id: string;
          method: string;
          order_id: string;
          payment_id: string;
          proof_path: string | null;
          reason: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          reviewed_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          account_number: string;
          admin_note?: string | null;
          amount: number;
          created_at?: string;
          customer_decided_at?: string | null;
          customer_decision?: string | null;
          follow_up_admin_note?: string | null;
          follow_up_note?: string | null;
          follow_up_requested_at?: string | null;
          follow_up_resolved_at?: string | null;
          follow_up_status?: string | null;
          id?: string;
          method: string;
          order_id: string;
          payment_id: string;
          proof_path?: string | null;
          reason?: string | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          reviewed_at?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          account_number?: string;
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          customer_decided_at?: string | null;
          customer_decision?: string | null;
          follow_up_admin_note?: string | null;
          follow_up_note?: string | null;
          follow_up_requested_at?: string | null;
          follow_up_resolved_at?: string | null;
          follow_up_status?: string | null;
          id?: string;
          method?: string;
          order_id?: string;
          payment_id?: string;
          proof_path?: string | null;
          reason?: string | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          reviewed_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_requests_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      place_order: {
        Args: {
          _address: string;
          _area_id: string;
          _contact_name: string;
          _contact_phone: string;
          _delivery_date: string;
          _items: Json;
          _meal_slot: string;
          _notes: string;
        };
        Returns: string;
      };
      get_delivery_schedule: {
        Args: Record<PropertyKey, never>;
        Returns: { delivery_date: string; is_open: boolean }[];
      };
      set_delivery_date_open: {
        Args: { _delivery_date: string; _is_open: boolean };
        Returns: undefined;
      };
      request_payment_refund: {
        Args: {
          _account_number: string;
          _method: string;
          _order_id: string;
          _reason: string;
        };
        Returns: string;
      };
      review_refund_request: {
        Args: { _approve: boolean; _note: string; _request_id: string };
        Returns: undefined;
      };
      complete_payment_refund: {
        Args: { _proof_path: string; _refund_reference: string; _request_id: string };
        Returns: undefined;
      };
      request_refund_follow_up: {
        Args: { _note: string; _request_id: string };
        Returns: undefined;
      };
      resolve_refund_customer_decision: {
        Args: { _decision: string; _request_id: string };
        Returns: undefined;
      };
      resolve_refund_follow_up: {
        Args: { _note: string; _request_id: string };
        Returns: undefined;
      };
      review_payment: {
        Args: { _approve: boolean; _note: string; _payment_id: string };
        Returns: undefined;
      };
      submit_payment_proof: {
        Args: {
          _method: string;
          _order_id: string;
          _receipt_path: string | null;
          _reference: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "customer";
      order_status: "pending" | "confirmed";
      payment_status: "unverified" | "verified" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      order_status: ["pending", "confirmed"],
      payment_status: ["unverified", "verified", "rejected"],
    },
  },
} as const;
