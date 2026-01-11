
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';

// ETIQUETA GLOBAL DE VERIFICACIÓN - SI NO VES ESTO EN LA CONSOLA, EL CÓDIGO NO SE HA ACTUALIZADO
console.log("%c ALTOQUE FOOD SYSTEM v3.0 - ACTIVADO", "color: #10b981; font-weight: bold; font-size: 20px;");

function App() {
    return (
        <HashRouter>
            <div className="min-h-screen">
                <Routes>
                    <Route path="/" element={<AdminView />} />
                    <Route path="/menu" element={<CustomerView />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </HashRouter>
    );
}

const NotFound: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <h1 className="text-6xl font-bold text-gray-800 dark:text-gray-200">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">Page Not Found</p>
        <div className="mt-8 space-x-4">
            <a href="#/menu" className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
                Go to Menu
            </a>
            <a href="#/" className="px-6 py-2 text-sm font-semibold text-emerald-600 bg-white border border-emerald-600 rounded-md hover:bg-emerald-50 dark:bg-gray-800 dark:text-gray-200 dark:border-emerald-500 dark:hover:bg-gray-700">
                Go to Admin
            </a>
        </div>
    </div>
);

export default App;
