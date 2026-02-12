
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const COMPLETE_SQL_SETUP = `-- ALTOQUE FOOD - SUPABASE SETUP SCRIPT
-- This script will completely reset and set up your database schema.
-- It's safe to run multiple times.

-- Part 1: Clean up existing tables (if they exist)
-- Using CASCADE to automatically drop dependent objects like policies.
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

-- 1. Create the categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- 2. Create the products table
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

-- 3. Create personalizations table
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

-- 4. Create personalization_options table
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

-- 5. Create product_personalizations join table (NEW)
CREATE TABLE public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT fk_personalization FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

-- 6. Create promotions table
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

-- 7. Create promotion_products join table
CREATE TABLE public.promotion_products (
    promotion_id uuid NOT NULL,
    product_id uuid NOT NULL,
    CONSTRAINT promotion_products_pkey PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE,
    CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- 8. Create zones table
CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  rows integer NOT NULL,
  cols integer NOT NULL,
  CONSTRAINT zones_pkey PRIMARY KEY (id)
);

-- 9. Create tables table
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

-- 10. Create orders table
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

-- 11. Create app_settings table (single row)
CREATE TABLE public.app_settings (
  id int8 NOT NULL,
  settings jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

-- 12. Insert the single row for settings
INSERT INTO public.app_settings (id, settings) VALUES (1, '{}'::jsonb);


-- Part 3: Enable Row Level Security (RLS) and create policies

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

CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to personalizations" ON public.personalizations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to personalization_options" ON public.personalization_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access to product_personalizations" ON public.product_personalizations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to promotion_products" ON public.promotion_products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to app_settings" ON public.app_settings FOR SELECT USING (true);

-- For this demo, we allow any user (including anonymous) to write.
-- For a production app, you would restrict this to authenticated users.
CREATE POLICY "Allow all users to manage categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage personalizations" ON public.personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage personalization_options" ON public.personalization_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage product_personalizations" ON public.product_personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage promotion_products" ON public.promotion_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
`;

const PATCH_SQL = `-- Parche SQL: Crear tabla 'product_personalizations' si no existe
CREATE TABLE IF NOT EXISTS public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT fk_personalization FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

ALTER TABLE public.product_personalizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to product_personalizations" ON public.product_personalizations;
CREATE POLICY "Allow public read access to product_personalizations" ON public.product_personalizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all users to manage product_personalizations" ON public.product_personalizations;
CREATE POLICY "Allow all users to manage product_personalizations" ON public.product_personalizations FOR ALL USING (true) WITH CHECK (true);
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
        <div className="bg-gray-900/50 rounded-lg my-4 border border-gray-700">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800/60 rounded-t-lg">
                <p className="text-sm font-semibold text-gray-300">{title}</p>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white font-medium px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                    {copied ? <IconCheck className="h-4 w-4 text-green-400" /> : <IconDuplicate className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                </button>
            </div>
            <pre className="p-4 text-sm text-left overflow-x-auto">
                <code className="language-sql text-gray-200">{code}</code>
            </pre>
        </div>
    );
};

const SetupView: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Instalación de Base de Datos</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                Copia y ejecuta estos comandos en el editor SQL de tu panel de Supabase para configurar la base de datos necesaria para la aplicación.
            </p>

            <CodeBlock title="Script de Instalación Completa" code={COMPLETE_SQL_SETUP} />
            
            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                    <IconInfo className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">¿Ya tienes datos?</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Si ya usaste el script anterior y solo necesitas agregar la funcionalidad de personalizaciones sin borrar tus productos existentes, usa el siguiente parche:
                        </p>
                    </div>
                </div>
            </div>

            <CodeBlock title="Parche: Tabla de Personalizaciones por Producto" code={PATCH_SQL} />
        </div>
    );
};

export default SetupView;
