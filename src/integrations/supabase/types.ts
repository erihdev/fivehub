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
      alliance_group_orders: {
        Row: {
          alliance_id: string | null
          created_at: string | null
          deadline: string | null
          discount_applied: number | null
          final_price_per_kg: number | null
          green_coffee_id: string | null
          id: string
          product_id: string | null
          status: string | null
          total_quantity_kg: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          alliance_id?: string | null
          created_at?: string | null
          deadline?: string | null
          discount_applied?: number | null
          final_price_per_kg?: number | null
          green_coffee_id?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          total_quantity_kg: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          alliance_id?: string | null
          created_at?: string | null
          deadline?: string | null
          discount_applied?: number | null
          final_price_per_kg?: number | null
          green_coffee_id?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          total_quantity_kg?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alliance_group_orders_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "cafe_alliance_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_group_orders_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_group_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_order_contributions: {
        Row: {
          amount_due: number | null
          cafe_id: string
          created_at: string | null
          group_order_id: string | null
          id: string
          paid: boolean | null
          quantity_kg: number
        }
        Insert: {
          amount_due?: number | null
          cafe_id: string
          created_at?: string | null
          group_order_id?: string | null
          id?: string
          paid?: boolean | null
          quantity_kg: number
        }
        Update: {
          amount_due?: number | null
          cafe_id?: string
          created_at?: string | null
          group_order_id?: string | null
          id?: string
          paid?: boolean | null
          quantity_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "alliance_order_contributions_group_order_id_fkey"
            columns: ["group_order_id"]
            isOneToOne: false
            referencedRelation: "alliance_group_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at: string
          id: string
        }
        Insert: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at?: string
          id?: string
        }
        Update: {
          auction_id?: string
          bid_amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "coffee_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_commissions: {
        Row: {
          auction_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          final_price: number
          id: string
          status: string
          supplier_amount: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          auction_id: string
          commission_amount: number
          commission_rate?: number
          created_at?: string
          final_price: number
          id?: string
          status?: string
          supplier_amount: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          auction_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          final_price?: number
          id?: string
          status?: string
          supplier_amount?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_commissions_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "coffee_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      barista_certifications: {
        Row: {
          barista_email: string | null
          barista_name: string
          cafe_id: string
          certificate_url: string | null
          certification_type: string
          course_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          passed: boolean | null
          score: number | null
        }
        Insert: {
          barista_email?: string | null
          barista_name: string
          cafe_id: string
          certificate_url?: string | null
          certification_type: string
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          passed?: boolean | null
          score?: number | null
        }
        Update: {
          barista_email?: string | null
          barista_name?: string
          cafe_id?: string
          certificate_url?: string | null
          certification_type?: string
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          passed?: boolean | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "barista_certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cafe_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      blend_recipes: {
        Row: {
          ai_suggestions: Json | null
          components: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          name_ar: string | null
          target_flavor_profile: Json | null
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggestions?: Json | null
          components: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          name_ar?: string | null
          target_flavor_profile?: Json | null
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggestions?: Json | null
          components?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          name_ar?: string | null
          target_flavor_profile?: Json | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cafe_ai_recommendations: {
        Row: {
          cafe_id: string
          created_at: string | null
          green_coffee_id: string | null
          id: string
          is_acted_upon: boolean | null
          is_viewed: boolean | null
          match_score: number | null
          product_id: string | null
          reasoning: string | null
          recommendation_type: string
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          green_coffee_id?: string | null
          id?: string
          is_acted_upon?: boolean | null
          is_viewed?: boolean | null
          match_score?: number | null
          product_id?: string | null
          reasoning?: string | null
          recommendation_type: string
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          green_coffee_id?: string | null
          id?: string
          is_acted_upon?: boolean | null
          is_viewed?: boolean | null
          match_score?: number | null
          product_id?: string | null
          reasoning?: string | null
          recommendation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cafe_ai_recommendations_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_ai_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_alliance_groups: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          leader_cafe_id: string
          max_members: number | null
          min_members: number | null
          name: string
          name_ar: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          leader_cafe_id: string
          max_members?: number | null
          min_members?: number | null
          name: string
          name_ar?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          leader_cafe_id?: string
          max_members?: number | null
          min_members?: number | null
          name?: string
          name_ar?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cafe_alliance_members: {
        Row: {
          alliance_id: string | null
          cafe_id: string
          id: string
          joined_at: string | null
          role: string | null
        }
        Insert: {
          alliance_id?: string | null
          cafe_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
        }
        Update: {
          alliance_id?: string | null
          cafe_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_alliance_members_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "cafe_alliance_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_churn_alerts: {
        Row: {
          action_taken: string | null
          cafe_id: string
          created_at: string
          customer_id: string
          days_since_last_visit: number
          id: string
          is_actioned: boolean
          is_read: boolean
          risk_level: string
          suggested_action: string | null
        }
        Insert: {
          action_taken?: string | null
          cafe_id: string
          created_at?: string
          customer_id: string
          days_since_last_visit: number
          id?: string
          is_actioned?: boolean
          is_read?: boolean
          risk_level: string
          suggested_action?: string | null
        }
        Update: {
          action_taken?: string | null
          cafe_id?: string
          created_at?: string
          customer_id?: string
          days_since_last_visit?: number
          id?: string
          is_actioned?: boolean
          is_read?: boolean
          risk_level?: string
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_churn_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "cafe_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_customer_visits: {
        Row: {
          amount_spent: number | null
          cafe_id: string
          created_at: string
          customer_id: string
          id: string
          products_purchased: string[] | null
          visit_at: string
        }
        Insert: {
          amount_spent?: number | null
          cafe_id: string
          created_at?: string
          customer_id: string
          id?: string
          products_purchased?: string[] | null
          visit_at?: string
        }
        Update: {
          amount_spent?: number | null
          cafe_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          products_purchased?: string[] | null
          visit_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cafe_customer_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "cafe_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_customers: {
        Row: {
          avg_days_between_visits: number | null
          cafe_id: string
          churn_risk: string | null
          churn_risk_updated_at: string | null
          created_at: string
          customer_name: string
          email: string | null
          favorite_products: string[] | null
          first_visit_at: string
          id: string
          last_visit_at: string
          notes: string | null
          phone: string | null
          total_spent: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          avg_days_between_visits?: number | null
          cafe_id: string
          churn_risk?: string | null
          churn_risk_updated_at?: string | null
          created_at?: string
          customer_name: string
          email?: string | null
          favorite_products?: string[] | null
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          notes?: string | null
          phone?: string | null
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          avg_days_between_visits?: number | null
          cafe_id?: string
          churn_risk?: string | null
          churn_risk_updated_at?: string | null
          created_at?: string
          customer_name?: string
          email?: string | null
          favorite_products?: string[] | null
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          notes?: string | null
          phone?: string | null
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: []
      }
      cafe_equipment: {
        Row: {
          brand: string | null
          cafe_id: string
          created_at: string
          equipment_type: string
          id: string
          image_url: string | null
          model: string | null
          name: string
          name_ar: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          cafe_id: string
          created_at?: string
          equipment_type: string
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          cafe_id?: string
          created_at?: string
          equipment_type?: string
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: []
      }
      cafe_flavor_preferences: {
        Row: {
          acidity_preference: number | null
          body_preference: number | null
          cafe_id: string
          created_at: string | null
          flavor_notes: string[] | null
          id: string
          preferred_origins: string[] | null
          preferred_processes: string[] | null
          roast_level_preference: string | null
          sweetness_preference: number | null
          updated_at: string | null
        }
        Insert: {
          acidity_preference?: number | null
          body_preference?: number | null
          cafe_id: string
          created_at?: string | null
          flavor_notes?: string[] | null
          id?: string
          preferred_origins?: string[] | null
          preferred_processes?: string[] | null
          roast_level_preference?: string | null
          sweetness_preference?: number | null
          updated_at?: string | null
        }
        Update: {
          acidity_preference?: number | null
          body_preference?: number | null
          cafe_id?: string
          created_at?: string | null
          flavor_notes?: string[] | null
          id?: string
          preferred_origins?: string[] | null
          preferred_processes?: string[] | null
          roast_level_preference?: string | null
          sweetness_preference?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cafe_inventory: {
        Row: {
          auto_reorder: boolean | null
          auto_reorder_quantity_kg: number | null
          cafe_id: string
          created_at: string | null
          id: string
          last_restocked_at: string | null
          min_alert_quantity_kg: number | null
          min_quantity_kg: number | null
          product_id: string | null
          product_name: string
          quantity_kg: number
          sold_quantity_kg: number | null
          total_quantity_kg: number | null
          updated_at: string | null
          warning_quantity_kg: number | null
        }
        Insert: {
          auto_reorder?: boolean | null
          auto_reorder_quantity_kg?: number | null
          cafe_id: string
          created_at?: string | null
          id?: string
          last_restocked_at?: string | null
          min_alert_quantity_kg?: number | null
          min_quantity_kg?: number | null
          product_id?: string | null
          product_name: string
          quantity_kg?: number
          sold_quantity_kg?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
          warning_quantity_kg?: number | null
        }
        Update: {
          auto_reorder?: boolean | null
          auto_reorder_quantity_kg?: number | null
          cafe_id?: string
          created_at?: string | null
          id?: string
          last_restocked_at?: string | null
          min_alert_quantity_kg?: number | null
          min_quantity_kg?: number | null
          product_id?: string | null
          product_name?: string
          quantity_kg?: number
          sold_quantity_kg?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
          warning_quantity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_loyalty_points: {
        Row: {
          cafe_id: string
          created_at: string | null
          id: string
          points_balance: number | null
          tier: string | null
          total_points_earned: number | null
          total_points_redeemed: number | null
          updated_at: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          id?: string
          points_balance?: number | null
          tier?: string | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          updated_at?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          id?: string
          points_balance?: number | null
          tier?: string | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cafe_loyalty_transactions: {
        Row: {
          cafe_id: string
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          transaction_type: string
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          transaction_type: string
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cafe_loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cafe_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_market_insights: {
        Row: {
          avg_coffee_price: number | null
          avg_order_frequency: number | null
          city: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          popular_products: Json | null
          top_coffee_origins: string[] | null
          top_roast_levels: string[] | null
          total_cafes_analyzed: number | null
        }
        Insert: {
          avg_coffee_price?: number | null
          avg_order_frequency?: number | null
          city: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          popular_products?: Json | null
          top_coffee_origins?: string[] | null
          top_roast_levels?: string[] | null
          total_cafes_analyzed?: number | null
        }
        Update: {
          avg_coffee_price?: number | null
          avg_order_frequency?: number | null
          city?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          popular_products?: Json | null
          top_coffee_origins?: string[] | null
          top_roast_levels?: string[] | null
          total_cafes_analyzed?: number | null
        }
        Relationships: []
      }
      cafe_order_items: {
        Row: {
          created_at: string | null
          green_coffee_id: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity_kg: number
          roast_level: string | null
          roaster_id: string | null
          supplier_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          green_coffee_id?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity_kg: number
          roast_level?: string | null
          roaster_id?: string | null
          supplier_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          green_coffee_id?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity_kg?: number
          roast_level?: string | null
          roaster_id?: string | null
          supplier_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cafe_order_items_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cafe_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cafe_order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_orders: {
        Row: {
          cafe_id: string
          created_at: string | null
          currency: string | null
          delivery_address: string | null
          id: string
          notes: string | null
          order_type: string
          status: string | null
          subscription_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          currency?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_type: string
          status?: string | null
          subscription_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          currency?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          status?: string | null
          subscription_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "cafe_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_subscriptions: {
        Row: {
          cafe_id: string
          created_at: string | null
          delivery_day: number | null
          discount_percentage: number | null
          frequency: string
          id: string
          next_delivery_date: string | null
          product_id: string
          quantity_kg: number
          roaster_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          delivery_day?: number | null
          discount_percentage?: number | null
          frequency: string
          id?: string
          next_delivery_date?: string | null
          product_id: string
          quantity_kg: number
          roaster_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          delivery_day?: number | null
          discount_percentage?: number | null
          frequency?: string
          id?: string
          next_delivery_date?: string | null
          product_id?: string
          quantity_kg?: number
          roaster_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_supply_requests: {
        Row: {
          awarded_bid_id: string | null
          cafe_id: string
          coffee_type: string
          created_at: string
          currency: string | null
          deadline: string
          delivery_location: string | null
          description: string | null
          id: string
          max_price_per_kg: number | null
          origin_preference: string | null
          quantity_kg: number
          status: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          awarded_bid_id?: string | null
          cafe_id: string
          coffee_type: string
          created_at?: string
          currency?: string | null
          deadline: string
          delivery_location?: string | null
          description?: string | null
          id?: string
          max_price_per_kg?: number | null
          origin_preference?: string | null
          quantity_kg: number
          status?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          awarded_bid_id?: string | null
          cafe_id?: string
          coffee_type?: string
          created_at?: string
          currency?: string | null
          deadline?: string
          delivery_location?: string | null
          description?: string | null
          id?: string
          max_price_per_kg?: number | null
          origin_preference?: string | null
          quantity_kg?: number
          status?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cafe_supply_requests_awarded_bid_fkey"
            columns: ["awarded_bid_id"]
            isOneToOne: false
            referencedRelation: "supply_request_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_training_registrations: {
        Row: {
          cafe_id: string
          id: string
          registered_at: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          cafe_id: string
          id?: string
          registered_at?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          cafe_id?: string
          id?: string
          registered_at?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_training_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cafe_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_training_sessions: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          max_participants: number | null
          price: number | null
          roaster_id: string
          scheduled_at: string
          session_type: string | null
          status: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          max_participants?: number | null
          price?: number | null
          roaster_id: string
          scheduled_at: string
          session_type?: string | null
          status?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          max_participants?: number | null
          price?: number | null
          roaster_id?: string
          scheduled_at?: string
          session_type?: string | null
          status?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          coffee_id: string
          created_at: string
          id: string
          quantity_kg: number
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coffee_id: string
          created_at?: string
          id?: string
          quantity_kg?: number
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coffee_id?: string
          created_at?: string
          id?: string
          quantity_kg?: number
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_auctions: {
        Row: {
          admin_notes: string | null
          approval_status: string | null
          coffee_id: string | null
          created_at: string
          currency: string | null
          current_price: number
          description: string | null
          description_ar: string | null
          end_time: string
          id: string
          image_url: string | null
          min_increment: number
          platform_commission_amount: number | null
          platform_commission_rate: number | null
          quantity_kg: number
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string
          starting_price: number
          status: string
          supplier_id: string
          title: string
          title_ar: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string | null
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          current_price: number
          description?: string | null
          description_ar?: string | null
          end_time: string
          id?: string
          image_url?: string | null
          min_increment?: number
          platform_commission_amount?: number | null
          platform_commission_rate?: number | null
          quantity_kg: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time: string
          starting_price: number
          status?: string
          supplier_id: string
          title: string
          title_ar?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string | null
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          current_price?: number
          description?: string | null
          description_ar?: string | null
          end_time?: string
          id?: string
          image_url?: string | null
          min_increment?: number
          platform_commission_amount?: number | null
          platform_commission_rate?: number | null
          quantity_kg?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string
          starting_price?: number
          status?: string
          supplier_id?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_auctions_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_auctions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_offerings: {
        Row: {
          altitude: string | null
          available: boolean | null
          created_at: string
          currency: string | null
          flavor: string | null
          id: string
          kg_per_bag: number | null
          min_alert_quantity_kg: number | null
          name: string
          origin: string | null
          price: number | null
          process: string | null
          region: string | null
          score: number | null
          sold_quantity_kg: number | null
          source_pdf: string | null
          supplier_id: string
          total_quantity_kg: number | null
          unit_type: string | null
          updated_at: string
          variety: string | null
          warning_quantity_kg: number | null
        }
        Insert: {
          altitude?: string | null
          available?: boolean | null
          created_at?: string
          currency?: string | null
          flavor?: string | null
          id?: string
          kg_per_bag?: number | null
          min_alert_quantity_kg?: number | null
          name: string
          origin?: string | null
          price?: number | null
          process?: string | null
          region?: string | null
          score?: number | null
          sold_quantity_kg?: number | null
          source_pdf?: string | null
          supplier_id: string
          total_quantity_kg?: number | null
          unit_type?: string | null
          updated_at?: string
          variety?: string | null
          warning_quantity_kg?: number | null
        }
        Update: {
          altitude?: string | null
          available?: boolean | null
          created_at?: string
          currency?: string | null
          flavor?: string | null
          id?: string
          kg_per_bag?: number | null
          min_alert_quantity_kg?: number | null
          name?: string
          origin?: string | null
          price?: number | null
          process?: string | null
          region?: string | null
          score?: number | null
          sold_quantity_kg?: number | null
          source_pdf?: string | null
          supplier_id?: string
          total_quantity_kg?: number | null
          unit_type?: string | null
          updated_at?: string
          variety?: string | null
          warning_quantity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_offerings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_resale: {
        Row: {
          admin_notes: string | null
          approval_status: string | null
          buyer_id: string | null
          contract_accepted: boolean | null
          contract_accepted_at: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          images: string[] | null
          origin: string | null
          original_coffee_id: string | null
          platform_commission_amount: number | null
          platform_commission_rate: number | null
          price_per_kg: number
          process: string | null
          quantity_kg: number
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roast_date: string | null
          seller_confirmed: boolean | null
          seller_confirmed_at: string | null
          seller_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string | null
          buyer_id?: string | null
          contract_accepted?: boolean | null
          contract_accepted_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          origin?: string | null
          original_coffee_id?: string | null
          platform_commission_amount?: number | null
          platform_commission_rate?: number | null
          price_per_kg: number
          process?: string | null
          quantity_kg: number
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roast_date?: string | null
          seller_confirmed?: boolean | null
          seller_confirmed_at?: string | null
          seller_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string | null
          buyer_id?: string | null
          contract_accepted?: boolean | null
          contract_accepted_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          origin?: string | null
          original_coffee_id?: string | null
          platform_commission_amount?: number | null
          platform_commission_rate?: number | null
          price_per_kg?: number
          process?: string | null
          quantity_kg?: number
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roast_date?: string | null
          seller_confirmed?: boolean | null
          seller_confirmed_at?: string | null
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_resale_original_coffee_id_fkey"
            columns: ["original_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_notification_logs: {
        Row: {
          alert_type: string
          commission_amount: number
          created_at: string
          email_sent_to: string | null
          error_message: string | null
          id: string
          notification_channel: string
          status: string
          supplier_name: string | null
          threshold: number
          total_amount: number
          user_id: string
        }
        Insert: {
          alert_type: string
          commission_amount: number
          created_at?: string
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          notification_channel: string
          status?: string
          supplier_name?: string | null
          threshold: number
          total_amount: number
          user_id: string
        }
        Update: {
          alert_type?: string
          commission_amount?: number
          created_at?: string
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          notification_channel?: string
          status?: string
          supplier_name?: string | null
          threshold?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      commission_refunds: {
        Row: {
          admin_notes: string | null
          bank_details: Json | null
          contract_id: string
          created_at: string
          id: string
          original_amount: number
          processed_at: string | null
          processed_by: string | null
          refund_amount: number
          refund_method: string | null
          refund_reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          bank_details?: Json | null
          contract_id: string
          created_at?: string
          id?: string
          original_amount: number
          processed_at?: string | null
          processed_by?: string | null
          refund_amount: number
          refund_method?: string | null
          refund_reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          bank_details?: Json | null
          contract_id?: string
          created_at?: string
          id?: string
          original_amount?: number
          processed_at?: string | null
          processed_by?: string | null
          refund_amount?: number
          refund_method?: string | null
          refund_reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_refunds_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "direct_supply_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_report_settings: {
        Row: {
          created_at: string
          email_override: string | null
          enabled: boolean
          id: string
          last_sent_at: string | null
          report_day: number
          report_hour: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_override?: string | null
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          report_day?: number
          report_hour?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_override?: string | null
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          report_day?: number
          report_hour?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          created_at: string
          id: string
          roaster_rate: number
          supplier_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          roaster_rate?: number
          supplier_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          roaster_rate?: number
          supplier_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          created_at: string
          id: string
          order_id: string
          order_total: number
          roaster_commission: number
          roaster_id: string
          roaster_rate: number
          status: string
          supplier_commission: number
          supplier_id: string
          supplier_rate: number
          total_commission: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          order_total: number
          roaster_commission: number
          roaster_id: string
          roaster_rate: number
          status?: string
          supplier_commission: number
          supplier_id: string
          supplier_rate: number
          total_commission: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          order_total?: number
          roaster_commission?: number
          roaster_id?: string
          roaster_rate?: number
          status?: string
          supplier_commission?: number
          supplier_id?: string
          supplier_rate?: number
          total_commission?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_intelligence_reports: {
        Row: {
          cafe_id: string
          generated_at: string | null
          id: string
          insights: string[] | null
          recommendations: string[] | null
          report_data: Json | null
          report_type: string
        }
        Insert: {
          cafe_id: string
          generated_at?: string | null
          id?: string
          insights?: string[] | null
          recommendations?: string[] | null
          report_data?: Json | null
          report_type: string
        }
        Update: {
          cafe_id?: string
          generated_at?: string | null
          id?: string
          insights?: string[] | null
          recommendations?: string[] | null
          report_data?: Json | null
          report_type?: string
        }
        Relationships: []
      }
      contract_copies: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          pdf_url: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_copies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "direct_supply_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      cupping_sessions: {
        Row: {
          acidity_score: number | null
          aftertaste_score: number | null
          aroma_score: number | null
          balance_score: number | null
          body_score: number | null
          coffee_id: string | null
          created_at: string
          flavor_score: number | null
          id: string
          notes: string | null
          overall_score: number | null
          session_date: string
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acidity_score?: number | null
          aftertaste_score?: number | null
          aroma_score?: number | null
          balance_score?: number | null
          body_score?: number | null
          coffee_id?: string | null
          created_at?: string
          flavor_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          session_date?: string
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acidity_score?: number | null
          aftertaste_score?: number | null
          aroma_score?: number | null
          balance_score?: number | null
          body_score?: number | null
          coffee_id?: string | null
          created_at?: string
          flavor_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          session_date?: string
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupping_sessions_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roast_requests: {
        Row: {
          cafe_id: string
          created_at: string | null
          expected_delivery: string | null
          green_coffee_id: string | null
          id: string
          price_per_kg: number | null
          quantity_kg: number
          roast_date: string | null
          roast_level: string
          roaster_id: string
          special_instructions: string | null
          status: string | null
          target_flavor_notes: string[] | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          expected_delivery?: string | null
          green_coffee_id?: string | null
          id?: string
          price_per_kg?: number | null
          quantity_kg: number
          roast_date?: string | null
          roast_level: string
          roaster_id: string
          special_instructions?: string | null
          status?: string | null
          target_flavor_notes?: string[] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          expected_delivery?: string | null
          green_coffee_id?: string | null
          id?: string
          price_per_kg?: number | null
          quantity_kg?: number
          roast_date?: string | null
          roast_level?: string
          roaster_id?: string
          special_instructions?: string | null
          status?: string | null
          target_flavor_notes?: string[] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roast_requests_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_shipment_notifications: {
        Row: {
          created_at: string
          customer_id: string
          email_sent_to: string | null
          error_message: string | null
          estimated_arrival: string | null
          id: string
          message: string | null
          notification_type: string
          order_id: string
          shipment_status: string
          status: string
          supplier_id: string
          tracking_number: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email_sent_to?: string | null
          error_message?: string | null
          estimated_arrival?: string | null
          id?: string
          message?: string | null
          notification_type?: string
          order_id: string
          shipment_status: string
          status?: string
          supplier_id: string
          tracking_number?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email_sent_to?: string | null
          error_message?: string | null
          estimated_arrival?: string | null
          id?: string
          message?: string | null
          notification_type?: string
          order_id?: string
          shipment_status?: string
          status?: string
          supplier_id?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_shipment_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_shipment_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delayed_shipment_alert_preferences: {
        Row: {
          check_interval_hours: number
          created_at: string
          days_threshold: number
          email_enabled: boolean
          enabled: boolean
          id: string
          push_enabled: boolean
          report_hour: number
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          check_interval_hours?: number
          created_at?: string
          days_threshold?: number
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          report_hour?: number
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          check_interval_hours?: number
          created_at?: string
          days_threshold?: number
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          report_hour?: number
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delayed_shipment_logs: {
        Row: {
          created_at: string
          days_delayed: number
          error_message: string | null
          id: string
          notification_channel: string
          order_id: string
          status: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_delayed: number
          error_message?: string | null
          id?: string
          notification_channel: string
          order_id: string
          status?: string
          supplier_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_delayed?: number
          error_message?: string | null
          id?: string
          notification_channel?: string
          order_id?: string
          status?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delayed_shipment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delayed_shipment_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_supply_contracts: {
        Row: {
          auto_cancelled_at: string | null
          buyer_id: string
          buyer_role: string
          buyer_signature: string | null
          buyer_signed_at: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          commission_confirmed_at: string | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          commission_payment_method: string | null
          commission_refund_method: string | null
          commission_refund_processed_at: string | null
          commission_refund_receipt: string | null
          commission_refund_requested_at: string | null
          commission_refund_status: string | null
          commission_transfer_receipt: string | null
          contract_number: string | null
          created_at: string
          currency: string | null
          id: string
          items: Json
          notes: string | null
          order_type: string
          platform_commission_amount: number
          platform_commission_rate: number
          platform_signature: string | null
          platform_signed_at: string | null
          platform_signed_by: string | null
          seller_id: string
          seller_payment_confirmed: boolean | null
          seller_payment_confirmed_at: string | null
          seller_rejection_reason: string | null
          seller_response_deadline: string | null
          seller_role: string
          seller_signature: string | null
          seller_signed_at: string | null
          seller_transfer_receipt: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          auto_cancelled_at?: string | null
          buyer_id: string
          buyer_role: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          commission_confirmed_at?: string | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_payment_method?: string | null
          commission_refund_method?: string | null
          commission_refund_processed_at?: string | null
          commission_refund_receipt?: string | null
          commission_refund_requested_at?: string | null
          commission_refund_status?: string | null
          commission_transfer_receipt?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type: string
          platform_commission_amount: number
          platform_commission_rate?: number
          platform_signature?: string | null
          platform_signed_at?: string | null
          platform_signed_by?: string | null
          seller_id: string
          seller_payment_confirmed?: boolean | null
          seller_payment_confirmed_at?: string | null
          seller_rejection_reason?: string | null
          seller_response_deadline?: string | null
          seller_role: string
          seller_signature?: string | null
          seller_signed_at?: string | null
          seller_transfer_receipt?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          auto_cancelled_at?: string | null
          buyer_id?: string
          buyer_role?: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          commission_confirmed_at?: string | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          commission_payment_method?: string | null
          commission_refund_method?: string | null
          commission_refund_processed_at?: string | null
          commission_refund_receipt?: string | null
          commission_refund_requested_at?: string | null
          commission_refund_status?: string | null
          commission_transfer_receipt?: string | null
          contract_number?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string
          platform_commission_amount?: number
          platform_commission_rate?: number
          platform_signature?: string | null
          platform_signed_at?: string | null
          platform_signed_by?: string | null
          seller_id?: string
          seller_payment_confirmed?: boolean | null
          seller_payment_confirmed_at?: string | null
          seller_rejection_reason?: string | null
          seller_response_deadline?: string | null
          seller_role?: string
          seller_signature?: string | null
          seller_signed_at?: string | null
          seller_transfer_receipt?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      equipment_maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string
          currency: string | null
          equipment_id: string
          id: string
          next_scheduled_at: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          schedule_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          equipment_id: string
          id?: string
          next_scheduled_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          schedule_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          equipment_id?: string
          id?: string
          next_scheduled_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "cafe_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "equipment_maintenance_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance_schedules: {
        Row: {
          created_at: string
          description: string | null
          equipment_id: string
          frequency_days: number
          id: string
          is_critical: boolean | null
          last_completed_at: string | null
          next_due_at: string
          reminder_days_before: number | null
          task_name: string
          task_name_ar: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_id: string
          frequency_days: number
          id?: string
          is_critical?: boolean | null
          last_completed_at?: string | null
          next_due_at: string
          reminder_days_before?: number | null
          task_name: string
          task_name_ar?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_id?: string
          frequency_days?: number
          id?: string
          is_critical?: boolean | null
          last_completed_at?: string | null
          next_due_at?: string
          reminder_days_before?: number | null
          task_name?: string
          task_name_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "cafe_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_service_requests: {
        Row: {
          cafe_id: string
          cafe_rating: number | null
          completed_at: string | null
          created_at: string
          currency: string | null
          equipment_id: string
          estimated_cost: number | null
          final_cost: number | null
          id: string
          issue_description: string | null
          issue_title: string
          maintenance_provider_id: string | null
          scheduled_visit_at: string | null
          status: string | null
          technician_notes: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          cafe_id: string
          cafe_rating?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          equipment_id: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description?: string | null
          issue_title: string
          maintenance_provider_id?: string | null
          scheduled_visit_at?: string | null
          status?: string | null
          technician_notes?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          cafe_id?: string
          cafe_rating?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          equipment_id?: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          issue_description?: string | null
          issue_title?: string
          maintenance_provider_id?: string | null
          scheduled_visit_at?: string | null
          status?: string | null
          technician_notes?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "cafe_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          buyer_id: string
          buyer_paid_at: string | null
          contract_id: string | null
          created_at: string
          currency: string
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          platform_commission: number
          release_approved_by: string | null
          released_at: string | null
          seller_amount: number
          seller_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_paid_at?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          platform_commission: number
          release_approved_by?: string | null
          released_at?: string | null
          seller_amount: number
          seller_id: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_paid_at?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          platform_commission?: number
          release_approved_by?: string | null
          released_at?: string | null
          seller_amount?: number
          seller_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "direct_supply_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusive_coffee_access: {
        Row: {
          access_type: string | null
          available_quantity_kg: number | null
          coffee_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          min_loyalty_tier: string | null
          release_date: string | null
          reserved_quantity_kg: number | null
        }
        Insert: {
          access_type?: string | null
          available_quantity_kg?: number | null
          coffee_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          min_loyalty_tier?: string | null
          release_date?: string | null
          reserved_quantity_kg?: number | null
        }
        Update: {
          access_type?: string | null
          available_quantity_kg?: number | null
          coffee_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          min_loyalty_tier?: string | null
          release_date?: string | null
          reserved_quantity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exclusive_coffee_access_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_crop_offers: {
        Row: {
          altitude: string | null
          created_at: string
          crop_name: string
          crop_name_ar: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          farm_id: string
          harvest_date: string | null
          id: string
          images: string[] | null
          price_per_kg: number | null
          processing_method: string | null
          quantity_kg: number
          status: string | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          altitude?: string | null
          created_at?: string
          crop_name: string
          crop_name_ar?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          farm_id: string
          harvest_date?: string | null
          id?: string
          images?: string[] | null
          price_per_kg?: number | null
          processing_method?: string | null
          quantity_kg: number
          status?: string | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          altitude?: string | null
          created_at?: string
          crop_name?: string
          crop_name_ar?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          farm_id?: string
          harvest_date?: string | null
          id?: string
          images?: string[] | null
          price_per_kg?: number | null
          processing_method?: string | null
          quantity_kg?: number
          status?: string | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: []
      }
      farm_supplier_links: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          notes: string | null
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          notes?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_supplier_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_offers_summary_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          push_enabled: boolean
          summary_hour: number
          timezone: string
          updated_at: string
          user_id: string
          weekly_day: number
          weekly_enabled: boolean
          weekly_hour: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          summary_hour?: number
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_hour?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          summary_hour?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_hour?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          coffee_id: string
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          coffee_id: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          coffee_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_contracts: {
        Row: {
          buyer_id: string
          buyer_signature: string | null
          buyer_signed_at: string | null
          created_at: string
          creator_id: string | null
          creator_role: string | null
          currency: string | null
          deposit_paid: boolean | null
          deposit_percentage: number | null
          expected_harvest_date: string
          id: string
          origin: string
          price_per_kg: number
          quantity_kg: number
          roaster_notes: string | null
          roaster_response: string | null
          roaster_response_at: string | null
          status: string
          supplier_id: string
          supplier_signature: string | null
          supplier_signed_at: string | null
          terms: string | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          buyer_id: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          created_at?: string
          creator_id?: string | null
          creator_role?: string | null
          currency?: string | null
          deposit_paid?: boolean | null
          deposit_percentage?: number | null
          expected_harvest_date: string
          id?: string
          origin: string
          price_per_kg: number
          quantity_kg: number
          roaster_notes?: string | null
          roaster_response?: string | null
          roaster_response_at?: string | null
          status?: string
          supplier_id: string
          supplier_signature?: string | null
          supplier_signed_at?: string | null
          terms?: string | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          buyer_id?: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          created_at?: string
          creator_id?: string | null
          creator_role?: string | null
          currency?: string | null
          deposit_paid?: boolean | null
          deposit_percentage?: number | null
          expected_harvest_date?: string
          id?: string
          origin?: string
          price_per_kg?: number
          quantity_kg?: number
          roaster_notes?: string | null
          roaster_response?: string | null
          roaster_response_at?: string | null
          status?: string
          supplier_id?: string
          supplier_signature?: string | null
          supplier_signed_at?: string | null
          terms?: string | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          auto_reorder_enabled: boolean
          auto_reorder_quantity: number
          coffee_id: string
          created_at: string
          id: string
          last_auto_reorder_at: string | null
          min_quantity_kg: number
          notes: string | null
          quantity_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reorder_enabled?: boolean
          auto_reorder_quantity?: number
          coffee_id: string
          created_at?: string
          id?: string
          last_auto_reorder_at?: string | null
          min_quantity_kg?: number
          notes?: string | null
          quantity_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reorder_enabled?: boolean
          auto_reorder_quantity?: number
          coffee_id?: string
          created_at?: string
          id?: string
          last_auto_reorder_at?: string | null
          min_quantity_kg?: number
          notes?: string | null
          quantity_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_predictions: {
        Row: {
          actual_stock_at_prediction: number
          actual_stock_at_reorder_date: number | null
          coffee_id: string
          coffee_name: string
          created_at: string
          id: string
          predicted_daily_consumption: number
          predicted_days_until_empty: number
          predicted_reorder_date: string
          prediction_accuracy: number | null
          recommended_quantity: number
          user_id: string
          verified_at: string | null
          was_accurate: boolean | null
        }
        Insert: {
          actual_stock_at_prediction: number
          actual_stock_at_reorder_date?: number | null
          coffee_id: string
          coffee_name: string
          created_at?: string
          id?: string
          predicted_daily_consumption: number
          predicted_days_until_empty: number
          predicted_reorder_date: string
          prediction_accuracy?: number | null
          recommended_quantity: number
          user_id: string
          verified_at?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          actual_stock_at_prediction?: number
          actual_stock_at_reorder_date?: number | null
          coffee_id?: string
          coffee_name?: string
          created_at?: string
          id?: string
          predicted_daily_consumption?: number
          predicted_days_until_empty?: number
          predicted_reorder_date?: string
          prediction_accuracy?: number | null
          recommended_quantity?: number
          user_id?: string
          verified_at?: string | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_predictions_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      live_cupping_sessions: {
        Row: {
          admin_notes: string | null
          approval_status: string
          coffee_name: string | null
          coffee_origin: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          duration_minutes: number
          host_id: string
          id: string
          max_participants: number
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string | null
          scheduled_at: string
          status: string
          thumbnail_url: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string
          coffee_name?: string | null
          coffee_origin?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          max_participants?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          scheduled_at: string
          status?: string
          thumbnail_url?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string
          coffee_name?: string | null
          coffee_origin?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          max_participants?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          scheduled_at?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          email: string
          first_attempt_at: string | null
          id: string
          ip_address: string | null
          last_attempt_at: string | null
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          email: string
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          email?: string
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      maintenance_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rater_id: string
          rating: number
          request_id: string
          technician_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id: string
          rating: number
          request_id: string
          technician_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id?: string
          rating?: number
          request_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reports: {
        Row: {
          created_at: string
          currency: string | null
          customer_signature: string | null
          diagnosis: string
          id: string
          images: string[] | null
          labor_cost: number | null
          labor_hours: number | null
          next_maintenance_date: string | null
          parts_cost: number | null
          parts_used: Json | null
          recommendations: string | null
          request_id: string
          technician_id: string
          technician_signature: string | null
          total_cost: number | null
          work_performed: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_signature?: string | null
          diagnosis: string
          id?: string
          images?: string[] | null
          labor_cost?: number | null
          labor_hours?: number | null
          next_maintenance_date?: string | null
          parts_cost?: number | null
          parts_used?: Json | null
          recommendations?: string | null
          request_id: string
          technician_id: string
          technician_signature?: string | null
          total_cost?: number | null
          work_performed: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_signature?: string | null
          diagnosis?: string
          id?: string
          images?: string[] | null
          labor_cost?: number | null
          labor_hours?: number | null
          next_maintenance_date?: string | null
          parts_cost?: number | null
          parts_used?: Json | null
          recommendations?: string | null
          request_id?: string
          technician_id?: string
          technician_signature?: string | null
          total_cost?: number | null
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          completed_date: string | null
          created_at: string
          equipment_brand: string | null
          equipment_model: string | null
          equipment_type: string
          id: string
          images: string[] | null
          issue_description: string
          issue_description_ar: string | null
          notes: string | null
          requester_id: string
          requester_type: string
          scheduled_date: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          equipment_brand?: string | null
          equipment_model?: string | null
          equipment_type: string
          id?: string
          images?: string[] | null
          issue_description: string
          issue_description_ar?: string | null
          notes?: string | null
          requester_id: string
          requester_type: string
          scheduled_date?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          equipment_brand?: string | null
          equipment_model?: string | null
          equipment_type?: string
          id?: string
          images?: string[] | null
          issue_description?: string
          issue_description_ar?: string | null
          notes?: string | null
          requester_id?: string
          requester_type?: string
          scheduled_date?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          parent_id: string | null
          receiver_id: string
          sender_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          parent_id?: string | null
          receiver_id: string
          sender_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          parent_id?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_report_logs: {
        Row: {
          badges_count: number | null
          email_sent_to: string | null
          error_message: string | null
          id: string
          performance_score: number | null
          platform_avg_score: number | null
          rank: number
          report_month: string
          sent_at: string
          status: string
          supplier_id: string
          total_suppliers: number
        }
        Insert: {
          badges_count?: number | null
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          performance_score?: number | null
          platform_avg_score?: number | null
          rank: number
          report_month: string
          sent_at?: string
          status?: string
          supplier_id: string
          total_suppliers: number
        }
        Update: {
          badges_count?: number | null
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          performance_score?: number | null
          platform_avg_score?: number | null
          rank?: number
          report_month?: string
          sent_at?: string
          status?: string
          supplier_id?: string
          total_suppliers?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_report_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_supplier_awards: {
        Row: {
          award_month: string
          award_name: string
          award_type: string
          created_at: string
          id: string
          notified_at: string | null
          performance_score: number | null
          prize_description: string | null
          rank: number | null
          supplier_id: string
        }
        Insert: {
          award_month: string
          award_name: string
          award_type: string
          created_at?: string
          id?: string
          notified_at?: string | null
          performance_score?: number | null
          prize_description?: string | null
          rank?: number | null
          supplier_id: string
        }
        Update: {
          award_month?: string
          award_name?: string
          award_type?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          performance_score?: number | null
          prize_description?: string | null
          rank?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_supplier_awards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_retry_logs: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_data: Json | null
          notification_type: string
          original_notification_id: string
          status: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_data?: Json | null
          notification_type?: string
          original_notification_id: string
          status?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_data?: Json | null
          notification_type?: string
          original_notification_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_expiry_alert_preferences: {
        Row: {
          created_at: string
          days_before: number
          enabled: boolean
          id: string
          push_enabled: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before?: number
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_expiry_notifications: {
        Row: {
          days_remaining: number
          id: string
          notification_type: string
          offer_id: string
          offer_title: string
          sent_at: string
          supplier_name: string | null
          user_id: string
        }
        Insert: {
          days_remaining: number
          id?: string
          notification_type?: string
          offer_id: string
          offer_title: string
          sent_at?: string
          supplier_name?: string | null
          user_id: string
        }
        Update: {
          days_remaining?: number
          id?: string
          notification_type?: string
          offer_id?: string
          offer_title?: string
          sent_at?: string
          supplier_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offer_favorites: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "supplier_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery: string | null
          coffee_id: string | null
          created_at: string
          currency: string | null
          escrow_id: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          payment_status: string | null
          price_per_kg: number | null
          quantity_kg: number
          rated: boolean | null
          status: string
          supplier_id: string
          total_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_delivery?: string | null
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          escrow_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_status?: string | null
          price_per_kg?: number | null
          quantity_kg: number
          rated?: boolean | null
          status?: string
          supplier_id: string
          total_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_delivery?: string | null
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          escrow_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_status?: string | null
          price_per_kg?: number | null
          quantity_kg?: number
          rated?: boolean | null
          status?: string
          supplier_id?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_milestones: {
        Row: {
          created_at: string
          discount_earned: number | null
          id: string
          milestone_type: string
          new_tier: string | null
          notes: string | null
          old_tier: string | null
          order_id: string | null
          partnership_id: string
        }
        Insert: {
          created_at?: string
          discount_earned?: number | null
          id?: string
          milestone_type: string
          new_tier?: string | null
          notes?: string | null
          old_tier?: string | null
          order_id?: string | null
          partnership_id: string
        }
        Update: {
          created_at?: string
          discount_earned?: number | null
          id?: string
          milestone_type?: string
          new_tier?: string | null
          notes?: string | null
          old_tier?: string | null
          order_id?: string | null
          partnership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_milestones_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "roaster_cafe_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_path: string | null
          id: string
          processed: boolean | null
          raw_content: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path?: string | null
          id?: string
          processed?: boolean | null
          raw_content?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string | null
          id?: string
          processed?: boolean | null
          raw_content?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_uploads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_alert_logs: {
        Row: {
          alert_data: Json | null
          error_message: string | null
          id: string
          recipient_email: string
          score: number
          sent_at: string
          status: string
          threshold: number
          user_id: string
        }
        Insert: {
          alert_data?: Json | null
          error_message?: string | null
          id?: string
          recipient_email: string
          score: number
          sent_at?: string
          status?: string
          threshold: number
          user_id: string
        }
        Update: {
          alert_data?: Json | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          score?: number
          sent_at?: string
          status?: string
          threshold?: number
          user_id?: string
        }
        Relationships: []
      }
      performance_alert_settings: {
        Row: {
          alert_frequency: string
          alerts_enabled: boolean
          created_at: string
          custom_high_risk_body: string | null
          custom_high_risk_title: string | null
          custom_low_avg_body: string | null
          custom_low_avg_title: string | null
          custom_medium_risk_body: string | null
          custom_medium_risk_title: string | null
          daily_summary_enabled: boolean
          daily_summary_hour: number
          email_alerts: boolean
          id: string
          last_smart_check_at: string | null
          push_alerts: boolean
          push_alerts_enabled: boolean
          smart_check_days: number[] | null
          smart_check_enabled: boolean
          smart_check_hour: number
          threshold: number
          timezone: string
          updated_at: string
          user_id: string
          weekly_report_day: number | null
          weekly_report_enabled: boolean | null
          weekly_report_hour: number | null
        }
        Insert: {
          alert_frequency?: string
          alerts_enabled?: boolean
          created_at?: string
          custom_high_risk_body?: string | null
          custom_high_risk_title?: string | null
          custom_low_avg_body?: string | null
          custom_low_avg_title?: string | null
          custom_medium_risk_body?: string | null
          custom_medium_risk_title?: string | null
          daily_summary_enabled?: boolean
          daily_summary_hour?: number
          email_alerts?: boolean
          id?: string
          last_smart_check_at?: string | null
          push_alerts?: boolean
          push_alerts_enabled?: boolean
          smart_check_days?: number[] | null
          smart_check_enabled?: boolean
          smart_check_hour?: number
          threshold?: number
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean | null
          weekly_report_hour?: number | null
        }
        Update: {
          alert_frequency?: string
          alerts_enabled?: boolean
          created_at?: string
          custom_high_risk_body?: string | null
          custom_high_risk_title?: string | null
          custom_low_avg_body?: string | null
          custom_low_avg_title?: string | null
          custom_medium_risk_body?: string | null
          custom_medium_risk_title?: string | null
          daily_summary_enabled?: boolean
          daily_summary_hour?: number
          email_alerts?: boolean
          id?: string
          last_smart_check_at?: string | null
          push_alerts?: boolean
          push_alerts_enabled?: boolean
          smart_check_days?: number[] | null
          smart_check_enabled?: boolean
          smart_check_hour?: number
          threshold?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean | null
          weekly_report_hour?: number | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          coffee_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_notified_at: string | null
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          coffee_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          coffee_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          coffee_id: string
          currency: string | null
          id: string
          price: number
          recorded_at: string
        }
        Insert: {
          coffee_id: string
          currency?: string | null
          id?: string
          price: number
          recorded_at?: string
        }
        Update: {
          coffee_id?: string
          currency?: string | null
          id?: string
          price?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          business_name: string | null
          city: string | null
          commercial_registration: string | null
          commercial_registration_image: string | null
          created_at: string
          email: string | null
          full_name: string | null
          iban: string | null
          id: string
          logo_url: string | null
          national_address_image: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          commercial_registration?: string | null
          commercial_registration_image?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          national_address_image?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name?: string | null
          city?: string | null
          commercial_registration?: string | null
          commercial_registration_image?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          national_address_image?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quality_guarantees: {
        Row: {
          created_at: string | null
          id: string
          issues_reported: string[] | null
          order_id: string | null
          order_type: string | null
          quality_score: number | null
          refund_amount: number | null
          replacement_order_id: string | null
          reported_at: string | null
          resolution_status: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issues_reported?: string[] | null
          order_id?: string | null
          order_type?: string | null
          quality_score?: number | null
          refund_amount?: number | null
          replacement_order_id?: string | null
          reported_at?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issues_reported?: string[] | null
          order_id?: string | null
          order_type?: string | null
          quality_score?: number | null
          refund_amount?: number | null
          replacement_order_id?: string | null
          reported_at?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      quote_request_items: {
        Row: {
          coffee_id: string
          coffee_name: string
          created_at: string
          id: string
          origin: string | null
          quantity_kg: number
          quote_request_id: string
          supplier_total_price: number | null
          supplier_unit_price: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          coffee_id: string
          coffee_name: string
          created_at?: string
          id?: string
          origin?: string | null
          quantity_kg: number
          quote_request_id: string
          supplier_total_price?: number | null
          supplier_unit_price?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          coffee_id?: string
          coffee_name?: string
          created_at?: string
          id?: string
          origin?: string | null
          quantity_kg?: number
          quote_request_id?: string
          supplier_total_price?: number | null
          supplier_unit_price?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_items_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          accepted_at: string | null
          converted_order_id: string | null
          created_at: string
          currency: string | null
          id: string
          responded_at: string | null
          roaster_id: string
          roaster_notes: string | null
          status: string
          supplier_id: string
          supplier_notes: string | null
          supplier_total: number | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          responded_at?: string | null
          roaster_id: string
          roaster_notes?: string | null
          status?: string
          supplier_id: string
          supplier_notes?: string | null
          supplier_total?: number | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          responded_at?: string | null
          roaster_id?: string
          roaster_notes?: string | null
          status?: string
          supplier_id?: string
          supplier_notes?: string | null
          supplier_total?: number | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rare_coffee_releases: {
        Row: {
          coffee_id: string | null
          created_at: string
          description: string | null
          id: string
          min_tier: string
          priority_access_ends_at: string
          public_release_at: string | null
          remaining_quantity_kg: number
          roasted_product_id: string | null
          roaster_id: string | null
          status: string
          supplier_id: string | null
          title: string
          total_quantity_kg: number
          updated_at: string
        }
        Insert: {
          coffee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_tier?: string
          priority_access_ends_at: string
          public_release_at?: string | null
          remaining_quantity_kg: number
          roasted_product_id?: string | null
          roaster_id?: string | null
          status?: string
          supplier_id?: string | null
          title: string
          total_quantity_kg: number
          updated_at?: string
        }
        Update: {
          coffee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_tier?: string
          priority_access_ends_at?: string
          public_release_at?: string | null
          remaining_quantity_kg?: number
          roasted_product_id?: string | null
          roaster_id?: string | null
          status?: string
          supplier_id?: string | null
          title?: string
          total_quantity_kg?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rare_coffee_releases_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rare_coffee_releases_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rare_coffee_releases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rare_coffee_reservations: {
        Row: {
          cafe_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          quantity_kg: number
          release_id: string
          reserved_at: string
          status: string
        }
        Insert: {
          cafe_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          quantity_kg: number
          release_id: string
          reserved_at?: string
          status?: string
        }
        Update: {
          cafe_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          quantity_kg?: number
          release_id?: string
          reserved_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rare_coffee_reservations_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "rare_coffee_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      report_preferences: {
        Row: {
          created_at: string
          email_override: string | null
          id: string
          include_auto_reorders: boolean
          include_low_stock: boolean
          include_orders: boolean
          include_predictions: boolean
          report_day: number
          report_hour: number
          updated_at: string
          user_id: string
          weekly_report_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_override?: string | null
          id?: string
          include_auto_reorders?: boolean
          include_low_stock?: boolean
          include_orders?: boolean
          include_predictions?: boolean
          report_day?: number
          report_hour?: number
          updated_at?: string
          user_id: string
          weekly_report_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_override?: string | null
          id?: string
          include_auto_reorders?: boolean
          include_low_stock?: boolean
          include_orders?: boolean
          include_predictions?: boolean
          report_day?: number
          report_hour?: number
          updated_at?: string
          user_id?: string
          weekly_report_enabled?: boolean
        }
        Relationships: []
      }
      resale_commissions: {
        Row: {
          buyer_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          resale_id: string
          seller_id: string
          seller_receives: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          commission_amount: number
          commission_rate?: number
          created_at?: string
          id?: string
          resale_id: string
          seller_id: string
          seller_receives: number
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          resale_id?: string
          seller_id?: string
          seller_receives?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resale_commissions_resale_id_fkey"
            columns: ["resale_id"]
            isOneToOne: false
            referencedRelation: "coffee_resale"
            referencedColumns: ["id"]
          },
        ]
      }
      resale_contracts: {
        Row: {
          buyer_id: string
          buyer_signature: string | null
          buyer_signed_at: string | null
          commission_amount: number
          commission_rate: number
          contract_number: string | null
          created_at: string
          currency: string | null
          id: string
          price_per_kg: number
          product_description: string | null
          product_title: string
          quantity_kg: number
          resale_id: string
          seller_id: string
          seller_receives: number
          seller_signature: string | null
          seller_signed_at: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          commission_amount: number
          commission_rate: number
          contract_number?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          price_per_kg: number
          product_description?: string | null
          product_title: string
          quantity_kg: number
          resale_id: string
          seller_id: string
          seller_receives: number
          seller_signature?: string | null
          seller_signed_at?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_signature?: string | null
          buyer_signed_at?: string | null
          commission_amount?: number
          commission_rate?: number
          contract_number?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          price_per_kg?: number
          product_description?: string | null
          product_title?: string
          quantity_kg?: number
          resale_id?: string
          seller_id?: string
          seller_receives?: number
          seller_signature?: string | null
          seller_signed_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resale_contracts_resale_id_fkey"
            columns: ["resale_id"]
            isOneToOne: false
            referencedRelation: "coffee_resale"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_profiles: {
        Row: {
          batch_size_kg: number | null
          coffee_id: string | null
          created_at: string
          end_temperature: string | null
          first_crack_time: string | null
          id: string
          notes: string | null
          profile_name: string
          rating: number | null
          roast_date: string
          roast_level: string | null
          second_crack_time: string | null
          total_roast_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_size_kg?: number | null
          coffee_id?: string | null
          created_at?: string
          end_temperature?: string | null
          first_crack_time?: string | null
          id?: string
          notes?: string | null
          profile_name: string
          rating?: number | null
          roast_date?: string
          roast_level?: string | null
          second_crack_time?: string | null
          total_roast_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_size_kg?: number | null
          coffee_id?: string | null
          created_at?: string
          end_temperature?: string | null
          first_crack_time?: string | null
          id?: string
          notes?: string | null
          profile_name?: string
          rating?: number | null
          roast_date?: string
          roast_level?: string | null
          second_crack_time?: string | null
          total_roast_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roast_profiles_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      roasted_coffee_products: {
        Row: {
          available: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          flavor_notes: string[] | null
          id: string
          image_url: string | null
          min_alert_quantity_kg: number | null
          min_order_kg: number | null
          name: string
          name_ar: string | null
          origin_coffee_id: string | null
          price_per_kg: number
          roast_level: string
          roaster_id: string
          sold_quantity_kg: number | null
          total_quantity_kg: number | null
          updated_at: string | null
          warning_quantity_kg: number | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          flavor_notes?: string[] | null
          id?: string
          image_url?: string | null
          min_alert_quantity_kg?: number | null
          min_order_kg?: number | null
          name: string
          name_ar?: string | null
          origin_coffee_id?: string | null
          price_per_kg: number
          roast_level: string
          roaster_id: string
          sold_quantity_kg?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
          warning_quantity_kg?: number | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          flavor_notes?: string[] | null
          id?: string
          image_url?: string | null
          min_alert_quantity_kg?: number | null
          min_order_kg?: number | null
          name?: string
          name_ar?: string | null
          origin_coffee_id?: string | null
          price_per_kg?: number
          roast_level?: string
          roaster_id?: string
          sold_quantity_kg?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
          warning_quantity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roasted_coffee_products_origin_coffee_id_fkey"
            columns: ["origin_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_cafe_partnerships: {
        Row: {
          benefits: Json | null
          cafe_id: string
          current_discount_percentage: number | null
          id: string
          next_tier_threshold: number | null
          partnership_tier: string | null
          roaster_id: string
          started_at: string
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          cafe_id: string
          current_discount_percentage?: number | null
          id?: string
          next_tier_threshold?: number | null
          partnership_tier?: string | null
          roaster_id: string
          started_at?: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          cafe_id?: string
          current_discount_percentage?: number | null
          id?: string
          next_tier_threshold?: number | null
          partnership_tier?: string | null
          roaster_id?: string
          started_at?: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      roaster_supplier_comparisons: {
        Row: {
          coffee_origin: string
          coffee_process: string | null
          comparison_data: Json
          created_at: string
          id: string
          notes: string | null
          roaster_id: string
        }
        Insert: {
          coffee_origin: string
          coffee_process?: string | null
          comparison_data: Json
          created_at?: string
          id?: string
          notes?: string | null
          roaster_id: string
        }
        Update: {
          coffee_origin?: string
          coffee_process?: string | null
          comparison_data?: Json
          created_at?: string
          id?: string
          notes?: string | null
          roaster_id?: string
        }
        Relationships: []
      }
      roasting_logs: {
        Row: {
          bags_count: number
          batch_number: string | null
          batch_quality_rating: number | null
          completed_at: string | null
          created_at: string | null
          cupping_session_id: string | null
          customer_complaints_count: number | null
          first_crack_time: number | null
          green_coffee_id: string | null
          green_coffee_name: string
          id: string
          kg_per_bag: number | null
          log_number: number
          loss_percentage: number | null
          machine_number: string | null
          notes: string | null
          output_kg: number | null
          quality_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roast_duration_minutes: number | null
          roast_level: string | null
          roast_temperature_celsius: number | null
          roasted_product_id: string | null
          roaster_id: string
          roaster_person_name: string
          roaster_signature: string | null
          started_at: string
          status: string | null
          total_green_kg: number
          updated_at: string | null
        }
        Insert: {
          bags_count: number
          batch_number?: string | null
          batch_quality_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          cupping_session_id?: string | null
          customer_complaints_count?: number | null
          first_crack_time?: number | null
          green_coffee_id?: string | null
          green_coffee_name: string
          id?: string
          kg_per_bag?: number | null
          log_number?: number
          loss_percentage?: number | null
          machine_number?: string | null
          notes?: string | null
          output_kg?: number | null
          quality_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roast_duration_minutes?: number | null
          roast_level?: string | null
          roast_temperature_celsius?: number | null
          roasted_product_id?: string | null
          roaster_id: string
          roaster_person_name: string
          roaster_signature?: string | null
          started_at?: string
          status?: string | null
          total_green_kg: number
          updated_at?: string | null
        }
        Update: {
          bags_count?: number
          batch_number?: string | null
          batch_quality_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          cupping_session_id?: string | null
          customer_complaints_count?: number | null
          first_crack_time?: number | null
          green_coffee_id?: string | null
          green_coffee_name?: string
          id?: string
          kg_per_bag?: number | null
          log_number?: number
          loss_percentage?: number | null
          machine_number?: string | null
          notes?: string | null
          output_kg?: number | null
          quality_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roast_duration_minutes?: number | null
          roast_level?: string | null
          roast_temperature_celsius?: number | null
          roasted_product_id?: string | null
          roaster_id?: string
          roaster_person_name?: string
          roaster_signature?: string | null
          started_at?: string
          status?: string | null
          total_green_kg?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roasting_logs_cupping_session_id_fkey"
            columns: ["cupping_session_id"]
            isOneToOne: false
            referencedRelation: "cupping_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasting_logs_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasting_logs_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      roasting_schedule: {
        Row: {
          created_at: string
          green_coffee_id: string | null
          green_coffee_name: string
          id: string
          linked_order_id: string | null
          notes: string | null
          planned_date: string
          planned_quantity_kg: number
          planned_time: string | null
          priority: string | null
          roast_level: string | null
          roaster_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          green_coffee_id?: string | null
          green_coffee_name: string
          id?: string
          linked_order_id?: string | null
          notes?: string | null
          planned_date: string
          planned_quantity_kg: number
          planned_time?: string | null
          priority?: string | null
          roast_level?: string | null
          roaster_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          green_coffee_id?: string | null
          green_coffee_name?: string
          id?: string
          linked_order_id?: string | null
          notes?: string | null
          planned_date?: string
          planned_quantity_kg?: number
          planned_time?: string | null
          priority?: string | null
          roast_level?: string | null
          roaster_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roasting_schedule_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_task_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          push_on_failure: boolean
          task_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          push_on_failure?: boolean
          task_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          push_on_failure?: boolean
          task_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sent_reports: {
        Row: {
          error_message: string | null
          id: string
          is_test: boolean
          recipient_email: string
          report_data: Json | null
          report_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          is_test?: boolean
          recipient_email: string
          report_data?: Json | null
          report_type?: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          is_test?: boolean
          recipient_email?: string
          report_data?: Json | null
          report_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      session_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          session_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          session_id: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          session_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_cupping_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string | null
          left_at: string | null
          registered_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string | null
          left_at?: string | null
          registered_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string | null
          left_at?: string | null
          registered_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_cupping_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_path: string
          file_size: number | null
          id: string
          recorded_by: string
          session_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          recorded_by: string
          session_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          recorded_by?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_cupping_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          event_date: string
          event_status: string
          event_type: string
          id: string
          location: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_date?: string
          event_status: string
          event_type: string
          id?: string
          location?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_date?: string
          event_status?: string
          event_type?: string
          id?: string
          location?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking: {
        Row: {
          carrier: string | null
          carrier_id: string | null
          created_at: string
          dimensions: string | null
          estimated_arrival: string | null
          id: string
          label_printed: boolean | null
          label_printed_at: string | null
          location: string | null
          notes: string | null
          order_id: string
          shipping_cost: number | null
          status: string
          tracking_number: string | null
          updated_at: string
          weight_kg: number | null
          whatsapp_notified: boolean | null
          whatsapp_notified_at: string | null
        }
        Insert: {
          carrier?: string | null
          carrier_id?: string | null
          created_at?: string
          dimensions?: string | null
          estimated_arrival?: string | null
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          location?: string | null
          notes?: string | null
          order_id: string
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp_notified?: boolean | null
          whatsapp_notified_at?: string | null
        }
        Update: {
          carrier?: string | null
          carrier_id?: string | null
          created_at?: string
          dimensions?: string | null
          estimated_arrival?: string | null
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          location?: string | null
          notes?: string | null
          order_id?: string
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp_notified?: boolean | null
          whatsapp_notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_carriers: {
        Row: {
          api_url: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          name_ar: string
          tracking_url_template: string | null
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          name_ar: string
          tracking_url_template?: string | null
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          name_ar?: string
          tracking_url_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      smart_coffee_recommendations: {
        Row: {
          based_on_orders: string[] | null
          cafe_id: string
          created_at: string
          expires_at: string | null
          flavor_match: Json | null
          id: string
          is_acted_upon: boolean | null
          is_viewed: boolean | null
          match_score: number | null
          product_id: string | null
          recommendation_reason: string
          roaster_id: string
        }
        Insert: {
          based_on_orders?: string[] | null
          cafe_id: string
          created_at?: string
          expires_at?: string | null
          flavor_match?: Json | null
          id?: string
          is_acted_upon?: boolean | null
          is_viewed?: boolean | null
          match_score?: number | null
          product_id?: string | null
          recommendation_reason: string
          roaster_id: string
        }
        Update: {
          based_on_orders?: string[] | null
          cafe_id?: string
          created_at?: string
          expires_at?: string | null
          flavor_match?: Json | null
          id?: string
          is_acted_upon?: boolean | null
          is_viewed?: boolean | null
          match_score?: number | null
          product_id?: string | null
          recommendation_reason?: string
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_coffee_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_coffee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_supply_settings: {
        Row: {
          auto_order_enabled: boolean | null
          budget_limit_monthly: number | null
          cafe_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          min_stock_days: number | null
          notification_threshold_days: number | null
          preferred_roaster_id: string | null
          preferred_supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_order_enabled?: boolean | null
          budget_limit_monthly?: number | null
          cafe_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          min_stock_days?: number | null
          notification_threshold_days?: number | null
          preferred_roaster_id?: string | null
          preferred_supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_order_enabled?: boolean | null
          budget_limit_monthly?: number | null
          cafe_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          min_stock_days?: number | null
          notification_threshold_days?: number | null
          preferred_roaster_id?: string | null
          preferred_supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_supply_settings_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          can_approve_users: boolean | null
          can_manage_auctions: boolean | null
          can_manage_commissions: boolean | null
          can_manage_orders: boolean | null
          can_manage_roasters: boolean | null
          can_manage_settings: boolean | null
          can_manage_suppliers: boolean | null
          can_reject_users: boolean | null
          can_send_messages: boolean | null
          can_view_auctions: boolean | null
          can_view_commissions: boolean | null
          can_view_messages: boolean | null
          can_view_orders: boolean | null
          can_view_reports: boolean | null
          can_view_roasters: boolean | null
          can_view_suppliers: boolean | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          can_approve_users?: boolean | null
          can_manage_auctions?: boolean | null
          can_manage_commissions?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_roasters?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_suppliers?: boolean | null
          can_reject_users?: boolean | null
          can_send_messages?: boolean | null
          can_view_auctions?: boolean | null
          can_view_commissions?: boolean | null
          can_view_messages?: boolean | null
          can_view_orders?: boolean | null
          can_view_reports?: boolean | null
          can_view_roasters?: boolean | null
          can_view_suppliers?: boolean | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          can_approve_users?: boolean | null
          can_manage_auctions?: boolean | null
          can_manage_commissions?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_roasters?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_suppliers?: boolean | null
          can_reject_users?: boolean | null
          can_send_messages?: boolean | null
          can_view_auctions?: boolean | null
          can_view_commissions?: boolean | null
          can_view_messages?: boolean | null
          can_view_orders?: boolean | null
          can_view_reports?: boolean | null
          can_view_roasters?: boolean | null
          can_view_suppliers?: boolean | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          commission_rate: number
          created_at: string
          currency: string
          description: string | null
          description_ar: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          currency?: string
          description?: string | null
          description_ar?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_reminders: {
        Row: {
          created_at: string
          days_before: number
          email_sent_to: string | null
          id: string
          sent_at: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before: number
          email_sent_to?: string | null
          id?: string
          sent_at?: string
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          email_sent_to?: string | null
          id?: string
          sent_at?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          created_at: string
          earned_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          performance_score: number | null
          supplier_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          created_at?: string
          earned_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          performance_score?: number | null
          supplier_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          created_at?: string
          earned_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          performance_score?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_badges_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_classification_logs: {
        Row: {
          created_at: string
          id: string
          new_level: string
          new_score: number
          notification_sent: boolean
          notification_sent_at: string | null
          previous_level: string
          previous_score: number
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_level: string
          new_score: number
          notification_sent?: boolean
          notification_sent_at?: string | null
          previous_level: string
          previous_score: number
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_level?: string
          new_score?: number
          notification_sent?: boolean
          notification_sent_at?: string | null
          previous_level?: string
          previous_score?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_classification_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_delayed_notifications: {
        Row: {
          days_delayed: number
          error_message: string | null
          id: string
          notification_sent_at: string
          order_id: string
          status: string
          supplier_id: string
        }
        Insert: {
          days_delayed: number
          error_message?: string | null
          id?: string
          notification_sent_at?: string
          order_id: string
          status?: string
          supplier_id: string
        }
        Update: {
          days_delayed?: number
          error_message?: string | null
          id?: string
          notification_sent_at?: string
          order_id?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_delayed_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_delayed_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          end_date: string
          goal_name: string
          goal_type: string
          id: string
          is_completed: boolean | null
          reminder_sent: boolean | null
          start_date: string
          supplier_id: string
          target_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          end_date: string
          goal_name: string
          goal_type: string
          id?: string
          is_completed?: boolean | null
          reminder_sent?: boolean | null
          start_date: string
          supplier_id: string
          target_value: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          end_date?: string
          goal_name?: string
          goal_type?: string
          id?: string
          is_completed?: boolean | null
          reminder_sent?: boolean | null
          start_date?: string
          supplier_id?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_goals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_notification_preferences: {
        Row: {
          created_at: string
          goal_reminders_enabled: boolean
          id: string
          monthly_report_enabled: boolean
          preferred_reminder_hour: number
          reminder_days_before: number
          supplier_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_reminders_enabled?: boolean
          id?: string
          monthly_report_enabled?: boolean
          preferred_reminder_hour?: number
          reminder_days_before?: number
          supplier_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_reminders_enabled?: boolean
          id?: string
          monthly_report_enabled?: boolean
          preferred_reminder_hour?: number
          reminder_days_before?: number
          supplier_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_notification_preferences_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          coffee_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          kg_per_bag: number | null
          min_quantity_kg: number | null
          supplier_id: string
          terms_conditions: string | null
          title: string
          unit_type: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          kg_per_bag?: number | null
          min_quantity_kg?: number | null
          supplier_id: string
          terms_conditions?: string | null
          title: string
          unit_type?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          coffee_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          kg_per_bag?: number | null
          min_quantity_kg?: number | null
          supplier_id?: string
          terms_conditions?: string | null
          title?: string
          unit_type?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_performance_history: {
        Row: {
          avg_delay_days: number
          created_at: string
          delayed_orders: number
          id: string
          on_time_orders: number
          performance_level: string
          performance_score: number
          period_end: string
          period_start: string
          supplier_id: string
          total_orders: number
        }
        Insert: {
          avg_delay_days?: number
          created_at?: string
          delayed_orders?: number
          id?: string
          on_time_orders?: number
          performance_level?: string
          performance_score?: number
          period_end: string
          period_start: string
          supplier_id: string
          total_orders?: number
        }
        Update: {
          avg_delay_days?: number
          created_at?: string
          delayed_orders?: number
          id?: string
          on_time_orders?: number
          performance_level?: string
          performance_score?: number
          period_end?: string
          period_start?: string
          supplier_id?: string
          total_orders?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_performance_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_push_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          notification_type: string
          supplier_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          notification_type?: string
          supplier_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          notification_type?: string
          supplier_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_push_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          rating: number
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          rating: number
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          avg_delay_days: number | null
          contact_info: string | null
          created_at: string
          delayed_orders: number | null
          id: string
          is_suspended: boolean | null
          last_performance_update: string | null
          name: string
          performance_level: string | null
          performance_score: number | null
          suspended_at: string | null
          suspension_reason: string | null
          total_orders: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_delay_days?: number | null
          contact_info?: string | null
          created_at?: string
          delayed_orders?: number | null
          id?: string
          is_suspended?: boolean | null
          last_performance_update?: string | null
          name: string
          performance_level?: string | null
          performance_score?: number | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_delay_days?: number | null
          contact_info?: string | null
          created_at?: string
          delayed_orders?: number | null
          id?: string
          is_suspended?: boolean | null
          last_performance_update?: string | null
          name?: string
          performance_level?: string | null
          performance_score?: number | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      supply_request_bids: {
        Row: {
          bidder_id: string
          bidder_type: string
          coffee_name: string | null
          coffee_origin: string | null
          created_at: string
          currency: string | null
          delivery_days: number
          id: string
          notes: string | null
          price_per_kg: number
          request_id: string
          status: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          bidder_id: string
          bidder_type: string
          coffee_name?: string | null
          coffee_origin?: string | null
          created_at?: string
          currency?: string | null
          delivery_days: number
          id?: string
          notes?: string | null
          price_per_kg: number
          request_id: string
          status?: string | null
          total_price: number
          updated_at?: string
        }
        Update: {
          bidder_id?: string
          bidder_type?: string
          coffee_name?: string | null
          coffee_origin?: string | null
          created_at?: string
          currency?: string | null
          delivery_days?: number
          id?: string
          notes?: string | null
          price_per_kg?: number
          request_id?: string
          status?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_request_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cafe_supply_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      three_party_bids: {
        Row: {
          created_at: string | null
          delivery_days: number | null
          green_coffee_id: string | null
          green_coffee_price_per_kg: number
          id: string
          notes: string | null
          request_id: string
          roaster_id: string
          roasting_fee_per_kg: number
          status: string | null
          supplier_id: string
          total_price_per_kg: number
        }
        Insert: {
          created_at?: string | null
          delivery_days?: number | null
          green_coffee_id?: string | null
          green_coffee_price_per_kg: number
          id?: string
          notes?: string | null
          request_id: string
          roaster_id: string
          roasting_fee_per_kg: number
          status?: string | null
          supplier_id: string
          total_price_per_kg: number
        }
        Update: {
          created_at?: string | null
          delivery_days?: number | null
          green_coffee_id?: string | null
          green_coffee_price_per_kg?: number
          id?: string
          notes?: string | null
          request_id?: string
          roaster_id?: string
          roasting_fee_per_kg?: number
          status?: string | null
          supplier_id?: string
          total_price_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "three_party_bids_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "coffee_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_party_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "three_party_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_party_bids_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      three_party_commissions: {
        Row: {
          cafe_commission: number
          cafe_id: string
          commission_rate: number | null
          created_at: string | null
          id: string
          order_id: string
          order_total: number
          roaster_commission: number
          roaster_id: string
          status: string | null
          supplier_commission: number
          supplier_id: string
          total_commission: number
          updated_at: string | null
        }
        Insert: {
          cafe_commission: number
          cafe_id: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          order_id: string
          order_total: number
          roaster_commission: number
          roaster_id: string
          status?: string | null
          supplier_commission: number
          supplier_id: string
          total_commission: number
          updated_at?: string | null
        }
        Update: {
          cafe_commission?: number
          cafe_id?: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          order_id?: string
          order_total?: number
          roaster_commission?: number
          roaster_id?: string
          status?: string | null
          supplier_commission?: number
          supplier_id?: string
          total_commission?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "three_party_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cafe_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_party_commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      three_party_requests: {
        Row: {
          budget_per_kg: number | null
          cafe_id: string
          created_at: string | null
          currency: string | null
          delivery_date: string | null
          description: string | null
          expires_at: string | null
          id: string
          origin_preference: string | null
          quantity_kg: number
          roast_level_preference: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_per_kg?: number | null
          cafe_id: string
          created_at?: string | null
          currency?: string | null
          delivery_date?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          origin_preference?: string | null
          quantity_kg: number
          roast_level_preference?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_per_kg?: number | null
          cafe_id?: string
          created_at?: string | null
          currency?: string | null
          delivery_date?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          origin_preference?: string | null
          quantity_kg?: number
          roast_level_preference?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      universal_loyalty_cards: {
        Row: {
          card_number: string
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          tier: string | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          card_number: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          tier?: string | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          card_number?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          tier?: string | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      universal_loyalty_transactions: {
        Row: {
          cafe_id: string
          card_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order_amount: number | null
          points: number
          transaction_type: string
        }
        Insert: {
          cafe_id: string
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_amount?: number | null
          points: number
          transaction_type: string
        }
        Update: {
          cafe_id?: string
          card_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_amount?: number | null
          points?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_loyalty_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "universal_loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string | null
          commercial_register: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          id: string
          maintenance_type: string[] | null
          notes: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          commercial_register?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          maintenance_type?: string[] | null
          notes?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          commercial_register?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          maintenance_type?: string[] | null
          notes?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string
          created_at: string
          ends_at: string
          id: string
          last_payment_at: string | null
          next_payment_at: string | null
          payment_id: string | null
          payment_method: string | null
          plan_id: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string
          ends_at: string
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string
          ends_at?: string
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_roaster_reviews: {
        Row: {
          cafe_id: string
          communication_rating: number | null
          created_at: string
          delivery_rating: number | null
          id: string
          is_public: boolean | null
          order_details: Json | null
          order_id: string
          quality_rating: number | null
          rating: number
          review_text: string | null
          roaster_id: string
          roaster_responded_at: string | null
          roaster_response: string | null
          updated_at: string
        }
        Insert: {
          cafe_id: string
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          id?: string
          is_public?: boolean | null
          order_details?: Json | null
          order_id: string
          quality_rating?: number | null
          rating: number
          review_text?: string | null
          roaster_id: string
          roaster_responded_at?: string | null
          roaster_response?: string | null
          updated_at?: string
        }
        Update: {
          cafe_id?: string
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          id?: string
          is_public?: boolean | null
          order_details?: Json | null
          order_id?: string
          quality_rating?: number | null
          rating?: number
          review_text?: string | null
          roaster_id?: string
          roaster_responded_at?: string | null
          roaster_response?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_roaster_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "cafe_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_tasting_registrations: {
        Row: {
          attended: boolean | null
          cafe_id: string
          feedback: string | null
          id: string
          rating: number | null
          registered_at: string | null
          samples_shipped: boolean | null
          session_id: string | null
          shipping_tracking: string | null
        }
        Insert: {
          attended?: boolean | null
          cafe_id: string
          feedback?: string | null
          id?: string
          rating?: number | null
          registered_at?: string | null
          samples_shipped?: boolean | null
          session_id?: string | null
          shipping_tracking?: string | null
        }
        Update: {
          attended?: boolean | null
          cafe_id?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          registered_at?: string | null
          samples_shipped?: boolean | null
          session_id?: string | null
          shipping_tracking?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_tasting_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_tasting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_tasting_sessions: {
        Row: {
          coffee_samples: Json | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          duration_minutes: number | null
          host_id: string
          host_type: string
          id: string
          max_participants: number | null
          scheduled_at: string
          status: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          coffee_samples?: Json | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          host_id: string
          host_type: string
          id?: string
          max_participants?: number | null
          scheduled_at: string
          status?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          coffee_samples?: Json | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          host_id?: string
          host_type?: string
          id?: string
          max_participants?: number | null
          scheduled_at?: string
          status?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      whatsapp_notification_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_content: string | null
          message_type: string
          order_id: string | null
          phone_number: string
          sent_at: string | null
          shipment_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          message_type: string
          order_id?: string | null
          phone_number: string
          sent_at?: string | null
          shipment_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          message_type?: string
          order_id?: string | null
          phone_number?: string
          sent_at?: string | null
          shipment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_logs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipment_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          notify_on_delayed: boolean | null
          notify_on_delivered: boolean | null
          notify_on_out_for_delivery: boolean | null
          notify_on_shipped: boolean | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          notify_on_delayed?: boolean | null
          notify_on_delivered?: boolean | null
          notify_on_out_for_delivery?: boolean | null
          notify_on_shipped?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          notify_on_delayed?: boolean | null
          notify_on_delivered?: boolean | null
          notify_on_out_for_delivery?: boolean | null
          notify_on_shipped?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_roles_admin_view: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string | null
          commercial_register: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          id: string | null
          notes: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: Database["public"]["Enums"]["account_status"] | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          commercial_register?: never
          company_email?: never
          company_name?: never
          company_phone?: never
          created_at?: string | null
          id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          commercial_register?: never
          company_email?: never
          company_name?: never
          company_phone?: never
          created_at?: string | null
          id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_see_contact_info: {
        Args: { p_target_id: string; p_viewer_id: string }
        Returns: boolean
      }
      check_login_attempt: { Args: { p_email: string }; Returns: Json }
      clear_login_attempts: { Args: { p_email: string }; Returns: undefined }
      get_all_users_for_admin: {
        Args: never
        Returns: {
          auth_email: string
          city: string
          company_email: string
          company_name: string
          company_phone: string
          created_at: string
          id: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_business_directory: {
        Args: never
        Returns: {
          city: string
          company_email: string
          company_name: string
          id: string
          role: string
          user_id: string
        }[]
      }
      get_remaining_quantity: {
        Args: { sold: number; total: number }
        Returns: number
      }
      get_stock_status: {
        Args: {
          min_alert: number
          sold: number
          total: number
          warning_qty: number
        }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_status"]
      }
      get_user_subscription: {
        Args: { p_user_id: string }
        Returns: {
          commission_rate: number
          ends_at: string
          plan_name: string
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_verified_admin: { Args: { _user_id: string }; Returns: boolean }
      record_failed_login: { Args: { p_email: string }; Returns: Json }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected" | "suspended"
      app_role:
        | "admin"
        | "supplier"
        | "roaster"
        | "cafe"
        | "farm"
        | "maintenance"
        | "supervisor"
        | "support"
        | "viewer"
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
    Enums: {
      account_status: ["pending", "approved", "rejected", "suspended"],
      app_role: [
        "admin",
        "supplier",
        "roaster",
        "cafe",
        "farm",
        "maintenance",
        "supervisor",
        "support",
        "viewer",
      ],
    },
  },
} as const
