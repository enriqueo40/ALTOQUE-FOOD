
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';

// LOG DE CONTROL PARA VERIFICAR DESPLIEGUE - VERSIÓN OMNI
console.log("%c 🚀 ALTOQUE FOOD V6.1_OMNI_DEPLOY - PLATFORM READY", "background: #7e22ce; color: white; font-weight: bold; font-size: 18px; padding: 5px; border-radius: 5px;");

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
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">Página no encontrada</p>
        <div className="mt-8">
            <a href="#/menu" className="px-6 py-2 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-all">
                Ir al Menú
            </a>
        </div>
    </div>
);

export default App;
