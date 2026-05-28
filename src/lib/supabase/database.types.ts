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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analysis_competitors: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          market_analysis_id: string | null
          nm_id: string
          price_rub: number | null
          query: string | null
          rating: number | null
          review_count: number | null
          search_position: number | null
          seller_name: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          market_analysis_id?: string | null
          nm_id: string
          price_rub?: number | null
          query?: string | null
          rating?: number | null
          review_count?: number | null
          search_position?: number | null
          seller_name?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          market_analysis_id?: string | null
          nm_id?: string
          price_rub?: number | null
          query?: string | null
          rating?: number | null
          review_count?: number | null
          search_position?: number | null
          seller_name?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_competitors_market_analysis_id_fkey"
            columns: ["market_analysis_id"]
            isOneToOne: false
            referencedRelation: "market_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_components: {
        Row: {
          bundle_id: string
          id: string
          org_id: string
          qty: number
          variant_id: string | null
        }
        Insert: {
          bundle_id: string
          id?: string
          org_id: string
          qty?: number
          variant_id?: string | null
        }
        Update: {
          bundle_id?: string
          id?: string
          org_id?: string
          qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_components_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_components_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_components_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          app_id: string | null
          created_at: string
          data: Json | null
          id: string
          name: string | null
          org_id: string
          product_id: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          org_id: string
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          org_id?: string
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          app_id: string | null
          city: string | null
          created_at: string
          data: Json | null
          email: string | null
          id: string
          loyalty_points: number
          name: string | null
          notes: string | null
          org_id: string
          phone: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          city?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          city?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_market_metrics: {
        Row: {
          average_price: number | null
          category_guess: string | null
          concentration_level: string | null
          created_at: string | null
          date: string | null
          id: string
          keyword: string | null
          median_price: number | null
          median_reviews: number | null
          p25_price: number | null
          p75_price: number | null
          product_count: number | null
          raw_metrics: Json | null
          seller_count: number | null
          top10_median_reviews: number | null
          top3_seller_share: number | null
        }
        Insert: {
          average_price?: number | null
          category_guess?: string | null
          concentration_level?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          keyword?: string | null
          median_price?: number | null
          median_reviews?: number | null
          p25_price?: number | null
          p75_price?: number | null
          product_count?: number | null
          raw_metrics?: Json | null
          seller_count?: number | null
          top10_median_reviews?: number | null
          top3_seller_share?: number | null
        }
        Update: {
          average_price?: number | null
          category_guess?: string | null
          concentration_level?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          keyword?: string | null
          median_price?: number | null
          median_reviews?: number | null
          p25_price?: number | null
          p75_price?: number | null
          product_count?: number | null
          raw_metrics?: Json | null
          seller_count?: number | null
          top10_median_reviews?: number | null
          top3_seller_share?: number | null
        }
        Relationships: []
      }
      economics_snapshots: {
        Row: {
          ad_spend_percent: number | null
          break_even_price_rub: number | null
          created_at: string | null
          currency: string | null
          estimated_margin_percent: number | null
          estimated_profit_rub: number | null
          fx_rate: number | null
          id: string
          landed_cost_rub: number | null
          market_analysis_id: string | null
          packaging_cost_rub: number | null
          result_json: Json | null
          return_buffer_percent: number | null
          supplier_unit_cost: number | null
          target_price_rub: number | null
          tax_percent: number | null
          wb_commission_percent: number | null
          wb_logistics_rub: number | null
        }
        Insert: {
          ad_spend_percent?: number | null
          break_even_price_rub?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_margin_percent?: number | null
          estimated_profit_rub?: number | null
          fx_rate?: number | null
          id?: string
          landed_cost_rub?: number | null
          market_analysis_id?: string | null
          packaging_cost_rub?: number | null
          result_json?: Json | null
          return_buffer_percent?: number | null
          supplier_unit_cost?: number | null
          target_price_rub?: number | null
          tax_percent?: number | null
          wb_commission_percent?: number | null
          wb_logistics_rub?: number | null
        }
        Update: {
          ad_spend_percent?: number | null
          break_even_price_rub?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_margin_percent?: number | null
          estimated_profit_rub?: number | null
          fx_rate?: number | null
          id?: string
          landed_cost_rub?: number | null
          market_analysis_id?: string | null
          packaging_cost_rub?: number | null
          result_json?: Json | null
          return_buffer_percent?: number | null
          supplier_unit_cost?: number | null
          target_price_rub?: number | null
          tax_percent?: number | null
          wb_commission_percent?: number | null
          wb_logistics_rub?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "economics_snapshots_market_analysis_id_fkey"
            columns: ["market_analysis_id"]
            isOneToOne: false
            referencedRelation: "market_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          org_id: string
        }
        Insert: {
          id?: string
          name: string
          org_id: string
        }
        Update: {
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          app_id: string | null
          category_id: string | null
          created_at: string
          data: Json | null
          id: string
          incurred_on: string
          note: string | null
          org_id: string
          title: string | null
        }
        Insert: {
          amount?: number
          app_id?: string | null
          category_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          incurred_on?: string
          note?: string | null
          org_id: string
          title?: string | null
        }
        Update: {
          amount?: number
          app_id?: string | null
          category_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          incurred_on?: string
          note?: string | null
          org_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          app_id: string | null
          created_at: string
          credentials: Json
          id: string
          kind: string
          last_sync_at: string | null
          owner_id: string
          status: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          kind: string
          last_sync_at?: string | null
          owner_id: string
          status?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          kind?: string
          last_sync_at?: string | null
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          app_id: string | null
          batch_number: string | null
          created_at: string
          data: Json | null
          expiry_date: string | null
          id: string
          location_id: string | null
          org_id: string
          qty: number
          received_at: string | null
          status: string
          variant_id: string | null
        }
        Insert: {
          app_id?: string | null
          batch_number?: string | null
          created_at?: string
          data?: Json | null
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          org_id: string
          qty?: number
          received_at?: string | null
          status?: string
          variant_id?: string | null
        }
        Update: {
          app_id?: string | null
          batch_number?: string | null
          created_at?: string
          data?: Json | null
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          org_id?: string
          qty?: number
          received_at?: string | null
          status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          damaged: number
          id: string
          in_transit: number
          location_id: string
          on_hand: number
          org_id: string
          reserved: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          damaged?: number
          id?: string
          in_transit?: number
          location_id: string
          on_hand?: number
          org_id: string
          reserved?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          damaged?: number
          id?: string
          in_transit?: number
          location_id?: string
          on_hand?: number
          org_id?: string
          reserved?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          app_id: string | null
          capacity: number | null
          created_at: string
          data: Json | null
          id: string
          is_default: boolean
          name: string | null
          org_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          app_id?: string | null
          capacity?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_default?: boolean
          name?: string | null
          org_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          app_id?: string | null
          capacity?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_default?: boolean
          name?: string | null
          org_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lookups: {
        Row: {
          ad_reserve_pct: number | null
          break_even_rub: number | null
          commission_pct: number | null
          created_at: string | null
          currency: string | null
          delivery_rub: number | null
          dimensions: string | null
          fx_rate: number | null
          id: string
          images: string[] | null
          logistics_rub: number | null
          margin_pct: number | null
          moq: number | null
          other_costs_rub: number | null
          packaging_rub: number | null
          price_tiers: Json | null
          product_title: string | null
          profit_per_unit: number | null
          returns_pct: number | null
          selling_price_rub: number | null
          shipping_estimate_usd: number | null
          specs: Json | null
          supplier_name: string | null
          supplier_platform: string | null
          supplier_url: string | null
          tax_pct: number | null
          unit_cost_usd: number | null
          user_id: string | null
          verdict_score: string | null
          verdict_text: string | null
          wb_analytics: Json | null
          wb_keyword: string | null
          wb_nm_id: string | null
          wb_products: Json | null
          weight_kg: number | null
        }
        Insert: {
          ad_reserve_pct?: number | null
          break_even_rub?: number | null
          commission_pct?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_rub?: number | null
          dimensions?: string | null
          fx_rate?: number | null
          id?: string
          images?: string[] | null
          logistics_rub?: number | null
          margin_pct?: number | null
          moq?: number | null
          other_costs_rub?: number | null
          packaging_rub?: number | null
          price_tiers?: Json | null
          product_title?: string | null
          profit_per_unit?: number | null
          returns_pct?: number | null
          selling_price_rub?: number | null
          shipping_estimate_usd?: number | null
          specs?: Json | null
          supplier_name?: string | null
          supplier_platform?: string | null
          supplier_url?: string | null
          tax_pct?: number | null
          unit_cost_usd?: number | null
          user_id?: string | null
          verdict_score?: string | null
          verdict_text?: string | null
          wb_analytics?: Json | null
          wb_keyword?: string | null
          wb_nm_id?: string | null
          wb_products?: Json | null
          weight_kg?: number | null
        }
        Update: {
          ad_reserve_pct?: number | null
          break_even_rub?: number | null
          commission_pct?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_rub?: number | null
          dimensions?: string | null
          fx_rate?: number | null
          id?: string
          images?: string[] | null
          logistics_rub?: number | null
          margin_pct?: number | null
          moq?: number | null
          other_costs_rub?: number | null
          packaging_rub?: number | null
          price_tiers?: Json | null
          product_title?: string | null
          profit_per_unit?: number | null
          returns_pct?: number | null
          selling_price_rub?: number | null
          shipping_estimate_usd?: number | null
          specs?: Json | null
          supplier_name?: string | null
          supplier_platform?: string | null
          supplier_url?: string | null
          tax_pct?: number | null
          unit_cost_usd?: number | null
          user_id?: string | null
          verdict_score?: string | null
          verdict_text?: string | null
          wb_analytics?: Json | null
          wb_keyword?: string | null
          wb_nm_id?: string | null
          wb_products?: Json | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lookups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analyses: {
        Row: {
          analysis_json: Json
          confidence_level: string | null
          created_at: string | null
          fingerprint_id: string | null
          id: string
          opportunity_score: number | null
          supplier_product_id: string | null
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          analysis_json: Json
          confidence_level?: string | null
          created_at?: string | null
          fingerprint_id?: string | null
          id?: string
          opportunity_score?: number | null
          supplier_product_id?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          analysis_json?: Json
          confidence_level?: string | null
          created_at?: string | null
          fingerprint_id?: string | null
          id?: string
          opportunity_score?: number | null
          supplier_product_id?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_analyses_fingerprint_id_fkey"
            columns: ["fingerprint_id"]
            isOneToOne: false
            referencedRelation: "product_fingerprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_analyses_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          org_id: string
          qty: number
          unit_cost: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          org_id: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          org_id?: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          app_id: string | null
          channel: string
          cost: number
          created_at: string
          customer_id: string | null
          data: Json | null
          fulfillment_model: string | null
          id: string
          location_id: string | null
          order_number: string | null
          org_id: string
          region: string | null
          revenue: number
          status: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          channel?: string
          cost?: number
          created_at?: string
          customer_id?: string | null
          data?: Json | null
          fulfillment_model?: string | null
          id?: string
          location_id?: string | null
          order_number?: string | null
          org_id: string
          region?: string | null
          revenue?: number
          status?: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          channel?: string
          cost?: number
          created_at?: string
          customer_id?: string | null
          data?: Json | null
          fulfillment_model?: string | null
          id?: string
          location_id?: string | null
          order_number?: string | null
          org_id?: string
          region?: string | null
          revenue?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          is_owner: boolean
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_owner?: boolean
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_owner?: boolean
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          discount_pin_threshold: number | null
          manager_pin_hash: string | null
          org_id: string
          receipt_print_default: boolean | null
          tax_rate: number | null
          tax_regime: string | null
          updated_at: string
        }
        Insert: {
          discount_pin_threshold?: number | null
          manager_pin_hash?: string | null
          org_id: string
          receipt_print_default?: boolean | null
          tax_rate?: number | null
          tax_regime?: string | null
          updated_at?: string
        }
        Update: {
          discount_pin_threshold?: number | null
          manager_pin_hash?: string | null
          org_id?: string
          receipt_print_default?: boolean | null
          tax_rate?: number | null
          tax_regime?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_type: string
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_type?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          business_type?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_fingerprints: {
        Row: {
          category_guess: string | null
          confidence: number | null
          created_at: string | null
          differentiation_angles: Json | null
          feature_tags: Json | null
          id: string
          irrelevant_terms: Json | null
          key_features: Json | null
          negative_keywords: Json | null
          packaging_assumptions: Json | null
          product_type: string | null
          ru_keywords: Json | null
          supplier_product_id: string | null
          target_customer: string | null
          use_case: string | null
        }
        Insert: {
          category_guess?: string | null
          confidence?: number | null
          created_at?: string | null
          differentiation_angles?: Json | null
          feature_tags?: Json | null
          id?: string
          irrelevant_terms?: Json | null
          key_features?: Json | null
          negative_keywords?: Json | null
          packaging_assumptions?: Json | null
          product_type?: string | null
          ru_keywords?: Json | null
          supplier_product_id?: string | null
          target_customer?: string | null
          use_case?: string | null
        }
        Update: {
          category_guess?: string | null
          confidence?: number | null
          created_at?: string | null
          differentiation_angles?: Json | null
          feature_tags?: Json | null
          id?: string
          irrelevant_terms?: Json | null
          key_features?: Json | null
          negative_keywords?: Json | null
          packaging_assumptions?: Json | null
          product_type?: string | null
          ru_keywords?: Json | null
          supplier_product_id?: string | null
          target_customer?: string | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_fingerprints_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          cost_price: number
          created_at: string
          id: string
          name: string
          org_id: string
          price: number
          product_id: string
          sku: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          org_id: string
          price?: number
          product_id: string
          sku?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          price?: number
          product_id?: string
          sku?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          app_id: string | null
          barcode: string | null
          batch_number: string | null
          category: string
          channel_allocation: Json
          channel_commission: number | null
          channels: string[]
          cost_price: number
          created_at: string
          data: Json | null
          data_matrix_code: string | null
          delivery_cost: number | null
          description: string | null
          dimensions: Json | null
          expiry_date: string | null
          gtin: string | null
          has_variants: boolean
          id: string
          image_url: string | null
          internal_barcode: string | null
          labeling_type: string | null
          name: string | null
          org_id: string
          packaging_cost: number | null
          price: number
          product_type: string
          requires_labeling: boolean
          sku: string
          status: string
          supplier_id: string | null
          tags: string[]
          updated_at: string
          weight: number | null
        }
        Insert: {
          app_id?: string | null
          barcode?: string | null
          batch_number?: string | null
          category?: string
          channel_allocation?: Json
          channel_commission?: number | null
          channels?: string[]
          cost_price?: number
          created_at?: string
          data?: Json | null
          data_matrix_code?: string | null
          delivery_cost?: number | null
          description?: string | null
          dimensions?: Json | null
          expiry_date?: string | null
          gtin?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          internal_barcode?: string | null
          labeling_type?: string | null
          name?: string | null
          org_id: string
          packaging_cost?: number | null
          price?: number
          product_type?: string
          requires_labeling?: boolean
          sku?: string
          status?: string
          supplier_id?: string | null
          tags?: string[]
          updated_at?: string
          weight?: number | null
        }
        Update: {
          app_id?: string | null
          barcode?: string | null
          batch_number?: string | null
          category?: string
          channel_allocation?: Json
          channel_commission?: number | null
          channels?: string[]
          cost_price?: number
          created_at?: string
          data?: Json | null
          data_matrix_code?: string | null
          delivery_cost?: number | null
          description?: string | null
          dimensions?: Json | null
          expiry_date?: string | null
          gtin?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          internal_barcode?: string | null
          labeling_type?: string | null
          name?: string | null
          org_id?: string
          packaging_cost?: number | null
          price?: number
          product_type?: string
          requires_labeling?: boolean
          sku?: string
          status?: string
          supplier_id?: string | null
          tags?: string[]
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_type: string | null
          channels: string[]
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_complete: boolean
          org_id: string | null
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          channels?: string[]
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_complete?: boolean
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          channels?: string[]
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          channels: string[]
          created_at: string
          ends_at: string | null
          id: string
          name: string | null
          org_id: string
          promo_code: string | null
          starts_at: string | null
          status: string
          type: string
          updated_at: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          channels?: string[]
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string | null
          org_id: string
          promo_code?: string | null
          starts_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Update: {
          channels?: string[]
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string | null
          org_id?: string
          promo_code?: string | null
          starts_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          note: string | null
          org_id: string
          po_id: string
          qty: number
          received_qty: number
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          org_id: string
          po_id: string
          qty?: number
          received_qty?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          org_id?: string
          po_id?: string
          qty?: number
          received_qty?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          app_id: string | null
          created_at: string
          currency: string
          data: Json | null
          expected_arrival: string | null
          id: string
          location_id: string | null
          note: string | null
          org_id: string
          payment_status: string | null
          received_at: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          currency?: string
          data?: Json | null
          expected_arrival?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id: string
          payment_status?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          currency?: string
          data?: Json | null
          expected_arrival?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id?: string
          payment_status?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_rules: {
        Row: {
          app_id: string | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean
          location_id: string | null
          org_id: string
          reorder_qty: number
          threshold: number
          trigger_type: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          org_id: string
          reorder_qty?: number
          threshold?: number
          trigger_type?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          org_id?: string
          reorder_qty?: number
          threshold?: number
          trigger_type?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replenishment_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_rules_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          app_id: string | null
          created_at: string
          customer_name: string | null
          data: Json | null
          expires_at: string | null
          fulfilled_at: string | null
          id: string
          location_id: string | null
          note: string | null
          order_ref: string | null
          org_id: string
          qty: number
          source: string
          status: string
          variant_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          customer_name?: string | null
          data?: Json | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          order_ref?: string | null
          org_id: string
          qty?: number
          source?: string
          status?: string
          variant_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          customer_name?: string | null
          data?: Json | null
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          order_ref?: string | null
          org_id?: string
          qty?: number
          source?: string
          status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          action: string
          condition: string
          id: string
          org_id: string
          qty: number
          return_id: string
          variant_id: string | null
        }
        Insert: {
          action?: string
          condition?: string
          id?: string
          org_id: string
          qty?: number
          return_id: string
          variant_id?: string | null
        }
        Update: {
          action?: string
          condition?: string
          id?: string
          org_id?: string
          qty?: number
          return_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount: number
          app_id: string | null
          channel: string | null
          created_at: string
          customer_id: string | null
          data: Json | null
          id: string
          order_id: string | null
          org_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          app_id?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json | null
          id?: string
          order_id?: string | null
          org_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          app_id?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json | null
          id?: string
          order_id?: string | null
          org_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_estimates: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          estimate_date: string | null
          estimated_revenue_high: number | null
          estimated_revenue_low: number | null
          estimated_sales_high: number | null
          estimated_sales_low: number | null
          estimated_sales_mid: number | null
          features_json: Json | null
          id: string
          method: string | null
          nm_id: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          estimate_date?: string | null
          estimated_revenue_high?: number | null
          estimated_revenue_low?: number | null
          estimated_sales_high?: number | null
          estimated_sales_low?: number | null
          estimated_sales_mid?: number | null
          features_json?: Json | null
          id?: string
          method?: string | null
          nm_id: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          estimate_date?: string | null
          estimated_revenue_high?: number | null
          estimated_revenue_low?: number | null
          estimated_sales_high?: number | null
          estimated_sales_low?: number | null
          estimated_sales_mid?: number | null
          features_json?: Json | null
          id?: string
          method?: string | null
          nm_id?: string
        }
        Relationships: []
      }
      saved_products: {
        Row: {
          created_at: string | null
          id: string
          lookup_id: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lookup_id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lookup_id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_products_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "lookups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inputs: Json | null
          org_id: string
          outputs: Json | null
          score: number | null
          title: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json | null
          org_id: string
          outputs?: Json | null
          score?: number | null
          title: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json | null
          org_id?: string
          outputs?: Json | null
          score?: number | null
          title?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          app_id: string | null
          created_at: string
          data: Json | null
          email: string | null
          id: string
          location_access: string[]
          name: string | null
          notes: string | null
          org_id: string
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          location_access?: string[]
          name?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          location_access?: string[]
          name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          app_id: string | null
          created_at: string
          data: Json | null
          id: string
          location_id: string | null
          note: string | null
          org_id: string
          qty_after: number
          qty_before: number
          qty_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string | null
          user_id: string | null
          user_name: string | null
          variant_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id: string
          qty_after?: number
          qty_before?: number
          qty_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          user_id?: string | null
          user_name?: string | null
          variant_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id?: string
          qty_after?: number
          qty_before?: number
          qty_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          user_id?: string | null
          user_name?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktake_items: {
        Row: {
          counted_qty: number | null
          id: string
          org_id: string
          photo: string | null
          reason: string | null
          stocktake_id: string
          system_qty: number
          variant_id: string | null
        }
        Insert: {
          counted_qty?: number | null
          id?: string
          org_id: string
          photo?: string | null
          reason?: string | null
          stocktake_id: string
          system_qty?: number
          variant_id?: string | null
        }
        Update: {
          counted_qty?: number | null
          id?: string
          org_id?: string
          photo?: string | null
          reason?: string | null
          stocktake_id?: string
          system_qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stocktake_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktake_items_stocktake_id_fkey"
            columns: ["stocktake_id"]
            isOneToOne: false
            referencedRelation: "stocktakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktake_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktakes: {
        Row: {
          app_id: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          data: Json | null
          id: string
          location_id: string | null
          note: string | null
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location_id?: string | null
          note?: string | null
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocktakes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktakes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string | null
          currency: string | null
          gross_weight_kg: number | null
          id: string
          images: Json | null
          moq: number | null
          original_title: string | null
          package_size: Json | null
          platform: string | null
          price_max: number | null
          price_min: number | null
          raw_payload: Json | null
          specs: Json | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_url: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          gross_weight_kg?: number | null
          id?: string
          images?: Json | null
          moq?: number | null
          original_title?: string | null
          package_size?: Json | null
          platform?: string | null
          price_max?: number | null
          price_min?: number | null
          raw_payload?: Json | null
          specs?: Json | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_url: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          gross_weight_kg?: number | null
          id?: string
          images?: Json | null
          moq?: number | null
          original_title?: string | null
          package_size?: Json | null
          platform?: string | null
          price_max?: number | null
          price_min?: number | null
          raw_payload?: Json | null
          specs?: Json | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_url?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          app_id: string | null
          catalog_url: string | null
          city: string | null
          contact_name: string | null
          country: string
          created_at: string
          currency: string
          data: Json | null
          email: string | null
          id: string
          lead_time_days: number
          min_order_qty: number | null
          name: string | null
          notes: string | null
          org_id: string
          payment_terms: string | null
          phone: string | null
          price_list_url: string | null
          rating: number
          telegram_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          app_id?: string | null
          catalog_url?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          data?: Json | null
          email?: string | null
          id?: string
          lead_time_days?: number
          min_order_qty?: number | null
          name?: string | null
          notes?: string | null
          org_id: string
          payment_terms?: string | null
          phone?: string | null
          price_list_url?: string | null
          rating?: number
          telegram_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          app_id?: string | null
          catalog_url?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          data?: Json | null
          email?: string | null
          id?: string
          lead_time_days?: number
          min_order_qty?: number | null
          name?: string | null
          notes?: string | null
          org_id?: string
          payment_terms?: string | null
          phone?: string | null
          price_list_url?: string | null
          rating?: number
          telegram_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_keywords: {
        Row: {
          category_guess: string | null
          created_at: string | null
          id: string
          keyword: string
          last_checked_at: string | null
          priority: number | null
          tracking_status: string | null
        }
        Insert: {
          category_guess?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          last_checked_at?: string | null
          priority?: number | null
          tracking_status?: string | null
        }
        Update: {
          category_guess?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          last_checked_at?: string | null
          priority?: number | null
          tracking_status?: string | null
        }
        Relationships: []
      }
      tracked_products: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          keywords: Json | null
          last_checked_at: string | null
          nm_id: string
          priority: number | null
          product_url: string | null
          seller_name: string | null
          source_analysis_id: string | null
          title: string | null
          tracking_status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          keywords?: Json | null
          last_checked_at?: string | null
          nm_id: string
          priority?: number | null
          product_url?: string | null
          seller_name?: string | null
          source_analysis_id?: string | null
          title?: string | null
          tracking_status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          keywords?: Json | null
          last_checked_at?: string | null
          nm_id?: string
          priority?: number | null
          product_url?: string | null
          seller_name?: string | null
          source_analysis_id?: string | null
          title?: string | null
          tracking_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_products_source_analysis_id_fkey"
            columns: ["source_analysis_id"]
            isOneToOne: false
            referencedRelation: "market_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          id: string
          org_id: string
          qty: number
          received_qty: number
          transfer_id: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          org_id: string
          qty?: number
          received_qty?: number
          transfer_id: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          qty?: number
          received_qty?: number
          transfer_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          app_id: string | null
          created_at: string
          data: Json | null
          expected_arrival: string | null
          from_location_id: string | null
          id: string
          note: string | null
          org_id: string
          received_at: string | null
          status: string
          to_location_id: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          expected_arrival?: string | null
          from_location_id?: string | null
          id?: string
          note?: string | null
          org_id: string
          received_at?: string | null
          status?: string
          to_location_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          data?: Json | null
          expected_arrival?: string | null
          from_location_id?: string | null
          id?: string
          note?: string | null
          org_id?: string
          received_at?: string | null
          status?: string
          to_location_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_economics: {
        Row: {
          ad_spend_percent: number | null
          break_even_price_rub: number | null
          created_at: string | null
          currency: string | null
          estimated_margin_percent: number | null
          estimated_profit_rub: number | null
          fx_rate: number | null
          id: string
          landed_cost_rub: number | null
          market_analysis_id: string | null
          packaging_cost_rub: number | null
          result_json: Json | null
          return_buffer_percent: number | null
          supplier_unit_cost: number | null
          target_price_rub: number | null
          tax_percent: number | null
          wb_commission_percent: number | null
          wb_logistics_rub: number | null
        }
        Insert: {
          ad_spend_percent?: number | null
          break_even_price_rub?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_margin_percent?: number | null
          estimated_profit_rub?: number | null
          fx_rate?: number | null
          id?: string
          landed_cost_rub?: number | null
          market_analysis_id?: string | null
          packaging_cost_rub?: number | null
          result_json?: Json | null
          return_buffer_percent?: number | null
          supplier_unit_cost?: number | null
          target_price_rub?: number | null
          tax_percent?: number | null
          wb_commission_percent?: number | null
          wb_logistics_rub?: number | null
        }
        Update: {
          ad_spend_percent?: number | null
          break_even_price_rub?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_margin_percent?: number | null
          estimated_profit_rub?: number | null
          fx_rate?: number | null
          id?: string
          landed_cost_rub?: number | null
          market_analysis_id?: string | null
          packaging_cost_rub?: number | null
          result_json?: Json | null
          return_buffer_percent?: number | null
          supplier_unit_cost?: number | null
          target_price_rub?: number | null
          tax_percent?: number | null
          wb_commission_percent?: number | null
          wb_logistics_rub?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_economics_market_analysis_id_fkey"
            columns: ["market_analysis_id"]
            isOneToOne: false
            referencedRelation: "market_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      wb_product_snapshots: {
        Row: {
          ad_visibility: boolean | null
          brand: string | null
          category: string | null
          created_at: string | null
          estimated_monthly_sales: number | null
          id: string
          image_url: string | null
          nm_id: string
          original_price_rub: number | null
          price_rub: number | null
          product: Json
          product_url: string | null
          provider: string
          query: string | null
          rating: number | null
          raw_payload: Json | null
          review_count: number | null
          search_position: number | null
          seller_id: string | null
          seller_name: string | null
          stock_signal: number | null
          subject: string | null
          title: string | null
        }
        Insert: {
          ad_visibility?: boolean | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          estimated_monthly_sales?: number | null
          id?: string
          image_url?: string | null
          nm_id: string
          original_price_rub?: number | null
          price_rub?: number | null
          product?: Json
          product_url?: string | null
          provider: string
          query?: string | null
          rating?: number | null
          raw_payload?: Json | null
          review_count?: number | null
          search_position?: number | null
          seller_id?: string | null
          seller_name?: string | null
          stock_signal?: number | null
          subject?: string | null
          title?: string | null
        }
        Update: {
          ad_visibility?: boolean | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          estimated_monthly_sales?: number | null
          id?: string
          image_url?: string | null
          nm_id?: string
          original_price_rub?: number | null
          price_rub?: number | null
          product?: Json
          product_url?: string | null
          provider?: string
          query?: string | null
          rating?: number | null
          raw_payload?: Json | null
          review_count?: number | null
          search_position?: number | null
          seller_id?: string | null
          seller_name?: string | null
          stock_signal?: number | null
          subject?: string | null
          title?: string | null
        }
        Relationships: []
      }
      wb_search_snapshots: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          market_stats: Json | null
          normalized_count: number | null
          products: Json
          provider: string
          query: string | null
          raw_payload: Json | null
          result_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          market_stats?: Json | null
          normalized_count?: number | null
          products?: Json
          provider: string
          query?: string | null
          raw_payload?: Json | null
          result_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          market_stats?: Json | null
          normalized_count?: number | null
          products?: Json
          provider?: string
          query?: string | null
          raw_payload?: Json | null
          result_count?: number | null
        }
        Relationships: []
      }
      weekly_updates: {
        Row: {
          affected_products: Json
          confidence: string | null
          created_at: string | null
          explanation: string | null
          id: string
          new_metric: Json | null
          old_metric: Json | null
          recommended_action: string | null
          severity: string | null
          source: string | null
          title: string
          update_type: string
        }
        Insert: {
          affected_products?: Json
          confidence?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          new_metric?: Json | null
          old_metric?: Json | null
          recommended_action?: string | null
          severity?: string | null
          source?: string | null
          title: string
          update_type: string
        }
        Update: {
          affected_products?: Json
          confidence?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          new_metric?: Json | null
          old_metric?: Json | null
          recommended_action?: string | null
          severity?: string | null
          source?: string | null
          title?: string
          update_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_resolve_location: {
        Args: { p_app_location_id: string; p_org: string }
        Returns: string
      }
      app_resolve_variant: {
        Args: { p_app_product_id: string; p_org: string; p_sku: string }
        Returns: string
      }
      available_to_sell: {
        Args: { p_location: string; p_variant: string }
        Returns: number
      }
      current_org: { Args: never; Returns: string }
      product_available_to_sell: {
        Args: { p_location?: string; p_product: string }
        Returns: number
      }
      refresh_inventory_level: {
        Args: { p_location: string; p_variant: string }
        Returns: undefined
      }
      user_in_org: { Args: { o: string }; Returns: boolean }
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
