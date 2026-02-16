CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'supplier',
    'roaster'
);


--
-- Name: calculate_order_commission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_order_commission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_supplier_rate DECIMAL(5,2);
    v_roaster_rate DECIMAL(5,2);
    v_order_total DECIMAL(12,2);
    v_supplier_commission DECIMAL(12,2);
    v_roaster_commission DECIMAL(12,2);
BEGIN
    -- Only calculate when status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Get commission rates
        SELECT supplier_rate, roaster_rate INTO v_supplier_rate, v_roaster_rate
        FROM public.commission_settings
        LIMIT 1;
        
        -- Calculate order total
        v_order_total := COALESCE(NEW.total_price, NEW.quantity_kg * COALESCE(NEW.price_per_kg, 0));
        
        -- Calculate commissions
        v_supplier_commission := v_order_total * (v_supplier_rate / 100);
        v_roaster_commission := v_order_total * (v_roaster_rate / 100);
        
        -- Insert commission record
        INSERT INTO public.commissions (
            order_id, supplier_id, roaster_id, order_total,
            supplier_commission, roaster_commission, total_commission,
            supplier_rate, roaster_rate, status
        ) VALUES (
            NEW.id, NEW.supplier_id, NEW.user_id, v_order_total,
            v_supplier_commission, v_roaster_commission,
            v_supplier_commission + v_roaster_commission,
            v_supplier_rate, v_roaster_rate, 'pending'
        )
        ON CONFLICT (order_id) DO UPDATE SET
            order_total = EXCLUDED.order_total,
            supplier_commission = EXCLUDED.supplier_commission,
            roaster_commission = EXCLUDED.roaster_commission,
            total_commission = EXCLUDED.total_commission,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: check_login_attempt(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_login_attempt(p_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_attempt RECORD;
    v_max_attempts INTEGER := 5;
    v_lockout_minutes INTEGER := 15;
    v_result JSON;
BEGIN
    -- Get existing attempt record
    SELECT * INTO v_attempt
    FROM public.login_attempts
    WHERE email = LOWER(p_email);
    
    -- If no record exists, create one and allow
    IF v_attempt IS NULL THEN
        INSERT INTO public.login_attempts (email, attempt_count, first_attempt_at, last_attempt_at)
        VALUES (LOWER(p_email), 0, now(), now());
        
        RETURN json_build_object('allowed', true, 'attempts_remaining', v_max_attempts);
    END IF;
    
    -- Check if currently locked
    IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > now() THEN
        RETURN json_build_object(
            'allowed', false,
            'locked', true,
            'locked_until', v_attempt.locked_until,
            'minutes_remaining', CEIL(EXTRACT(EPOCH FROM (v_attempt.locked_until - now())) / 60)
        );
    END IF;
    
    -- Reset if lock expired or first attempt was more than lockout period ago
    IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until <= now() THEN
        UPDATE public.login_attempts
        SET attempt_count = 0, locked_until = NULL, first_attempt_at = now()
        WHERE email = LOWER(p_email);
        
        RETURN json_build_object('allowed', true, 'attempts_remaining', v_max_attempts);
    END IF;
    
    -- Check if max attempts reached
    IF v_attempt.attempt_count >= v_max_attempts THEN
        UPDATE public.login_attempts
        SET locked_until = now() + (v_lockout_minutes || ' minutes')::INTERVAL
        WHERE email = LOWER(p_email);
        
        RETURN json_build_object(
            'allowed', false,
            'locked', true,
            'locked_until', now() + (v_lockout_minutes || ' minutes')::INTERVAL,
            'minutes_remaining', v_lockout_minutes
        );
    END IF;
    
    RETURN json_build_object(
        'allowed', true,
        'attempts_remaining', v_max_attempts - v_attempt.attempt_count
    );
END;
$$;


--
-- Name: clear_login_attempts(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_login_attempts(p_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.login_attempts WHERE email = LOWER(p_email);
END;
$$;


--
-- Name: generate_contract_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_contract_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.contract_number := 'RC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);
    RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: get_user_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_status(_user_id uuid) RETURNS public.account_status
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT status FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND status = 'approved'
  )
$$;


--
-- Name: is_verified_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_verified_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND status = 'approved'
  )
$$;


--
-- Name: record_failed_login(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_failed_login(p_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_attempt RECORD;
    v_max_attempts INTEGER := 5;
    v_lockout_minutes INTEGER := 15;
BEGIN
    -- Upsert attempt record
    INSERT INTO public.login_attempts (email, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (LOWER(p_email), 1, now(), now())
    ON CONFLICT (email) DO UPDATE
    SET attempt_count = public.login_attempts.attempt_count + 1,
        last_attempt_at = now()
    RETURNING * INTO v_attempt;
    
    -- Check if should lock
    IF v_attempt.attempt_count >= v_max_attempts THEN
        UPDATE public.login_attempts
        SET locked_until = now() + (v_lockout_minutes || ' minutes')::INTERVAL
        WHERE email = LOWER(p_email);
        
        RETURN json_build_object(
            'locked', true,
            'minutes_remaining', v_lockout_minutes
        );
    END IF;
    
    RETURN json_build_object(
        'locked', false,
        'attempts_remaining', v_max_attempts - v_attempt.attempt_count
    );
END;
$$;


--
-- Name: record_initial_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_initial_price() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.price IS NOT NULL THEN
    INSERT INTO public.price_history (coffee_id, price, currency)
    VALUES (NEW.id, NEW.price, NEW.currency);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: record_price_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_price_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (coffee_id, price, currency)
    VALUES (NEW.id, NEW.price, NEW.currency);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: auction_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auction_bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auction_id uuid NOT NULL,
    bidder_id uuid NOT NULL,
    bid_amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auction_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auction_commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auction_id uuid NOT NULL,
    final_price numeric NOT NULL,
    commission_rate numeric DEFAULT 5.00 NOT NULL,
    commission_amount numeric NOT NULL,
    supplier_amount numeric NOT NULL,
    winner_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auction_commissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: blend_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blend_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    name_ar text,
    description text,
    target_flavor_profile jsonb,
    components jsonb NOT NULL,
    ai_suggestions jsonb,
    total_score numeric,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coffee_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quantity_kg numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coffee_auctions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coffee_auctions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    coffee_id uuid,
    title text NOT NULL,
    title_ar text,
    description text,
    description_ar text,
    starting_price numeric NOT NULL,
    current_price numeric NOT NULL,
    min_increment numeric DEFAULT 10 NOT NULL,
    quantity_kg numeric NOT NULL,
    currency text DEFAULT 'SAR'::text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    winner_id uuid,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'pending'::text,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    platform_commission_rate numeric DEFAULT 5.00,
    platform_commission_amount numeric,
    CONSTRAINT coffee_auctions_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT coffee_auctions_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'ended'::text, 'cancelled'::text])))
);


--
-- Name: coffee_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coffee_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    name text NOT NULL,
    origin text,
    region text,
    process text,
    price numeric(10,2),
    currency text DEFAULT 'SAR'::text,
    score integer,
    altitude text,
    variety text,
    flavor text,
    available boolean DEFAULT true,
    source_pdf text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coffee_resale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coffee_resale (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    original_coffee_id uuid,
    title text NOT NULL,
    description text,
    origin text,
    process text,
    quantity_kg numeric NOT NULL,
    price_per_kg numeric NOT NULL,
    currency text DEFAULT 'SAR'::text,
    roast_date date,
    reason text,
    status text DEFAULT 'available'::text NOT NULL,
    buyer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    platform_commission_rate numeric DEFAULT 5.00,
    platform_commission_amount numeric,
    contract_accepted boolean DEFAULT false,
    contract_accepted_at timestamp with time zone,
    seller_confirmed boolean DEFAULT false,
    seller_confirmed_at timestamp with time zone,
    images text[] DEFAULT '{}'::text[],
    approval_status text DEFAULT 'pending'::text,
    admin_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT coffee_resale_status_check CHECK ((status = ANY (ARRAY['available'::text, 'reserved'::text, 'sold'::text, 'cancelled'::text])))
);


--
-- Name: commission_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    alert_type text NOT NULL,
    notification_channel text NOT NULL,
    commission_amount numeric NOT NULL,
    total_amount numeric NOT NULL,
    threshold numeric NOT NULL,
    supplier_name text,
    email_sent_to text,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commission_notification_logs_alert_type_check CHECK ((alert_type = ANY (ARRAY['single'::text, 'total'::text]))),
    CONSTRAINT commission_notification_logs_notification_channel_check CHECK ((notification_channel = ANY (ARRAY['in_app'::text, 'email'::text, 'both'::text]))),
    CONSTRAINT commission_notification_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])))
);


--
-- Name: commission_report_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_report_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    report_day integer DEFAULT 0 NOT NULL,
    report_hour integer DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'Asia/Riyadh'::text NOT NULL,
    email_override text,
    last_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: commission_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
    roaster_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    roaster_id uuid NOT NULL,
    order_total numeric(12,2) NOT NULL,
    supplier_commission numeric(12,2) NOT NULL,
    roaster_commission numeric(12,2) NOT NULL,
    total_commission numeric(12,2) NOT NULL,
    supplier_rate numeric(5,2) NOT NULL,
    roaster_rate numeric(5,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cupping_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cupping_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coffee_id uuid,
    user_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    aroma_score numeric,
    flavor_score numeric,
    aftertaste_score numeric,
    acidity_score numeric,
    body_score numeric,
    balance_score numeric,
    overall_score numeric,
    total_score numeric GENERATED ALWAYS AS (((((((COALESCE(aroma_score, (0)::numeric) + COALESCE(flavor_score, (0)::numeric)) + COALESCE(aftertaste_score, (0)::numeric)) + COALESCE(acidity_score, (0)::numeric)) + COALESCE(body_score, (0)::numeric)) + COALESCE(balance_score, (0)::numeric)) + COALESCE(overall_score, (0)::numeric))) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cupping_sessions_acidity_score_check CHECK (((acidity_score >= (0)::numeric) AND (acidity_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_aftertaste_score_check CHECK (((aftertaste_score >= (0)::numeric) AND (aftertaste_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_aroma_score_check CHECK (((aroma_score >= (0)::numeric) AND (aroma_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_balance_score_check CHECK (((balance_score >= (0)::numeric) AND (balance_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_body_score_check CHECK (((body_score >= (0)::numeric) AND (body_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_flavor_score_check CHECK (((flavor_score >= (0)::numeric) AND (flavor_score <= (10)::numeric))),
    CONSTRAINT cupping_sessions_overall_score_check CHECK (((overall_score >= (0)::numeric) AND (overall_score <= (10)::numeric)))
);


--
-- Name: customer_shipment_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_shipment_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    notification_type text DEFAULT 'shipment_update'::text NOT NULL,
    shipment_status text NOT NULL,
    tracking_number text,
    estimated_arrival timestamp with time zone,
    message text,
    email_sent_to text,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dashboard_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    layout jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: delayed_shipment_alert_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delayed_shipment_alert_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    days_threshold integer DEFAULT 1 NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    check_interval_hours integer DEFAULT 6 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    report_hour integer DEFAULT 8 NOT NULL
);


--
-- Name: delayed_shipment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delayed_shipment_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    days_delayed integer NOT NULL,
    notification_channel text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorite_offers_summary_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_offers_summary_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    summary_hour integer DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'Asia/Riyadh'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    weekly_enabled boolean DEFAULT false NOT NULL,
    weekly_day integer DEFAULT 0 NOT NULL,
    weekly_hour integer DEFAULT 9 NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coffee_id uuid NOT NULL,
    user_id uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: harvest_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.harvest_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    origin text NOT NULL,
    variety text,
    expected_harvest_date date NOT NULL,
    quantity_kg numeric NOT NULL,
    price_per_kg numeric NOT NULL,
    currency text DEFAULT 'SAR'::text,
    deposit_percentage numeric DEFAULT 20,
    deposit_paid boolean DEFAULT false,
    status text DEFAULT 'pending'::text NOT NULL,
    terms text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    buyer_signature text,
    buyer_signed_at timestamp with time zone,
    supplier_signature text,
    supplier_signed_at timestamp with time zone,
    CONSTRAINT harvest_contracts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'harvested'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coffee_id uuid NOT NULL,
    user_id uuid NOT NULL,
    quantity_kg numeric DEFAULT 0 NOT NULL,
    min_quantity_kg numeric DEFAULT 5 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_reorder_enabled boolean DEFAULT false NOT NULL,
    auto_reorder_quantity numeric DEFAULT 10 NOT NULL,
    last_auto_reorder_at timestamp with time zone
);


--
-- Name: inventory_predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coffee_id uuid NOT NULL,
    coffee_name text NOT NULL,
    predicted_days_until_empty integer NOT NULL,
    predicted_daily_consumption numeric NOT NULL,
    predicted_reorder_date date NOT NULL,
    recommended_quantity numeric NOT NULL,
    actual_stock_at_prediction numeric NOT NULL,
    actual_stock_at_reorder_date numeric,
    prediction_accuracy numeric,
    was_accurate boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone
);


--
-- Name: live_cupping_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_cupping_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    host_id uuid NOT NULL,
    title text NOT NULL,
    title_ar text,
    description text,
    description_ar text,
    coffee_name text,
    coffee_origin text,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 45 NOT NULL,
    max_participants integer DEFAULT 20 NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    thumbnail_url text,
    room_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT live_cupping_sessions_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'ended'::text, 'cancelled'::text])))
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip_address text,
    attempt_count integer DEFAULT 1,
    first_attempt_at timestamp with time zone DEFAULT now(),
    last_attempt_at timestamp with time zone DEFAULT now(),
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false
);


--
-- Name: monthly_report_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_report_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    report_month date NOT NULL,
    rank integer NOT NULL,
    total_suppliers integer NOT NULL,
    performance_score numeric,
    platform_avg_score numeric,
    badges_count integer DEFAULT 0,
    email_sent_to text,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_supplier_awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_supplier_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    award_month date NOT NULL,
    award_type text NOT NULL,
    award_name text NOT NULL,
    performance_score numeric,
    rank integer,
    prize_description text,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_retry_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_retry_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_notification_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    notification_type text DEFAULT 'commission'::text NOT NULL,
    notification_data jsonb
);


--
-- Name: offer_expiry_alert_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_expiry_alert_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    days_before integer DEFAULT 3 NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offer_expiry_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_expiry_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    offer_title text NOT NULL,
    supplier_name text,
    days_remaining integer NOT NULL,
    notification_type text DEFAULT 'expiry_warning'::text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offer_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    coffee_id uuid,
    quantity_kg numeric NOT NULL,
    price_per_kg numeric,
    total_price numeric,
    currency text DEFAULT 'SAR'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery date,
    actual_delivery date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: pdf_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text,
    processed boolean DEFAULT false,
    raw_content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: performance_alert_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_alert_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    score integer NOT NULL,
    threshold integer NOT NULL,
    recipient_email text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    alert_data jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: performance_alert_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_alert_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    alerts_enabled boolean DEFAULT true NOT NULL,
    threshold integer DEFAULT 40 NOT NULL,
    alert_frequency text DEFAULT 'daily'::text NOT NULL,
    email_alerts boolean DEFAULT true NOT NULL,
    push_alerts boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    daily_summary_enabled boolean DEFAULT true NOT NULL,
    daily_summary_hour integer DEFAULT 9 NOT NULL,
    smart_check_enabled boolean DEFAULT false NOT NULL,
    smart_check_hour integer DEFAULT 8 NOT NULL,
    smart_check_days integer[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6],
    last_smart_check_at timestamp with time zone,
    push_alerts_enabled boolean DEFAULT false NOT NULL,
    timezone text DEFAULT 'Asia/Riyadh'::text NOT NULL,
    custom_high_risk_title text DEFAULT 'تنبيه: مخاطر عالية متوقعة'::text,
    custom_high_risk_body text DEFAULT 'التوقعات تشير إلى مخاطر عالية للأسبوع القادم'::text,
    custom_medium_risk_title text DEFAULT 'تنبيه: مخاطر متوسطة متوقعة'::text,
    custom_medium_risk_body text DEFAULT 'يُتوقع بعض التحديات الأسبوع القادم'::text,
    custom_low_avg_title text DEFAULT 'متوسط أداء منخفض متوقع'::text,
    custom_low_avg_body text DEFAULT 'متوسط التوقع أقل من المستوى المطلوب'::text,
    weekly_report_enabled boolean DEFAULT false,
    weekly_report_day integer DEFAULT 0,
    weekly_report_hour integer DEFAULT 9,
    CONSTRAINT threshold_range CHECK (((threshold >= 0) AND (threshold <= 100)))
);


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coffee_id uuid NOT NULL,
    target_price numeric NOT NULL,
    alert_type text NOT NULL,
    is_active boolean DEFAULT true,
    last_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT price_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['below'::text, 'above'::text, 'any_change'::text])))
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coffee_id uuid NOT NULL,
    price numeric NOT NULL,
    currency text DEFAULT 'SAR'::text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_request_id uuid NOT NULL,
    coffee_id uuid NOT NULL,
    coffee_name text NOT NULL,
    origin text,
    quantity_kg numeric NOT NULL,
    unit_price numeric NOT NULL,
    supplier_unit_price numeric,
    total_price numeric NOT NULL,
    supplier_total_price numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    roaster_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_amount numeric,
    supplier_total numeric,
    supplier_notes text,
    roaster_notes text,
    currency text DEFAULT 'SAR'::text,
    valid_until timestamp with time zone,
    responded_at timestamp with time zone,
    accepted_at timestamp with time zone,
    converted_order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: report_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    weekly_report_enabled boolean DEFAULT true NOT NULL,
    report_day integer DEFAULT 0 NOT NULL,
    report_hour integer DEFAULT 9 NOT NULL,
    include_predictions boolean DEFAULT true NOT NULL,
    include_low_stock boolean DEFAULT true NOT NULL,
    include_orders boolean DEFAULT true NOT NULL,
    include_auto_reorders boolean DEFAULT true NOT NULL,
    email_override text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resale_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resale_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid,
    total_amount numeric NOT NULL,
    commission_rate numeric DEFAULT 5.00 NOT NULL,
    commission_amount numeric NOT NULL,
    seller_receives numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resale_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resale_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    product_title text NOT NULL,
    product_description text,
    quantity_kg numeric NOT NULL,
    price_per_kg numeric NOT NULL,
    total_amount numeric NOT NULL,
    commission_rate numeric NOT NULL,
    commission_amount numeric NOT NULL,
    seller_receives numeric NOT NULL,
    currency text DEFAULT 'SAR'::text,
    seller_signature text,
    seller_signed_at timestamp with time zone,
    buyer_signature text,
    buyer_signed_at timestamp with time zone,
    status text DEFAULT 'pending_signatures'::text NOT NULL,
    contract_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roast_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roast_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coffee_id uuid,
    profile_name text NOT NULL,
    roast_date date DEFAULT CURRENT_DATE NOT NULL,
    roast_level text,
    first_crack_time text,
    second_crack_time text,
    total_roast_time text,
    end_temperature text,
    batch_size_kg numeric,
    notes text,
    rating integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roast_profiles_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT roast_profiles_roast_level_check CHECK ((roast_level = ANY (ARRAY['light'::text, 'medium-light'::text, 'medium'::text, 'medium-dark'::text, 'dark'::text])))
);


--
-- Name: scheduled_task_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_task_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_name text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    push_on_failure boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sent_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sent_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_type text DEFAULT 'weekly'::text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_email text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    report_data jsonb,
    is_test boolean DEFAULT false NOT NULL
);


--
-- Name: session_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    joined_at timestamp with time zone,
    left_at timestamp with time zone,
    is_active boolean DEFAULT false NOT NULL
);


--
-- Name: session_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    recorded_by uuid NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shipment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid NOT NULL,
    event_type text NOT NULL,
    event_status text NOT NULL,
    location text,
    description text,
    description_ar text,
    event_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shipment_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    status text DEFAULT 'preparing'::text NOT NULL,
    location text,
    notes text,
    estimated_arrival timestamp with time zone,
    tracking_number text,
    carrier text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    carrier_id uuid,
    shipping_cost numeric(10,2),
    weight_kg numeric(10,2),
    dimensions text,
    whatsapp_notified boolean DEFAULT false,
    whatsapp_notified_at timestamp with time zone,
    label_printed boolean DEFAULT false,
    label_printed_at timestamp with time zone
);


--
-- Name: shipping_carriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_carriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    code text NOT NULL,
    api_url text,
    is_active boolean DEFAULT true,
    logo_url text,
    tracking_url_template text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    badge_type text NOT NULL,
    badge_name text NOT NULL,
    badge_description text,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    performance_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_classification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_classification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    previous_level text NOT NULL,
    new_level text NOT NULL,
    previous_score numeric NOT NULL,
    new_score numeric NOT NULL,
    notification_sent boolean DEFAULT false NOT NULL,
    notification_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_delayed_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_delayed_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    days_delayed integer NOT NULL,
    notification_sent_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text
);


--
-- Name: supplier_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    goal_type text NOT NULL,
    goal_name text NOT NULL,
    target_value numeric NOT NULL,
    current_value numeric DEFAULT 0,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    reminder_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    goal_reminders_enabled boolean DEFAULT true NOT NULL,
    monthly_report_enabled boolean DEFAULT true NOT NULL,
    reminder_days_before integer DEFAULT 3 NOT NULL,
    preferred_reminder_hour integer DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'Asia/Riyadh'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    discount_percentage numeric,
    discount_amount numeric,
    currency text DEFAULT 'SAR'::text,
    coffee_id uuid,
    min_quantity_kg numeric,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    terms_conditions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_performance_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_performance_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    delayed_orders integer DEFAULT 0 NOT NULL,
    on_time_orders integer DEFAULT 0 NOT NULL,
    avg_delay_days numeric DEFAULT 0 NOT NULL,
    performance_score numeric DEFAULT 100 NOT NULL,
    performance_level text DEFAULT 'excellent'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_push_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_push_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    notification_type text DEFAULT 'general'::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    performance_score numeric DEFAULT 100,
    performance_level text DEFAULT 'excellent'::text,
    is_suspended boolean DEFAULT false,
    suspended_at timestamp with time zone,
    suspension_reason text,
    total_orders integer DEFAULT 0,
    delayed_orders integer DEFAULT 0,
    avg_delay_days numeric DEFAULT 0,
    last_performance_update timestamp with time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'roaster'::public.app_role NOT NULL,
    status public.account_status DEFAULT 'pending'::public.account_status NOT NULL,
    company_name text,
    company_phone text,
    company_email text,
    commercial_register text,
    city text,
    terms_accepted boolean DEFAULT false NOT NULL,
    terms_accepted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles_admin_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_roles_admin_view WITH (security_invoker='true') AS
 SELECT id,
    user_id,
    role,
    status,
        CASE
            WHEN (auth.uid() = user_id) THEN company_name
            ELSE ("left"(company_name, 3) || '***'::text)
        END AS company_name,
        CASE
            WHEN (auth.uid() = user_id) THEN company_email
            ELSE '***@***'::text
        END AS company_email,
        CASE
            WHEN (auth.uid() = user_id) THEN company_phone
            ELSE '***'::text
        END AS company_phone,
        CASE
            WHEN (auth.uid() = user_id) THEN commercial_register
            ELSE '***'::text
        END AS commercial_register,
    city,
    terms_accepted,
    terms_accepted_at,
    notes,
    rejection_reason,
    approved_by,
    approved_at,
    created_at,
    updated_at
   FROM public.user_roles;


--
-- Name: whatsapp_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid,
    order_id uuid,
    phone_number text NOT NULL,
    message_type text NOT NULL,
    message_content text,
    status text DEFAULT 'pending'::text,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true,
    phone_number text,
    notify_on_shipped boolean DEFAULT true,
    notify_on_out_for_delivery boolean DEFAULT true,
    notify_on_delivered boolean DEFAULT true,
    notify_on_delayed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auction_bids auction_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_pkey PRIMARY KEY (id);


--
-- Name: auction_commissions auction_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_commissions
    ADD CONSTRAINT auction_commissions_pkey PRIMARY KEY (id);


--
-- Name: blend_recipes blend_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blend_recipes
    ADD CONSTRAINT blend_recipes_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_coffee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_coffee_id_key UNIQUE (user_id, coffee_id);


--
-- Name: coffee_auctions coffee_auctions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_auctions
    ADD CONSTRAINT coffee_auctions_pkey PRIMARY KEY (id);


--
-- Name: coffee_offerings coffee_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_offerings
    ADD CONSTRAINT coffee_offerings_pkey PRIMARY KEY (id);


--
-- Name: coffee_resale coffee_resale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_resale
    ADD CONSTRAINT coffee_resale_pkey PRIMARY KEY (id);


--
-- Name: commission_notification_logs commission_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_notification_logs
    ADD CONSTRAINT commission_notification_logs_pkey PRIMARY KEY (id);


--
-- Name: commission_report_settings commission_report_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_report_settings
    ADD CONSTRAINT commission_report_settings_pkey PRIMARY KEY (id);


--
-- Name: commission_report_settings commission_report_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_report_settings
    ADD CONSTRAINT commission_report_settings_user_id_key UNIQUE (user_id);


--
-- Name: commission_settings commission_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings
    ADD CONSTRAINT commission_settings_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_order_id_key UNIQUE (order_id);


--
-- Name: commissions commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);


--
-- Name: cupping_sessions cupping_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupping_sessions
    ADD CONSTRAINT cupping_sessions_pkey PRIMARY KEY (id);


--
-- Name: customer_shipment_notifications customer_shipment_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_shipment_notifications
    ADD CONSTRAINT customer_shipment_notifications_pkey PRIMARY KEY (id);


--
-- Name: dashboard_layouts dashboard_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_layouts
    ADD CONSTRAINT dashboard_layouts_pkey PRIMARY KEY (id);


--
-- Name: dashboard_layouts dashboard_layouts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_layouts
    ADD CONSTRAINT dashboard_layouts_user_id_key UNIQUE (user_id);


--
-- Name: delayed_shipment_alert_preferences delayed_shipment_alert_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_shipment_alert_preferences
    ADD CONSTRAINT delayed_shipment_alert_preferences_pkey PRIMARY KEY (id);


--
-- Name: delayed_shipment_alert_preferences delayed_shipment_alert_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_shipment_alert_preferences
    ADD CONSTRAINT delayed_shipment_alert_preferences_user_id_key UNIQUE (user_id);


--
-- Name: delayed_shipment_logs delayed_shipment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_shipment_logs
    ADD CONSTRAINT delayed_shipment_logs_pkey PRIMARY KEY (id);


--
-- Name: favorite_offers_summary_preferences favorite_offers_summary_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_offers_summary_preferences
    ADD CONSTRAINT favorite_offers_summary_preferences_pkey PRIMARY KEY (id);


--
-- Name: favorite_offers_summary_preferences favorite_offers_summary_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_offers_summary_preferences
    ADD CONSTRAINT favorite_offers_summary_preferences_user_id_key UNIQUE (user_id);


--
-- Name: favorites favorites_coffee_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_coffee_id_user_id_key UNIQUE (coffee_id, user_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: harvest_contracts harvest_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.harvest_contracts
    ADD CONSTRAINT harvest_contracts_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_coffee_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_coffee_id_user_id_key UNIQUE (coffee_id, user_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory_predictions inventory_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_predictions
    ADD CONSTRAINT inventory_predictions_pkey PRIMARY KEY (id);


--
-- Name: live_cupping_sessions live_cupping_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_cupping_sessions
    ADD CONSTRAINT live_cupping_sessions_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monthly_report_logs monthly_report_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_report_logs
    ADD CONSTRAINT monthly_report_logs_pkey PRIMARY KEY (id);


--
-- Name: monthly_supplier_awards monthly_supplier_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_supplier_awards
    ADD CONSTRAINT monthly_supplier_awards_pkey PRIMARY KEY (id);


--
-- Name: notification_retry_logs notification_retry_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_retry_logs
    ADD CONSTRAINT notification_retry_logs_pkey PRIMARY KEY (id);


--
-- Name: offer_expiry_alert_preferences offer_expiry_alert_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_expiry_alert_preferences
    ADD CONSTRAINT offer_expiry_alert_preferences_pkey PRIMARY KEY (id);


--
-- Name: offer_expiry_alert_preferences offer_expiry_alert_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_expiry_alert_preferences
    ADD CONSTRAINT offer_expiry_alert_preferences_user_id_key UNIQUE (user_id);


--
-- Name: offer_expiry_notifications offer_expiry_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_expiry_notifications
    ADD CONSTRAINT offer_expiry_notifications_pkey PRIMARY KEY (id);


--
-- Name: offer_favorites offer_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_favorites
    ADD CONSTRAINT offer_favorites_pkey PRIMARY KEY (id);


--
-- Name: offer_favorites offer_favorites_user_id_offer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_favorites
    ADD CONSTRAINT offer_favorites_user_id_offer_id_key UNIQUE (user_id, offer_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pdf_uploads pdf_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads
    ADD CONSTRAINT pdf_uploads_pkey PRIMARY KEY (id);


--
-- Name: performance_alert_logs performance_alert_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_alert_logs
    ADD CONSTRAINT performance_alert_logs_pkey PRIMARY KEY (id);


--
-- Name: performance_alert_settings performance_alert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_alert_settings
    ADD CONSTRAINT performance_alert_settings_pkey PRIMARY KEY (id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: quote_request_items quote_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_request_items
    ADD CONSTRAINT quote_request_items_pkey PRIMARY KEY (id);


--
-- Name: quote_requests quote_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_requests
    ADD CONSTRAINT quote_requests_pkey PRIMARY KEY (id);


--
-- Name: report_preferences report_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_preferences
    ADD CONSTRAINT report_preferences_pkey PRIMARY KEY (id);


--
-- Name: report_preferences report_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_preferences
    ADD CONSTRAINT report_preferences_user_id_key UNIQUE (user_id);


--
-- Name: resale_commissions resale_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_commissions
    ADD CONSTRAINT resale_commissions_pkey PRIMARY KEY (id);


--
-- Name: resale_contracts resale_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_contracts
    ADD CONSTRAINT resale_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: resale_contracts resale_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_contracts
    ADD CONSTRAINT resale_contracts_pkey PRIMARY KEY (id);


--
-- Name: roast_profiles roast_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roast_profiles
    ADD CONSTRAINT roast_profiles_pkey PRIMARY KEY (id);


--
-- Name: scheduled_task_settings scheduled_task_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_task_settings
    ADD CONSTRAINT scheduled_task_settings_pkey PRIMARY KEY (id);


--
-- Name: scheduled_task_settings scheduled_task_settings_user_id_task_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_task_settings
    ADD CONSTRAINT scheduled_task_settings_user_id_task_name_key UNIQUE (user_id, task_name);


--
-- Name: sent_reports sent_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_reports
    ADD CONSTRAINT sent_reports_pkey PRIMARY KEY (id);


--
-- Name: session_chat_messages session_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_chat_messages
    ADD CONSTRAINT session_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_session_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_user_id_key UNIQUE (session_id, user_id);


--
-- Name: session_recordings session_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_recordings
    ADD CONSTRAINT session_recordings_pkey PRIMARY KEY (id);


--
-- Name: shipment_events shipment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_events
    ADD CONSTRAINT shipment_events_pkey PRIMARY KEY (id);


--
-- Name: shipment_tracking shipment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_pkey PRIMARY KEY (id);


--
-- Name: shipping_carriers shipping_carriers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_carriers
    ADD CONSTRAINT shipping_carriers_code_key UNIQUE (code);


--
-- Name: shipping_carriers shipping_carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_carriers
    ADD CONSTRAINT shipping_carriers_pkey PRIMARY KEY (id);


--
-- Name: supplier_badges supplier_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_badges
    ADD CONSTRAINT supplier_badges_pkey PRIMARY KEY (id);


--
-- Name: supplier_classification_logs supplier_classification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_classification_logs
    ADD CONSTRAINT supplier_classification_logs_pkey PRIMARY KEY (id);


--
-- Name: supplier_delayed_notifications supplier_delayed_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_delayed_notifications
    ADD CONSTRAINT supplier_delayed_notifications_pkey PRIMARY KEY (id);


--
-- Name: supplier_goals supplier_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_goals
    ADD CONSTRAINT supplier_goals_pkey PRIMARY KEY (id);


--
-- Name: supplier_notification_preferences supplier_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_notification_preferences
    ADD CONSTRAINT supplier_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: supplier_notification_preferences supplier_notification_preferences_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_notification_preferences
    ADD CONSTRAINT supplier_notification_preferences_supplier_id_key UNIQUE (supplier_id);


--
-- Name: supplier_offers supplier_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_offers
    ADD CONSTRAINT supplier_offers_pkey PRIMARY KEY (id);


--
-- Name: supplier_performance_history supplier_performance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_performance_history
    ADD CONSTRAINT supplier_performance_history_pkey PRIMARY KEY (id);


--
-- Name: supplier_push_notifications supplier_push_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_push_notifications
    ADD CONSTRAINT supplier_push_notifications_pkey PRIMARY KEY (id);


--
-- Name: supplier_ratings supplier_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ratings
    ADD CONSTRAINT supplier_ratings_pkey PRIMARY KEY (id);


--
-- Name: supplier_ratings supplier_ratings_supplier_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ratings
    ADD CONSTRAINT supplier_ratings_supplier_id_user_id_key UNIQUE (supplier_id, user_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: whatsapp_notification_logs whatsapp_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_logs
    ADD CONSTRAINT whatsapp_notification_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_notification_settings whatsapp_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_settings
    ADD CONSTRAINT whatsapp_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_notification_settings whatsapp_notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_settings
    ADD CONSTRAINT whatsapp_notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: idx_auction_commissions_auction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auction_commissions_auction_id ON public.auction_commissions USING btree (auction_id);


--
-- Name: idx_coffee_auctions_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coffee_auctions_approval_status ON public.coffee_auctions USING btree (approval_status);


--
-- Name: idx_commission_notification_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_notification_logs_created_at ON public.commission_notification_logs USING btree (created_at DESC);


--
-- Name: idx_commission_notification_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_notification_logs_user_id ON public.commission_notification_logs USING btree (user_id);


--
-- Name: idx_login_attempts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email);


--
-- Name: idx_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (receiver_id, is_read) WHERE (is_read = false);


--
-- Name: idx_monthly_awards_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_awards_month ON public.monthly_supplier_awards USING btree (award_month);


--
-- Name: idx_monthly_awards_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_awards_supplier ON public.monthly_supplier_awards USING btree (supplier_id);


--
-- Name: idx_notification_retry_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_retry_logs_created_at ON public.notification_retry_logs USING btree (created_at DESC);


--
-- Name: idx_notification_retry_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_retry_logs_status ON public.notification_retry_logs USING btree (status);


--
-- Name: idx_notification_retry_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_retry_logs_user_id ON public.notification_retry_logs USING btree (user_id);


--
-- Name: idx_offer_expiry_notifications_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_expiry_notifications_sent_at ON public.offer_expiry_notifications USING btree (sent_at DESC);


--
-- Name: idx_offer_expiry_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_expiry_notifications_user_id ON public.offer_expiry_notifications USING btree (user_id);


--
-- Name: idx_participants_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_session ON public.session_participants USING btree (session_id);


--
-- Name: idx_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_user ON public.session_participants USING btree (user_id);


--
-- Name: idx_performance_alert_logs_user_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_alert_logs_user_sent ON public.performance_alert_logs USING btree (user_id, sent_at DESC);


--
-- Name: idx_performance_alert_settings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_alert_settings_user ON public.performance_alert_settings USING btree (user_id);


--
-- Name: idx_predictions_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictions_user_date ON public.inventory_predictions USING btree (user_id, created_at DESC);


--
-- Name: idx_price_alerts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_alerts_active ON public.price_alerts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_price_alerts_user_coffee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_alerts_user_coffee ON public.price_alerts USING btree (user_id, coffee_id);


--
-- Name: idx_sent_reports_user_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sent_reports_user_sent_at ON public.sent_reports USING btree (user_id, sent_at DESC);


--
-- Name: idx_sessions_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_scheduled ON public.live_cupping_sessions USING btree (scheduled_at);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_status ON public.live_cupping_sessions USING btree (status);


--
-- Name: idx_supplier_goals_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_goals_dates ON public.supplier_goals USING btree (start_date, end_date);


--
-- Name: idx_supplier_goals_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_goals_supplier ON public.supplier_goals USING btree (supplier_id);


--
-- Name: orders on_order_delivered_calculate_commission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_delivered_calculate_commission AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.calculate_order_commission();


--
-- Name: coffee_offerings record_coffee_initial_price; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER record_coffee_initial_price AFTER INSERT ON public.coffee_offerings FOR EACH ROW EXECUTE FUNCTION public.record_initial_price();


--
-- Name: coffee_offerings record_coffee_price_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER record_coffee_price_change AFTER UPDATE ON public.coffee_offerings FOR EACH ROW EXECUTE FUNCTION public.record_price_change();


--
-- Name: resale_contracts set_contract_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_contract_number BEFORE INSERT ON public.resale_contracts FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coffee_offerings update_coffee_offerings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coffee_offerings_updated_at BEFORE UPDATE ON public.coffee_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commission_report_settings update_commission_report_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commission_report_settings_updated_at BEFORE UPDATE ON public.commission_report_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commission_settings update_commission_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commission_settings_updated_at BEFORE UPDATE ON public.commission_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commissions update_commissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cupping_sessions update_cupping_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cupping_sessions_updated_at BEFORE UPDATE ON public.cupping_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_layouts update_dashboard_layouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dashboard_layouts_updated_at BEFORE UPDATE ON public.dashboard_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: favorite_offers_summary_preferences update_favorite_offers_summary_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_favorite_offers_summary_preferences_updated_at BEFORE UPDATE ON public.favorite_offers_summary_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory update_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: offer_expiry_alert_preferences update_offer_expiry_alert_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_offer_expiry_alert_preferences_updated_at BEFORE UPDATE ON public.offer_expiry_alert_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: performance_alert_settings update_performance_alert_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_performance_alert_settings_updated_at BEFORE UPDATE ON public.performance_alert_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: price_alerts update_price_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_requests update_quote_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_preferences update_report_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_report_preferences_updated_at BEFORE UPDATE ON public.report_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roast_profiles update_roast_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roast_profiles_updated_at BEFORE UPDATE ON public.roast_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scheduled_task_settings update_scheduled_task_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scheduled_task_settings_updated_at BEFORE UPDATE ON public.scheduled_task_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipment_tracking update_shipment_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipment_tracking_updated_at BEFORE UPDATE ON public.shipment_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_carriers update_shipping_carriers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipping_carriers_updated_at BEFORE UPDATE ON public.shipping_carriers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_goals update_supplier_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_goals_updated_at BEFORE UPDATE ON public.supplier_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_offers update_supplier_offers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_offers_updated_at BEFORE UPDATE ON public.supplier_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_ratings update_supplier_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_ratings_updated_at BEFORE UPDATE ON public.supplier_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_notification_settings update_whatsapp_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON public.whatsapp_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: auction_bids auction_bids_auction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.coffee_auctions(id) ON DELETE CASCADE;


--
-- Name: auction_commissions auction_commissions_auction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auction_commissions
    ADD CONSTRAINT auction_commissions_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.coffee_auctions(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: coffee_auctions coffee_auctions_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_auctions
    ADD CONSTRAINT coffee_auctions_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: coffee_auctions coffee_auctions_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_auctions
    ADD CONSTRAINT coffee_auctions_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: coffee_offerings coffee_offerings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_offerings
    ADD CONSTRAINT coffee_offerings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: coffee_resale coffee_resale_original_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coffee_resale
    ADD CONSTRAINT coffee_resale_original_coffee_id_fkey FOREIGN KEY (original_coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: commissions commissions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: commissions commissions_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: cupping_sessions cupping_sessions_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupping_sessions
    ADD CONSTRAINT cupping_sessions_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: customer_shipment_notifications customer_shipment_notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_shipment_notifications
    ADD CONSTRAINT customer_shipment_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: customer_shipment_notifications customer_shipment_notifications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_shipment_notifications
    ADD CONSTRAINT customer_shipment_notifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: delayed_shipment_logs delayed_shipment_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_shipment_logs
    ADD CONSTRAINT delayed_shipment_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: delayed_shipment_logs delayed_shipment_logs_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_shipment_logs
    ADD CONSTRAINT delayed_shipment_logs_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: harvest_contracts harvest_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.harvest_contracts
    ADD CONSTRAINT harvest_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: inventory_predictions inventory_predictions_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_predictions
    ADD CONSTRAINT inventory_predictions_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: messages messages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: monthly_report_logs monthly_report_logs_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_report_logs
    ADD CONSTRAINT monthly_report_logs_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: monthly_supplier_awards monthly_supplier_awards_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_supplier_awards
    ADD CONSTRAINT monthly_supplier_awards_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: offer_favorites offer_favorites_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_favorites
    ADD CONSTRAINT offer_favorites_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.supplier_offers(id) ON DELETE CASCADE;


--
-- Name: orders orders_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: orders orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: pdf_uploads pdf_uploads_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_uploads
    ADD CONSTRAINT pdf_uploads_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quote_request_items quote_request_items_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_request_items
    ADD CONSTRAINT quote_request_items_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE CASCADE;


--
-- Name: quote_request_items quote_request_items_quote_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_request_items
    ADD CONSTRAINT quote_request_items_quote_request_id_fkey FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests(id) ON DELETE CASCADE;


--
-- Name: quote_requests quote_requests_converted_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_requests
    ADD CONSTRAINT quote_requests_converted_order_id_fkey FOREIGN KEY (converted_order_id) REFERENCES public.orders(id);


--
-- Name: quote_requests quote_requests_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_requests
    ADD CONSTRAINT quote_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: resale_commissions resale_commissions_resale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_commissions
    ADD CONSTRAINT resale_commissions_resale_id_fkey FOREIGN KEY (resale_id) REFERENCES public.coffee_resale(id) ON DELETE CASCADE;


--
-- Name: resale_contracts resale_contracts_resale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_contracts
    ADD CONSTRAINT resale_contracts_resale_id_fkey FOREIGN KEY (resale_id) REFERENCES public.coffee_resale(id) ON DELETE CASCADE;


--
-- Name: roast_profiles roast_profiles_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roast_profiles
    ADD CONSTRAINT roast_profiles_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: session_chat_messages session_chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_chat_messages
    ADD CONSTRAINT session_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_cupping_sessions(id) ON DELETE CASCADE;


--
-- Name: session_participants session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_cupping_sessions(id) ON DELETE CASCADE;


--
-- Name: session_recordings session_recordings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_recordings
    ADD CONSTRAINT session_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_cupping_sessions(id) ON DELETE CASCADE;


--
-- Name: shipment_events shipment_events_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_events
    ADD CONSTRAINT shipment_events_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipment_tracking(id) ON DELETE CASCADE;


--
-- Name: shipment_tracking shipment_tracking_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);


--
-- Name: shipment_tracking shipment_tracking_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: supplier_badges supplier_badges_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_badges
    ADD CONSTRAINT supplier_badges_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_classification_logs supplier_classification_logs_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_classification_logs
    ADD CONSTRAINT supplier_classification_logs_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_delayed_notifications supplier_delayed_notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_delayed_notifications
    ADD CONSTRAINT supplier_delayed_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: supplier_delayed_notifications supplier_delayed_notifications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_delayed_notifications
    ADD CONSTRAINT supplier_delayed_notifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_goals supplier_goals_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_goals
    ADD CONSTRAINT supplier_goals_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_notification_preferences supplier_notification_preferences_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_notification_preferences
    ADD CONSTRAINT supplier_notification_preferences_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_offers supplier_offers_coffee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_offers
    ADD CONSTRAINT supplier_offers_coffee_id_fkey FOREIGN KEY (coffee_id) REFERENCES public.coffee_offerings(id) ON DELETE SET NULL;


--
-- Name: supplier_offers supplier_offers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_offers
    ADD CONSTRAINT supplier_offers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_performance_history supplier_performance_history_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_performance_history
    ADD CONSTRAINT supplier_performance_history_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_push_notifications supplier_push_notifications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_push_notifications
    ADD CONSTRAINT supplier_push_notifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_ratings supplier_ratings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ratings
    ADD CONSTRAINT supplier_ratings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_notification_logs whatsapp_notification_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_logs
    ADD CONSTRAINT whatsapp_notification_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: whatsapp_notification_logs whatsapp_notification_logs_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_logs
    ADD CONSTRAINT whatsapp_notification_logs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipment_tracking(id);


--
-- Name: resale_contracts Admins can delete resale contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete resale contracts" ON public.resale_contracts FOR DELETE USING (public.is_verified_admin(auth.uid()));


--
-- Name: live_cupping_sessions Admins can delete sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete sessions" ON public.live_cupping_sessions FOR DELETE USING (public.is_verified_admin(auth.uid()));


--
-- Name: commission_report_settings Admins can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert their own settings" ON public.commission_report_settings FOR INSERT WITH CHECK ((public.is_verified_admin(auth.uid()) AND (auth.uid() = user_id)));


--
-- Name: supplier_offers Admins can manage all offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all offers" ON public.supplier_offers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: resale_commissions Admins can manage all resale commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all resale commissions" ON public.resale_commissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: auction_commissions Admins can manage auction commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage auction commissions" ON public.auction_commissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_carriers Admins can manage carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage carriers" ON public.shipping_carriers USING (public.is_verified_admin(auth.uid()));


--
-- Name: commissions Admins can manage commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage commissions" ON public.commissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_settings Admins can update commission settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update commission settings" ON public.commission_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_report_settings Admins can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their own settings" ON public.commission_report_settings FOR UPDATE USING ((public.is_verified_admin(auth.uid()) AND (auth.uid() = user_id)));


--
-- Name: supplier_classification_logs Admins can view all classification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all classification logs" ON public.supplier_classification_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commissions Admins can view all commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all commissions" ON public.commissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: resale_contracts Admins can view all contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all contracts" ON public.resale_contracts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: supplier_performance_history Admins can view all performance history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all performance history" ON public.supplier_performance_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: monthly_report_logs Admins can view all report logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all report logs" ON public.monthly_report_logs FOR SELECT USING (public.is_verified_admin(auth.uid()));


--
-- Name: commission_settings Admins can view commission settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view commission settings" ON public.commission_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_report_settings Admins can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their own settings" ON public.commission_report_settings FOR SELECT USING ((public.is_verified_admin(auth.uid()) AND (auth.uid() = user_id)));


--
-- Name: login_attempts Allow anonymous insert for login tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous insert for login tracking" ON public.login_attempts FOR INSERT TO anon WITH CHECK (true);


--
-- Name: login_attempts Allow anonymous read for login checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous read for login checks" ON public.login_attempts FOR SELECT TO anon USING (true);


--
-- Name: login_attempts Allow anonymous update for login tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous update for login tracking" ON public.login_attempts FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: shipping_carriers Anyone can view active carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active carriers" ON public.shipping_carriers FOR SELECT USING ((is_active = true));


--
-- Name: user_roles Anyone can view approved suppliers and roasters basic info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved suppliers and roasters basic info" ON public.user_roles FOR SELECT USING (((status = 'approved'::public.account_status) AND (role = ANY (ARRAY['supplier'::public.app_role, 'roaster'::public.app_role]))));


--
-- Name: monthly_supplier_awards Anyone can view awards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view awards" ON public.monthly_supplier_awards FOR SELECT USING (true);


--
-- Name: session_participants Anyone can view participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view participants" ON public.session_participants FOR SELECT USING (true);


--
-- Name: supplier_badges Anyone can view supplier badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view supplier badges" ON public.supplier_badges FOR SELECT USING (true);


--
-- Name: coffee_auctions Approved auctions viewable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved auctions viewable by all" ON public.coffee_auctions FOR SELECT USING (((approval_status = 'approved'::text) OR (EXISTS ( SELECT 1
   FROM public.suppliers
  WHERE ((suppliers.id = coffee_auctions.supplier_id) AND (suppliers.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: performance_alert_logs Authenticated system can insert alert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated system can insert alert logs" ON public.performance_alert_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: sent_reports Authenticated system can insert reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated system can insert reports" ON public.sent_reports FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: price_history Authenticated users can insert price history for their coffees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert price history for their coffees" ON public.price_history FOR INSERT WITH CHECK (((coffee_id IN ( SELECT co.id
   FROM (public.coffee_offerings co
     JOIN public.suppliers s ON ((co.supplier_id = s.id)))
  WHERE (s.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: session_participants Authenticated users can register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can register" ON public.session_participants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplier_offers Authenticated users can view active offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active offers" ON public.supplier_offers FOR SELECT USING (((auth.uid() IS NOT NULL) AND (is_active = true) AND ((valid_until IS NULL) OR (valid_until > now()))));


--
-- Name: coffee_offerings Authenticated users can view all coffee offerings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all coffee offerings" ON public.coffee_offerings FOR SELECT TO authenticated USING (true);


--
-- Name: auction_bids Bids viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bids viewable by authenticated users" ON public.auction_bids FOR SELECT TO authenticated USING (true);


--
-- Name: harvest_contracts Buyers can create contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can create contracts" ON public.harvest_contracts FOR INSERT TO authenticated WITH CHECK ((buyer_id = auth.uid()));


--
-- Name: coffee_resale Buyers can update resale for purchase; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can update resale for purchase" ON public.coffee_resale FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: harvest_contracts Contracts viewable by parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Contracts viewable by parties" ON public.harvest_contracts FOR SELECT TO authenticated USING (((buyer_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.suppliers
  WHERE ((suppliers.id = harvest_contracts.supplier_id) AND (suppliers.user_id = auth.uid()))))));


--
-- Name: customer_shipment_notifications Customers can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their own notifications" ON public.customer_shipment_notifications FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: live_cupping_sessions Hosts and admins can update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts and admins can update sessions" ON public.live_cupping_sessions FOR UPDATE USING (((host_id = auth.uid()) OR public.is_verified_admin(auth.uid())));


--
-- Name: session_recordings Hosts can insert recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can insert recordings" ON public.session_recordings FOR INSERT WITH CHECK ((session_id IN ( SELECT live_cupping_sessions.id
   FROM public.live_cupping_sessions
  WHERE (live_cupping_sessions.host_id = auth.uid()))));


--
-- Name: harvest_contracts Parties can update contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Parties can update contracts" ON public.harvest_contracts FOR UPDATE TO authenticated USING (((buyer_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.suppliers
  WHERE ((suppliers.id = harvest_contracts.supplier_id) AND (suppliers.user_id = auth.uid()))))));


--
-- Name: resale_contracts Parties can update their contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Parties can update their contracts" ON public.resale_contracts FOR UPDATE USING (((seller_id = auth.uid()) OR (buyer_id = auth.uid())));


--
-- Name: coffee_resale Resale viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Resale viewable by authenticated" ON public.coffee_resale FOR SELECT TO authenticated USING (true);


--
-- Name: quote_request_items Roasters can create quote request items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roasters can create quote request items" ON public.quote_request_items FOR INSERT WITH CHECK ((quote_request_id IN ( SELECT quote_requests.id
   FROM public.quote_requests
  WHERE (quote_requests.roaster_id = auth.uid()))));


--
-- Name: quote_requests Roasters can create quote requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roasters can create quote requests" ON public.quote_requests FOR INSERT WITH CHECK ((auth.uid() = roaster_id));


--
-- Name: quote_requests Roasters can update their own quote requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roasters can update their own quote requests" ON public.quote_requests FOR UPDATE USING ((auth.uid() = roaster_id));


--
-- Name: commissions Roasters can view their commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roasters can view their commissions" ON public.commissions FOR SELECT TO authenticated USING ((roaster_id = auth.uid()));


--
-- Name: quote_requests Roasters can view their own quote requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roasters can view their own quote requests" ON public.quote_requests FOR SELECT USING ((auth.uid() = roaster_id));


--
-- Name: resale_contracts Sellers can delete their own contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can delete their own contracts" ON public.resale_contracts FOR DELETE USING ((seller_id = auth.uid()));


--
-- Name: session_chat_messages Session participants can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Session participants can send messages" ON public.session_chat_messages FOR INSERT WITH CHECK (((auth.uid() = user_id) AND ((session_id IN ( SELECT session_participants.session_id
   FROM public.session_participants
  WHERE ((session_participants.user_id = auth.uid()) AND (session_participants.is_active = true)))) OR (session_id IN ( SELECT live_cupping_sessions.id
   FROM public.live_cupping_sessions
  WHERE (live_cupping_sessions.host_id = auth.uid()))))));


--
-- Name: session_chat_messages Session participants can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Session participants can view messages" ON public.session_chat_messages FOR SELECT USING (((session_id IN ( SELECT session_participants.session_id
   FROM public.session_participants
  WHERE (session_participants.user_id = auth.uid()))) OR (session_id IN ( SELECT live_cupping_sessions.id
   FROM public.live_cupping_sessions
  WHERE (live_cupping_sessions.host_id = auth.uid())))));


--
-- Name: session_recordings Session participants can view recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Session participants can view recordings" ON public.session_recordings FOR SELECT USING (((session_id IN ( SELECT session_participants.session_id
   FROM public.session_participants
  WHERE (session_participants.user_id = auth.uid()))) OR (session_id IN ( SELECT live_cupping_sessions.id
   FROM public.live_cupping_sessions
  WHERE (live_cupping_sessions.host_id = auth.uid())))));


--
-- Name: live_cupping_sessions Sessions viewable with approval; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sessions viewable with approval" ON public.live_cupping_sessions FOR SELECT USING (((approval_status = 'approved'::text) OR (host_id = auth.uid()) OR public.is_verified_admin(auth.uid())));


--
-- Name: supplier_goals Suppliers can create their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can create their own goals" ON public.supplier_goals FOR INSERT WITH CHECK ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_goals Suppliers can delete their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can delete their own goals" ON public.supplier_goals FOR DELETE USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_offers Suppliers can delete their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can delete their own offers" ON public.supplier_offers FOR DELETE USING ((public.has_role(auth.uid(), 'supplier'::public.app_role) AND (supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid())))));


--
-- Name: supplier_offers Suppliers can insert their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can insert their own offers" ON public.supplier_offers FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'supplier'::public.app_role) AND (supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid())))));


--
-- Name: supplier_notification_preferences Suppliers can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can insert their own preferences" ON public.supplier_notification_preferences FOR INSERT WITH CHECK ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: shipment_tracking Suppliers can insert tracking for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can insert tracking for their orders" ON public.shipment_tracking FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.suppliers s ON ((o.supplier_id = s.id)))
  WHERE ((o.id = shipment_tracking.order_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role) AND (user_roles.status = 'approved'::public.account_status))))));


--
-- Name: coffee_auctions Suppliers can manage their auctions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can manage their auctions" ON public.coffee_auctions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.suppliers
  WHERE ((suppliers.id = coffee_auctions.supplier_id) AND (suppliers.user_id = auth.uid())))));


--
-- Name: quote_request_items Suppliers can update quote request items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update quote request items" ON public.quote_request_items FOR UPDATE USING ((quote_request_id IN ( SELECT quote_requests.id
   FROM public.quote_requests
  WHERE (quote_requests.supplier_id IN ( SELECT suppliers.id
           FROM public.suppliers
          WHERE (suppliers.user_id = auth.uid()))))));


--
-- Name: quote_requests Suppliers can update quote requests sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update quote requests sent to them" ON public.quote_requests FOR UPDATE USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_goals Suppliers can update their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update their own goals" ON public.supplier_goals FOR UPDATE USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_push_notifications Suppliers can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update their own notifications" ON public.supplier_push_notifications FOR UPDATE USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_offers Suppliers can update their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update their own offers" ON public.supplier_offers FOR UPDATE USING ((public.has_role(auth.uid(), 'supplier'::public.app_role) AND (supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid())))));


--
-- Name: supplier_notification_preferences Suppliers can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update their own preferences" ON public.supplier_notification_preferences FOR UPDATE USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: shipment_tracking Suppliers can update tracking for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can update tracking for their orders" ON public.shipment_tracking FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.suppliers s ON ((o.supplier_id = s.id)))
  WHERE ((o.id = shipment_tracking.order_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role) AND (user_roles.status = 'approved'::public.account_status))))));


--
-- Name: customer_shipment_notifications Suppliers can view notifications they sent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view notifications they sent" ON public.customer_shipment_notifications FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: quote_requests Suppliers can view quote requests sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view quote requests sent to them" ON public.quote_requests FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: auction_commissions Suppliers can view their auction commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their auction commissions" ON public.auction_commissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.coffee_auctions ca
     JOIN public.suppliers s ON ((s.id = ca.supplier_id)))
  WHERE ((ca.id = auction_commissions.auction_id) AND (s.user_id = auth.uid())))));


--
-- Name: commissions Suppliers can view their commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their commissions" ON public.commissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.suppliers s
  WHERE ((s.id = commissions.supplier_id) AND (s.user_id = auth.uid())))));


--
-- Name: supplier_delayed_notifications Suppliers can view their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their notifications" ON public.supplier_delayed_notifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.suppliers s
  WHERE ((s.id = supplier_delayed_notifications.supplier_id) AND (s.user_id = auth.uid())))));


--
-- Name: supplier_classification_logs Suppliers can view their own classification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own classification logs" ON public.supplier_classification_logs FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_goals Suppliers can view their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own goals" ON public.supplier_goals FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_push_notifications Suppliers can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own notifications" ON public.supplier_push_notifications FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_performance_history Suppliers can view their own performance history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own performance history" ON public.supplier_performance_history FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: supplier_notification_preferences Suppliers can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own preferences" ON public.supplier_notification_preferences FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: monthly_report_logs Suppliers can view their own report logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers can view their own report logs" ON public.monthly_report_logs FOR SELECT USING ((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))));


--
-- Name: monthly_supplier_awards System can insert awards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert awards" ON public.monthly_supplier_awards FOR INSERT WITH CHECK (true);


--
-- Name: supplier_badges System can insert badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert badges" ON public.supplier_badges FOR INSERT WITH CHECK (true);


--
-- Name: supplier_classification_logs System can insert classification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert classification logs" ON public.supplier_classification_logs FOR INSERT WITH CHECK (true);


--
-- Name: resale_contracts System can insert contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert contracts" ON public.resale_contracts FOR INSERT WITH CHECK (true);


--
-- Name: shipment_events System can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert events" ON public.shipment_events FOR INSERT WITH CHECK (true);


--
-- Name: whatsapp_notification_logs System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.whatsapp_notification_logs FOR INSERT WITH CHECK (true);


--
-- Name: customer_shipment_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.customer_shipment_notifications FOR INSERT WITH CHECK (true);


--
-- Name: supplier_delayed_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.supplier_delayed_notifications FOR INSERT WITH CHECK (true);


--
-- Name: supplier_push_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.supplier_push_notifications FOR INSERT WITH CHECK (true);


--
-- Name: supplier_performance_history System can insert performance history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert performance history" ON public.supplier_performance_history FOR INSERT WITH CHECK (true);


--
-- Name: monthly_report_logs System can insert report logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert report logs" ON public.monthly_report_logs FOR INSERT WITH CHECK (true);


--
-- Name: monthly_supplier_awards System can update awards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update awards" ON public.monthly_supplier_awards FOR UPDATE USING (true);


--
-- Name: supplier_badges System can update badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update badges" ON public.supplier_badges FOR UPDATE USING (true);


--
-- Name: supplier_classification_logs System can update classification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update classification logs" ON public.supplier_classification_logs FOR UPDATE USING (true);


--
-- Name: offer_favorites Users can add their own offer favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add their own offer favorites" ON public.offer_favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can add to their own cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to their own cart" ON public.cart_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: messages Users can archive their own sent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can archive their own sent messages" ON public.messages FOR UPDATE USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: live_cupping_sessions Users can create sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sessions" ON public.live_cupping_sessions FOR INSERT WITH CHECK ((auth.uid() = host_id));


--
-- Name: favorite_offers_summary_preferences Users can create their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own preferences" ON public.favorite_offers_summary_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: price_alerts Users can create their own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own price alerts" ON public.price_alerts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: coffee_offerings Users can delete coffee offerings from their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete coffee offerings from their suppliers" ON public.coffee_offerings FOR DELETE USING (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: pdf_uploads Users can delete pdf uploads for their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete pdf uploads for their suppliers" ON public.pdf_uploads FOR DELETE USING (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: cart_items Users can delete their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cart items" ON public.cart_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cupping_sessions Users can delete their own cupping sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cupping sessions" ON public.cupping_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorites Users can delete their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: inventory Users can delete their own inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own inventory" ON public.inventory FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: dashboard_layouts Users can delete their own layout; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own layout" ON public.dashboard_layouts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: commission_notification_logs Users can delete their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notification logs" ON public.commission_notification_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: offer_expiry_notifications Users can delete their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notification logs" ON public.offer_expiry_notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: offer_favorites Users can delete their own offer favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own offer favorites" ON public.offer_favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: orders Users can delete their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: inventory_predictions Users can delete their own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own predictions" ON public.inventory_predictions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: report_preferences Users can delete their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own preferences" ON public.report_preferences FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can delete their own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own price alerts" ON public.price_alerts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: supplier_ratings Users can delete their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own ratings" ON public.supplier_ratings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_retry_logs Users can delete their own retry logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own retry logs" ON public.notification_retry_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: roast_profiles Users can delete their own roast profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own roast profiles" ON public.roast_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: performance_alert_settings Users can delete their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own settings" ON public.performance_alert_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: suppliers Users can delete their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own suppliers" ON public.suppliers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: scheduled_task_settings Users can delete their own task settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own task settings" ON public.scheduled_task_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: coffee_offerings Users can insert coffee offerings for their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert coffee offerings for their suppliers" ON public.coffee_offerings FOR INSERT WITH CHECK (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: pdf_uploads Users can insert pdf uploads for their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert pdf uploads for their suppliers" ON public.pdf_uploads FOR INSERT WITH CHECK (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: cupping_sessions Users can insert their own cupping sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own cupping sessions" ON public.cupping_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorites Users can insert their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own favorites" ON public.favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: inventory Users can insert their own inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own inventory" ON public.inventory FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: dashboard_layouts Users can insert their own layout; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own layout" ON public.dashboard_layouts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: delayed_shipment_logs Users can insert their own logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own logs" ON public.delayed_shipment_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: commission_notification_logs Users can insert their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification logs" ON public.commission_notification_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: offer_expiry_notifications Users can insert their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification logs" ON public.offer_expiry_notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can insert their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: inventory_predictions Users can insert their own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own predictions" ON public.inventory_predictions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: delayed_shipment_alert_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.delayed_shipment_alert_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: offer_expiry_alert_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.offer_expiry_alert_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: report_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.report_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplier_ratings Users can insert their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own ratings" ON public.supplier_ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_retry_logs Users can insert their own retry logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own retry logs" ON public.notification_retry_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: roast_profiles Users can insert their own roast profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own roast profiles" ON public.roast_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can insert their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: performance_alert_settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON public.performance_alert_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: suppliers Users can insert their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own suppliers" ON public.suppliers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: scheduled_task_settings Users can insert their own task settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own task settings" ON public.scheduled_task_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: blend_recipes Users can manage own blends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own blends" ON public.blend_recipes TO authenticated USING ((user_id = auth.uid()));


--
-- Name: coffee_resale Users can manage own resale listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own resale listings" ON public.coffee_resale TO authenticated USING ((seller_id = auth.uid()));


--
-- Name: whatsapp_notification_settings Users can manage their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own settings" ON public.whatsapp_notification_settings USING ((auth.uid() = user_id));


--
-- Name: auction_bids Users can place bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can place bids" ON public.auction_bids FOR INSERT TO authenticated WITH CHECK ((bidder_id = auth.uid()));


--
-- Name: messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: session_participants Users can unregister; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unregister" ON public.session_participants FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: coffee_offerings Users can update coffee offerings from their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update coffee offerings from their suppliers" ON public.coffee_offerings FOR UPDATE USING (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: messages Users can update messages they received (mark as read); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages they received (mark as read)" ON public.messages FOR UPDATE USING ((auth.uid() = receiver_id));


--
-- Name: pdf_uploads Users can update pdf uploads for their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update pdf uploads for their suppliers" ON public.pdf_uploads FOR UPDATE USING (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: cart_items Users can update their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cart items" ON public.cart_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cupping_sessions Users can update their own cupping sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cupping sessions" ON public.cupping_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: inventory Users can update their own inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own inventory" ON public.inventory FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: dashboard_layouts Users can update their own layout; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own layout" ON public.dashboard_layouts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can update their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can update their own pending role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own pending role" ON public.user_roles FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::public.account_status)));


--
-- Name: inventory_predictions Users can update their own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own predictions" ON public.inventory_predictions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: delayed_shipment_alert_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.delayed_shipment_alert_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: favorite_offers_summary_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.favorite_offers_summary_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: offer_expiry_alert_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.offer_expiry_alert_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: report_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.report_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can update their own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own price alerts" ON public.price_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: supplier_ratings Users can update their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ratings" ON public.supplier_ratings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_retry_logs Users can update their own retry logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own retry logs" ON public.notification_retry_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: roast_profiles Users can update their own roast profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own roast profiles" ON public.roast_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: performance_alert_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.performance_alert_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: suppliers Users can update their own suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own suppliers" ON public.suppliers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: scheduled_task_settings Users can update their own task settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own task settings" ON public.scheduled_task_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: session_participants Users can update their participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their participation" ON public.session_participants FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: messages Users can view messages they sent or received; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: pdf_uploads Users can view pdf uploads for their suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view pdf uploads for their suppliers" ON public.pdf_uploads FOR SELECT USING (((supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: price_history Users can view price history for their coffees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view price history for their coffees" ON public.price_history FOR SELECT USING (((coffee_id IN ( SELECT co.id
   FROM (public.coffee_offerings co
     JOIN public.suppliers s ON ((co.supplier_id = s.id)))
  WHERE (s.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: blend_recipes Users can view public blends or own blends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public blends or own blends" ON public.blend_recipes FOR SELECT TO authenticated USING (((is_public = true) OR (user_id = auth.uid())));


--
-- Name: quote_request_items Users can view quote request items they're involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quote request items they're involved in" ON public.quote_request_items FOR SELECT USING ((quote_request_id IN ( SELECT quote_requests.id
   FROM public.quote_requests
  WHERE ((quote_requests.roaster_id = auth.uid()) OR (quote_requests.supplier_id IN ( SELECT suppliers.id
           FROM public.suppliers
          WHERE (suppliers.user_id = auth.uid())))))));


--
-- Name: supplier_ratings Users can view relevant ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant ratings" ON public.supplier_ratings FOR SELECT USING (((auth.uid() = user_id) OR (supplier_id IN ( SELECT suppliers.id
   FROM public.suppliers
  WHERE (suppliers.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: suppliers Users can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view suppliers" ON public.suppliers FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR public.is_verified_admin(auth.uid()) OR public.has_role(auth.uid(), 'roaster'::public.app_role))));


--
-- Name: performance_alert_logs Users can view their own alert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alert logs" ON public.performance_alert_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can view their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: resale_contracts Users can view their own contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own contracts" ON public.resale_contracts FOR SELECT USING (((seller_id = auth.uid()) OR (buyer_id = auth.uid())));


--
-- Name: cupping_sessions Users can view their own cupping sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cupping sessions" ON public.cupping_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: inventory Users can view their own inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own inventory" ON public.inventory FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: dashboard_layouts Users can view their own layout; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own layout" ON public.dashboard_layouts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: delayed_shipment_logs Users can view their own logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own logs" ON public.delayed_shipment_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: whatsapp_notification_logs Users can view their own logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own logs" ON public.whatsapp_notification_logs FOR SELECT USING (((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))) OR public.is_verified_admin(auth.uid())));


--
-- Name: commission_notification_logs Users can view their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification logs" ON public.commission_notification_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: offer_expiry_notifications Users can view their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification logs" ON public.offer_expiry_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: offer_favorites Users can view their own offer favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own offer favorites" ON public.offer_favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: inventory_predictions Users can view their own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own predictions" ON public.inventory_predictions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: delayed_shipment_alert_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.delayed_shipment_alert_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: favorite_offers_summary_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.favorite_offers_summary_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: offer_expiry_alert_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.offer_expiry_alert_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: report_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.report_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can view their own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own price alerts" ON public.price_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: resale_commissions Users can view their own resale commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own resale commissions" ON public.resale_commissions FOR SELECT USING (((seller_id = auth.uid()) OR (buyer_id = auth.uid())));


--
-- Name: notification_retry_logs Users can view their own retry logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own retry logs" ON public.notification_retry_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: roast_profiles Users can view their own roast profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roast profiles" ON public.roast_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sent_reports Users can view their own sent reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sent reports" ON public.sent_reports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: performance_alert_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.performance_alert_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scheduled_task_settings Users can view their own task settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own task settings" ON public.scheduled_task_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: shipment_events Users can view their shipment events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their shipment events" ON public.shipment_events FOR SELECT USING (((shipment_id IN ( SELECT st.id
   FROM (public.shipment_tracking st
     JOIN public.orders o ON ((st.order_id = o.id)))
  WHERE (o.user_id = auth.uid()))) OR public.is_verified_admin(auth.uid())));


--
-- Name: shipment_tracking Users can view tracking for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tracking for their orders" ON public.shipment_tracking FOR SELECT USING (((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.suppliers s ON ((o.supplier_id = s.id)))
  WHERE ((o.id = shipment_tracking.order_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role) AND (user_roles.status = 'approved'::public.account_status))))));


--
-- Name: user_roles Verified admins can update role status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified admins can update role status" ON public.user_roles FOR UPDATE USING ((public.is_verified_admin(auth.uid()) AND (auth.uid() <> user_id)));


--
-- Name: user_roles Verified admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_verified_admin(auth.uid()));


--
-- Name: auction_bids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

--
-- Name: auction_commissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auction_commissions ENABLE ROW LEVEL SECURITY;

--
-- Name: blend_recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blend_recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: coffee_auctions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coffee_auctions ENABLE ROW LEVEL SECURITY;

--
-- Name: coffee_offerings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coffee_offerings ENABLE ROW LEVEL SECURITY;

--
-- Name: coffee_resale; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coffee_resale ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_report_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_report_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: commissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

--
-- Name: cupping_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cupping_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_shipment_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_shipment_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: delayed_shipment_alert_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delayed_shipment_alert_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: delayed_shipment_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delayed_shipment_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_offers_summary_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_offers_summary_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: harvest_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.harvest_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: live_cupping_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_cupping_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_report_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_report_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_supplier_awards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_supplier_awards ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_retry_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_retry_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_expiry_alert_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_expiry_alert_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_expiry_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_expiry_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: pdf_uploads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_alert_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_alert_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_alert_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_alert_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: price_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_request_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: report_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: resale_commissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resale_commissions ENABLE ROW LEVEL SECURITY;

--
-- Name: resale_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resale_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: roast_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roast_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_task_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_task_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: sent_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sent_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: session_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: session_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: session_recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_carriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_classification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_classification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_delayed_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_delayed_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_offers ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_performance_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_performance_history ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_push_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_push_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_notification_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;