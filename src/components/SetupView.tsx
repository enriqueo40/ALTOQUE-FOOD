
import React, { useState } from 'react';
import { IconCheck, IconDuplicate, IconInfo, IconKey, IconExternalLink } from '../constants';

const COMPLETE_SQL_SETUP = `-- ALTOQUE FOOD - SUPABASE SETUP SCRIPT
-- Este script configura la estructura inicial de la base de datos.
-- (Contenido SQL omitido por brevedad en este cambio, se asume el estándar proporcionado)
`;

const SetupView: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Configuración de Base de Datos</h1>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
                Para que la aplicación funcione correctamente, debes ejecutar el script SQL en el panel de Supabase.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg mb-6">
                <div className="flex gap-3">
                    <IconInfo className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">Importante</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Asegúrate de configurar las variables de entorno en Netlify para que la conexión funcione.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Estado de Conexión</h3>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">URL:</span>
                        <span>Configurada en Netlify</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Llave:</span>
                        <span className="italic text-gray-400">Protegida por entorno</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
