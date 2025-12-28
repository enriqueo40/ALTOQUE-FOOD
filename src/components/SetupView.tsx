
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const COMPLETE_SQL_SETUP = `-- ALTOQUE FOOD - SUPABASE SETUP SCRIPT
-- Este script configura la estructura inicial de la base de datos.

DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.promotion_products CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.personalization_options CASCADE;
DROP TABLE IF EXISTS public.product_personalizations CASCADE;
DROP TABLE IF EXISTS public.personalizations CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

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

CREATE TABLE public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT product_personalizations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT product_personalizations_personalization_id_fkey FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
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
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.app_settings (
  id int8 NOT NULL,
  settings jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

INSERT INTO public.app_settings (id, settings) VALUES (1, '{}'::jsonb);

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

CREATE POLICY "Allow public read access" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.personalizations FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.personalization_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.product_personalizations FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.promotion_products FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Allow all manage" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.personalization_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.product_personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.promotion_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all manage" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
`;

const PATCH_SQL = `-- Parche SQL: Agregar tabla intermedia para personalizaciones
CREATE TABLE IF NOT EXISTS public.product_personalizations (
    product_id uuid NOT NULL,
    personalization_id uuid NOT NULL,
    CONSTRAINT product_personalizations_pkey PRIMARY KEY (product_id, personalization_id),
    CONSTRAINT product_personalizations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT product_personalizations_personalization_id_fkey FOREIGN KEY (personalization_id) REFERENCES public.personalizations(id) ON DELETE CASCADE
);

ALTER TABLE public.product_personalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to product_personalizations" ON public.product_personalizations FOR SELECT USING (true);
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
    // Obtenemos de process.env para mostrar solo si existen, evitando strings hardcoded en el repo.
    const url = process.env.SUPABASE_URL || "Configurada en variables de entorno";
    
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Configuración de Base de Datos</h1>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
                Para que la aplicación funcione correctamente, debes ejecutar el siguiente script SQL en el editor SQL de tu panel de Supabase.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg mb-6">
                <div className="flex gap-3">
                    <IconInfo className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">Importante</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Asegúrate de configurar las variables de entorno en Netlify (SUPABASE_URL y SUPABASE_ANON_KEY) para que la conexión funcione.
                        </p>
                    </div>
                </div>
            </div>

            <CodeBlock title="Script de Configuración Completa" code={COMPLETE_SQL_SETUP} />
            <CodeBlock title="Parche SQL (Solo Personalizaciones)" code={PATCH_SQL} />

            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Estado de Conexión</h3>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">URL del Proyecto:</span>
                        <span>{url}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Llave de API:</span>
                        <span className="italic text-gray-400">Protegida por Netlify</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
