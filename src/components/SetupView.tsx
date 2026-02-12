
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const COMPLETE_SQL_SETUP = `-- ALTOQUE FOOD - SUPABASE SETUP SCRIPT
-- This script will completely reset and set up your database schema.
-- It's safe to run multiple times.

-- Part 1: Clean up existing tables (if they exist)
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.promotion_products CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.product_personalizations CASCADE;
DROP TABLE IF EXISTS public.personalization_options CASCADE;
DROP TABLE IF EXISTS public.personalizations CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;


-- Part 2: Create all tables from scratch

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text NULL,
  price numeric NOT NULL DEFAULT 0,
  "imageUrl" text NULL,
  available boolean NOT NULL DEFAULT true,
  "categoryId" uuid NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE public.personalizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    label text NULL,
    allow_repetition boolean NOT NULL DEFAULT false,
    min_selection integer NOT NULL DEFAULT 0,
    max_selection integer NULL,
    CONSTRAINT personalizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.personalization_options (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    personalization_id uuid NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    available boolean NOT NULL DEFAULT true,
    CONSTRAINT personalization_options_pkey PRIMARY KEY (id),
    CONSTRAINT personalization_options_personalization_id_fkey FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

-- TABLA PUENTE (MUCHOS A MUCHOS)
CREATE TABLE public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT fk_personalization FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

CREATE TABLE public.promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    applies_to text NOT NULL,
    start_date date NULL,
    end_date date NULL,
    CONSTRAINT promotions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.promotion_products (
    promotion_id uuid NOT NULL,
    product_id uuid NOT NULL,
    CONSTRAINT promotion_products_pkey PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE,
    CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  rows integer NOT NULL,
  cols integer NOT NULL,
  CONSTRAINT zones_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  zone_id uuid NOT NULL,
  name text NOT NULL,
  "row" integer NOT NULL,
  col integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  shape text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  CONSTRAINT tables_pkey PRIMARY KEY (id),
  CONSTRAINT tables_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE
);

CREATE TABLE public.orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    customer jsonb NOT NULL,
    items jsonb NOT NULL,
    status text NOT NULL DEFAULT 'Pending',
    total numeric NOT NULL,
    branch_id text NULL,
    order_type text NULL,
    table_id text NULL,
    general_comments text NULL,
    payment_status text NOT NULL DEFAULT 'pending',
    tip numeric NULL DEFAULT 0,
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.app_settings (
  id int8 NOT NULL,
  settings jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

INSERT INTO public.app_settings (id, settings) VALUES (1, '{}'::jsonb);

-- Part 3: Enable RLS

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read 2" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read 3" ON public.personalizations FOR SELECT USING (true);
CREATE POLICY "Public Read 4" ON public.personalization_options FOR SELECT USING (true);
CREATE POLICY "Public Read 5" ON public.product_personalizations FOR SELECT USING (true);
CREATE POLICY "Public Read 6" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Public Read 7" ON public.promotion_products FOR SELECT USING (true);
CREATE POLICY "Public Read 8" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Public Read 9" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Public Read 10" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Read 11" ON public.app_settings FOR SELECT USING (true);

-- Allow all for simplicity in demo
CREATE POLICY "All Access" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 2" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 3" ON public.personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 4" ON public.personalization_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 5" ON public.product_personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 6" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 7" ON public.promotion_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 8" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 9" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 10" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All Access 11" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
`;

const PATCH_SQL = `-- PARCHE SQL: Crear tabla faltante
CREATE TABLE IF NOT EXISTS public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT fk_personalization FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

ALTER TABLE public.product_personalizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read 5" ON public.product_personalizations;
CREATE POLICY "Public Read 5" ON public.product_personalizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "All Access 5" ON public.product_personalizations;
CREATE POLICY "All Access 5" ON public.product_personalizations FOR ALL USING (true) WITH CHECK (true);
`;

const CodeBlock: React.FC<{ title: string; code: string; }> = ({ title, code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="bg-[#1c2431] rounded-xl my-6 border border-gray-800">
            <div className="flex justify-between items-center px-4 py-3 bg-[#0f172a]/50 rounded-t-xl">
                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">{title}</p>
                <button onClick={handleCopy} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                    {copied ? <IconCheck className="h-4 w-4 text-green-400" /> : <IconDuplicate className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar código'}
                </button>
            </div>
            <pre className="p-6 text-sm text-left overflow-x-auto custom-scrollbar">
                <code className="text-gray-300 font-mono">{code}</code>
            </pre>
        </div>
    );
};

const SetupView: React.FC = () => {
    return (
        <div className="p-10 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-black mb-4 text-white uppercase tracking-tight">Instalación de Base de Datos</h1>
            <p className="text-gray-400 mb-10 font-medium">
                Para que el módulo de personalizaciones funcione, tu base de datos debe tener la tabla puente <code>product_personalizations</code>.
            </p>

            <div className="space-y-12">
                <section>
                    <h2 className="text-lg font-bold text-emerald-400 mb-2">Opción A: Instalación Completa</h2>
                    <p className="text-sm text-gray-500 mb-4 italic">Recomendado si estás empezando o si el parche no funciona (borra datos actuales).</p>
                    <CodeBlock title="Full SQL Script" code={COMPLETE_SQL_SETUP} />
                </section>

                <section className="bg-emerald-500/5 p-8 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-start gap-4">
                        <IconInfo className="h-8 w-8 text-emerald-500 shrink-0"/>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2">Opción B: Parche Rápido (Recomendado)</h2>
                            <p className="text-sm text-gray-400 mb-6">Usa este script en el SQL Editor de Supabase si ya tienes productos cargados y solo te falta la funcionalidad de personalización masiva.</p>
                            <CodeBlock title="Migration Patch" code={PATCH_SQL} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SetupView;
