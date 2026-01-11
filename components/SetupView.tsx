

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

-- 5. Create promotions table
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

-- 6. Create promotion_products join table
CREATE TABLE public.promotion_products (
    promotion_id uuid NOT NULL,
    product_id uuid NOT NULL,
    CONSTRAINT promotion_products_pkey PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE,
    CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- 7. Create zones table
CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  rows integer NOT NULL,
  cols integer NOT NULL,
  CONSTRAINT zones_pkey PRIMARY KEY (id)
);

-- 8. Create tables table
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

-- 9. Create orders table
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
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- 10. Create app_settings table (single row)
CREATE TABLE public.app_settings (
  id int8 NOT NULL,
  settings jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

-- 11. Insert the single row for settings
INSERT INTO public.app_settings (id, settings) VALUES (1, '{}'::jsonb);


-- Part 3: Enable Row Level Security (RLS) and create policies

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_options ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Allow all users to manage promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage promotion_products" ON public.promotion_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users to manage app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
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

const SecretValueDisplay: React.FC<{ value: string; }> = ({ value }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-md">
            <p className="font-mono text-gray-300 truncate text-sm flex-1">{value}</p>
            <button onClick={handleCopy} className="text-gray-400 hover:text-white flex-shrink-0 p-1" title="Copy value to clipboard">
                {copied ? <IconCheck className="h-4 w-4 text-green-400" /> : <IconDuplicate className="h-4 w-4" />}
            </button>
        </div>
    );
};


const SetupView: React.FC = () => {
    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen flex items-center justify-center font-sans p-4">
            <div className="w-full max-w-4xl mx-auto">
                <div className="bg-gray-800 shadow-2xl rounded-xl p-6 sm:p-8 border border-gray-700">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Configuración Requerida</h1>
                        <p className="text-md sm:text-lg text-gray-400">Conecta tu aplicación a una base de datos Supabase en 3 simples pasos.</p>
                    </div>

                     <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-start gap-x-3 text-sm text-yellow-200 mb-8">
                        <IconInfo className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold">¿Por qué veo esta pantalla?</h3>
                            <p>Esta guía aparece porque la aplicación necesita tus credenciales de Supabase. Para que funcione, debes añadirlas en un lugar seguro llamado <strong className="font-semibold text-yellow-300">"Secrets"</strong> en el panel de AI Studio.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h2 className="text-2xl font-semibold flex items-center"><span className="text-3xl mr-3 text-emerald-400">1.</span> Crea tu Base de Datos</h2>
                            <p className="mt-2 text-gray-400">
                                Si aún no tienes una, ve a <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">Supabase</a> para crear un nuevo proyecto.
                                Una vez creado, busca tu <strong className="font-semibold text-yellow-400">URL del Proyecto</strong> y tu <strong className="font-semibold text-yellow-400">Clave API anónima (anon key)</strong>. Las necesitarás en el paso 3.
                            </p>
                             <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
                                Ir a Supabase <IconExternalLink className="h-4 w-4"/>
                            </a>
                        </div>
                        
                        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h2 className="text-2xl font-semibold flex items-center"><span className="text-3xl mr-3 text-emerald-400">2.</span> Prepara tu Base de Datos</h2>
                            <p className="mt-2 text-gray-400">En el <strong className="font-semibold text-gray-300">Editor SQL</strong> de tu proyecto de Supabase, copia y ejecuta el siguiente script. Se encargará de todo.</p>
                            
                            <CodeBlock title="Script de Configuración Completo" code={COMPLETE_SQL_SETUP} />
                        </div>

                        <div className="p-6 bg-gray-800/50 rounded-lg border-2 border-emerald-500">
                            <h2 className="text-2xl font-semibold flex items-center"><span className="text-3xl mr-3 text-emerald-400">3.</span> Configura tus Secrets</h2>
                            <p className="mt-2 text-gray-400"><strong className="font-bold">Este es el paso crucial.</strong> Sigue esta ruta en el panel de AI Studio:</p>
                            <div className="my-4 text-center">
                                <p className="font-mono text-gray-300 bg-gray-900/80 p-3 rounded-lg inline-flex items-center gap-2 flex-wrap justify-center">
                                    <IconKey className="h-5 w-5 text-yellow-400"/>
                                    <span className="font-semibold">Secrets</span>
                                    <span className="text-emerald-400 mx-1">➡️</span>
                                    <span className="p-2 bg-emerald-600 text-white rounded-md font-bold text-sm">+ Add new secret</span>
                                </p>
                            </div>
                            <p className="text-gray-400 my-4">Crea los siguientes <strong className="font-bold text-white">dos</strong> secrets. Copia el nombre y el valor para cada uno.</p>
                            
                            <div className="space-y-6">
                                {/* Secret 1: URL */}
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <p className="text-sm font-semibold text-gray-300 mb-2">Secret #1</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del Secret (Cópialo)</label>
                                            <SecretValueDisplay value="SUPABASE_URL" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Valor del Secret (Copia tu URL)</label>
                                            <SecretValueDisplay value="https://cnbntnnhxlvkvallumdg.supabase.co" />
                                        </div>
                                    </div>
                                </div>

                                {/* Secret 2: Key */}
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <p className="text-sm font-semibold text-gray-300 mb-2">Secret #2</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del Secret (Cópialo)</label>
                                            <SecretValueDisplay value="SUPABASE_ANON_KEY" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Valor del Secret (Copia tu Clave Anónima)</label>
                                            <SecretValueDisplay value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYm50bm5oeGx2a3ZhbGx1bWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjQ1MjksImV4cCI6MjA3ODY0MDUyOX0.TuovcK2Ao2tb3GM0I2j5n2BpL5DIVLSl-yjdoCHS9pM" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center pt-6">
                             <button
                                onClick={() => window.location.reload()}
                                className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-emerald-700 transition-transform transform hover:scale-105 shadow-lg"
                            >
                                ¡Todo listo! Iniciar la Aplicación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
