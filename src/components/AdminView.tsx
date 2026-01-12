import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Order, OrderStatus, OrderType } from '../types';
import { getActiveOrders, subscribeToNewOrders, unsubscribeFromChannel } from '../services/supabaseService';
import { 
    IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, 
    IconCalendar, IconChevronDown, IconX, IconReceipt, IconExternalLink, 
    IconSettings, IconChevronUp, IconMoon, IconSun, IconSearch
} from '../constants';

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'availability' | 'share' | 'tutorials';

const PAGE_TITLES: { [key in AdminViewPage]: string } = {
    dashboard: 'Inicio',
    products: 'Menú',
    orders: 'Pedidos',
    availability: 'Disponibilidad',
    share: 'Compartir',
    tutorials: 'Tutoriales'
};

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void }> = ({ currentPage, setCurrentPage }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome className="h-5 w-5" /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders className="h-5 w-5" /> },
        { id: 'products', name: 'Menú', icon: <IconMenu className="h-5 w-5" /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability className="h-5 w-5" /> },
        { id: 'share', name: 'Compartir', icon: <IconShare className="h-5 w-5" /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials className="h-5 w-5" /> },
    ];
    return (
        <aside className="w-64 bg-[#1e2533] dark:bg-[#111827] flex flex-col border-r border-gray-800/40 shrink-0">
            <div className="h-20 flex items-center px-8 border-b border-gray-800/40">
                 <div className="flex items-center space-x-3 cursor-pointer group">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        <span className="text-white font-black text-xs">AF</span>
                    </div>
                    <h2 className="text-lg font-black text-white tracking-tighter uppercase">ALTOQUE FOOD</h2>
                    <IconChevronDown className="h-4 w-4 text-gray-500" />
                </div>
            </div>
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-xl transition-all duration-200 group ${currentPage === item.id ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                    >
                        <span className={currentPage === item.id ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}>{item.icon}</span>
                        <span className="text-sm tracking-wide">{item.name}</span>
                    </button>
                ))}
            </nav>
            <div className="p-6 border-t border-gray-800/40">
                <div className="bg-[#242e42] dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-700/30">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Soporte Directo</p>
                    <p className="text-sm font-black text-white">+584146945877</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase">Atención activa</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const Header: React.FC<{ title: string; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ title, theme, toggleTheme }) => (
    <header className="h-20 bg-[#1e2533] dark:bg-[#111827] border-b border-gray-800/40 flex items-center justify-between px-10 shrink-0">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
        <div className="flex items-center space-x-8">
            <a href="#/menu" target="_blank" className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-emerald-400 transition-colors uppercase tracking-widest">
                <span>Menú digital</span>
                <IconExternalLink className="h-4 w-4" />
            </a>
            <div className="flex items-center space-x-4 border-l border-gray-800 pl-8">
                 <span className="text-xs font-bold text-gray-400 hover:text-white cursor-pointer uppercase tracking-widest">Configuración</span>
                <button onClick={toggleTheme} className="p-2.5 text-gray-400 hover:bg-gray-800 rounded-xl transition-all">
                    {theme === 'light' ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
                </button>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                    <span className="text-emerald-500 font-black text-sm">A</span>
                </div>
            </div>
        </div>
    </header>
);

const Dashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterTime, setFilterTime] = useState<'Hoy' | 'Ayer' | 'Semana'>('Hoy');

    useEffect(() => {
        getActiveOrders().then(data => {
            setOrders(data);
            setIsLoading(false);
        });
        
        const channel = subscribeToNewOrders(
            (o) => setOrders(prev => [o, ...prev]), 
            (u) => setOrders(prev => prev.map(o => o.id === u.id ? u : o))
        );
        return () => unsubscribeFromChannel();
    }, []);

    // Lógica de cálculo inteligente
    const stats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);

        const getPeriodStats = (orderList: Order[]) => {
            const sales = orderList.reduce((acc, o) => acc + (o.status !== OrderStatus.Cancelled ? o.total : 0), 0);
            const count = orderList.length;
            const envios = orderList.filter(o => o.orderType === OrderType.Delivery).length;
            const tips = 0; // Se podría extraer del payload de orden si se habilitara
            return { sales, count, envios, tips };
        };

        const todayOrders = orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday);
        const yesterdayOrders = orders.filter(o => {
            const time = new Date(o.createdAt).getTime();
            return time >= startOfYesterday && time < startOfToday;
        });

        const current = getPeriodStats(todayOrders);
        const previous = getPeriodStats(yesterdayOrders);

        return { current, previous };
    }, [orders]);

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
    );

    const ticketPromedio = stats.current.count > 0 ? (stats.current.sales / stats.current.count).toFixed(2) : "0.00";

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Banner de Nueva Funcionalidad */}
            <div className="bg-[#1e2533] border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div className="space-y-1">
                    <h3 className="text-white font-bold text-base">Nueva funcionalidad</h3>
                    <p className="text-gray-400 text-xs font-medium">Conoce las comandas digitales (KDS).</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="bg-[#008f68] hover:bg-[#007a59] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg">
                        Ver detalles de actualización
                    </button>
                    <button className="text-gray-500 hover:text-white p-2 transition-colors"><IconX className="h-5 w-5"/></button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-4">
                <button className="flex items-center gap-2 bg-[#2a3447] border border-gray-700/50 px-4 py-2.5 rounded-xl text-sm text-gray-200 font-bold hover:bg-[#323d54] transition-all">
                    <IconCalendar className="h-4 w-4 text-emerald-500" />
                    Hoy
                    <IconChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                </button>
                <button className="flex items-center gap-2 bg-[#2a3447] border border-gray-700/50 px-4 py-2.5 rounded-xl text-sm text-gray-200 font-bold hover:bg-[#323d54] transition-all">
                    Canal de venta: Todos
                    <IconChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                </button>
            </div>

            {/* Grid de Cards Inteligentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Ventas', value: `$${stats.current.sales.toFixed(2)}`, prev: `$${stats.previous.sales.toFixed(2)}` },
                    { label: 'Pedidos', value: stats.current.count.toString(), prev: stats.previous.count.toString() },
                    { label: 'Envíos', value: stats.current.envios.toString(), prev: stats.previous.envios.toString() },
                    { label: 'Propinas', value: `$${stats.current.tips.toFixed(2)}`, prev: `$${stats.previous.tips.toFixed(2)}` },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#1e2533] p-7 rounded-[1.5rem] border border-gray-800/50 shadow-2xl transition-all hover:border-emerald-500/20">
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-4">{stat.label}</p>
                        <div className="space-y-1">
                            <h4 className="text-4xl font-black text-white tracking-tighter">{stat.value}</h4>
                            <p className="text-xs font-bold text-gray-500/80">{stat.prev}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secciones de Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1e2533] p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl flex flex-col justify-between group">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">Ticket promedio</p>
                    <div className="flex items-center justify-center py-8">
                         <span className="text-7xl font-black text-gray-800/30 tracking-tighter group-hover:text-emerald-500/10 transition-colors">
                            ${ticketPromedio}
                         </span>
                    </div>
                </div>
                <div className="bg-[#1e2533] p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl flex flex-col justify-between group">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">Métodos de pago más usados</p>
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                         <div className="w-full bg-gray-800/50 h-3 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-2/3 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                         </div>
                         <div className="w-full flex justify-between text-[10px] font-black text-gray-500 uppercase">
                             <span>Efectivo (66%)</span>
                             <span>Digital (34%)</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Barra flotante inferior de prueba */}
            <div className="fixed bottom-8 right-10 z-[100]">
                <button className="bg-[#242e42] hover:bg-[#2c3851] text-gray-300 px-6 py-3.5 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-700/60 transition-all active:scale-95 group">
                    <span className="text-sm font-bold text-white/90">Estás en tu periodo de prueba</span>
                    <IconChevronUp className="h-4 w-4 text-emerald-500 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [theme, toggleTheme] = useTheme();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#111827] font-sans text-gray-200 overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    title={PAGE_TITLES[currentPage]} 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    onSettingsClick={() => setIsSettingsOpen(true)}
                />
                <main className="flex-1 overflow-auto p-10 bg-[#161d2a]">
                    <div className="max-w-6xl mx-auto h-full">
                        {currentPage === 'dashboard' ? <Dashboard /> : (
                            <div className="p-20 text-center bg-[#1e2533] rounded-[3rem] border border-gray-800 text-gray-500 uppercase font-black tracking-widest animate-pulse">
                                Módulo {PAGE_TITLES[currentPage]} en desarrollo
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #374151; }
            `}</style>
        </div>
    );
};

export default AdminView;
