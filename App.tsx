
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

// Lazy load the main views to reduce initial bundle size
const CustomerView = lazy(() => import('./components/CustomerView'));
const AdminView = lazy(() => import('./components/AdminView'));

// Chic Loading Screen Component
const GlobalLoader = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">APP</span>
            </div>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Cargando experiencia...</p>
    </div>
);

function App() {
    return (
        <HashRouter>
            <div className="min-h-screen">
                <Suspense fallback={<GlobalLoader />}>
                    <Routes>
                        <Route path="/" element={<AdminView />} />
                        <Route path="/menu" element={<CustomerView />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </div>
        </HashRouter>
    );
}

const NotFound: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <h1 className="text-6xl font-bold text-gray-800 dark:text-gray-200">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">Page Not Found</p>
        <div className="mt-8 space-x-4">
            <a href="#/menu" className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors">
                Ir al Menú
            </a>
            <a href="#/" className="px-6 py-2 text-sm font-semibold text-emerald-600 bg-white border border-emerald-600 rounded-md hover:bg-emerald-50 dark:bg-gray-800 dark:text-gray-200 dark:border-emerald-500 dark:hover:bg-gray-700 transition-colors">
                Ir al Admin
            </a>
        </div>
    </div>
);

export default App;
