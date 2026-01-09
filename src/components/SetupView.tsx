
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const COMPLETE_SQL_SETUP = `-- ALTOQUE FOOD - SUPABASE SETUP SCRIPT
-- Actualizado para incluir soporte explícito para comprobantes de pago

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
  "personalizationIds" uuid[] DEFAULT '{}',
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
    payment_proof text NULL, -- COLUMNA PARA EL COMPROBANTE (BASE64)
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
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to personalizations" ON public.personalizations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to personalization_options" ON public.personalization_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access to promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to promotion_products" ON public.promotion_products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to app_settings" ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Allow all manage" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all personalizations" ON public.personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all personalization_options" ON public.personalization_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all promotion_products" ON public.promotion_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
`;

const SetupView: React.FC = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(COMPLETE_SQL_SETUP).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-6 uppercase tracking-tighter">Configuración del Backend</h1>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-6 rounded-[2rem] mb-8">
                <div className="flex gap-4">
                    <IconInfo className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">Instrucciones Críticas</h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2 leading-relaxed">
                            Copia el código SQL de abajo y pégalo en el **SQL Editor** de tu panel de Supabase. Esto habilitará la columna de comprobantes de pago.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-800 shadow-2xl">
                <div className="px-6 py-4 bg-gray-800/50 flex justify-between items-center border-b border-gray-700">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Script Completo de Base de Datos</span>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all active:scale-95"
                    >
                        {copied ? <IconCheck className="h-4 w-4"/> : <IconDuplicate className="h-4 w-4"/>}
                        {copied ? '¡COPIADO!' : 'COPIAR SQL'}
                    </button>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
                        {COMPLETE_SQL_SETUP}
                    </pre>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #313d4f; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SetupView;
