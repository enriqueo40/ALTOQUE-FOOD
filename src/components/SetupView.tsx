
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const PATCH_SQL = `-- ALTOQUE FOOD - PARCHE PARA COMPROBANTES DE PAGO
-- Ejecuta este código en el SQL Editor de Supabase para habilitar las fotos de pago

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_proof text NULL;

COMMENT ON COLUMN public.orders.payment_proof IS 'Guarda la captura de pantalla del pago en formato Base64';
`;

const SetupView: React.FC = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(PATCH_SQL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-6 uppercase tracking-tighter">Mantenimiento de Base de Datos</h1>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-6 rounded-[2rem] mb-8">
                <div className="flex gap-4">
                    <IconInfo className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 text-lg">Habilitar Fotos de Pago</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 leading-relaxed">
                            Si tus clientes no pueden subir su captura de pago, es probable que tu base de datos no tenga la columna necesaria. Copia el parche de abajo y ejecútalo en Supabase.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-800 shadow-2xl">
                <div className="px-6 py-4 bg-gray-800/50 flex justify-between items-center border-b border-gray-700">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Script de Parche SQL</span>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all active:scale-95"
                    >
                        {copied ? <IconCheck className="h-4 w-4"/> : <IconDuplicate className="h-4 w-4"/>}
                        {copied ? '¡COPIADO!' : 'COPIAR PARCHE'}
                    </button>
                </div>
                <div className="p-6">
                    <pre className="text-blue-400 font-mono text-xs leading-relaxed overflow-x-auto">
                        {PATCH_SQL}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
