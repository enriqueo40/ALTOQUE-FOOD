import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Order, OrderStatus, OrderType } from '../types';
import { getActiveOrders, subscribeToNewOrders, unsubscribeFromChannel, updateOrder } from '../services/supabaseService';
import { 
    IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, 
    IconCalendar, IconChevronDown, IconX, IconReceipt, IconExternalLink, 
    IconSettings, IconChevronUp, IconMoon, IconSun, IconSearch, IconCheck, IconTrash, IconPencil, IconDuplicate, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconToggleOff, IconWhatsapp, IconLocationMarker
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

    // Lógica de cálculo inteligente para el Dashboard basada en los screenshots
    const dashboardStats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);

        const getStatsForRange = (rangeOrders: Order[]) => {
            const validOrders = rangeOrders.filter(o => o.status !== OrderStatus.Cancelled);
            const sales = validOrders.reduce((acc, o) => acc + o.total, 0);
            const orderCount = validOrders.length;
            const shippingCount = validOrders.filter(o => o.orderType === OrderType.Delivery).length;
            
            // Intentar extraer propinas de los comentarios si existe un patrón como "Propina: $XX.XX"
            let tips = 0;
            validOrders.forEach(o => {
                if (o.generalComments) {
                    const match = o.generalComments.match(/Propina:?\s*[A-Z$]*\s*([\d.]+)/i);
                    if (match && match[1]) tips += parseFloat(match[1]);
                }
            });

            return { sales, orderCount, shippingCount, tips };
        };

        const todayOrders = orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday);
        const yesterdayOrders = orders.filter(o => {
            const time = new Date(o.createdAt).getTime();
            return time >= startOfYesterday && time < startOfToday;
        });

        return {
            current: getStatsForRange(todayOrders),
            previous: getStatsForRange(yesterdayOrders)
        };
    }, [orders]);

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full shadow-lg shadow-emerald-500/20"></div>
        </div>
    );

    const ticketPromedio = dashboardStats.current.orderCount > 0 
        ? (dashboardStats.current.sales / dashboardStats.current.orderCount).toFixed(2) 
        : "0.00";

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            {/* Banner de Nueva Funcionalidad */}
            <div className="bg-[#042f2e]/40 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div className="space-y-1">
                    <h3 className="text-white font-bold text-base leading-tight">Nueva funcionalidad</h3>
                    <p className="text-emerald-500/70 text-xs font-medium">Conoce las comandas digitales (KDS).</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="bg-[#008f68] hover:bg-[#007a59] text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-wide">
                        Ver detalles de actualización
                    </button>
                    <button className="text-gray-500 hover:text-white p-2 transition-colors"><IconX className="h-5 w-5"/></button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-4">
                <button className="flex items-center gap-2 bg-[#2a3447] border border-gray-700/50 px-5 py-3 rounded-2xl text-sm text-gray-200 font-bold hover:bg-[#323d54] transition-all">
                    <IconCalendar className="h-4 w-4 text-gray-400" />
                    Hoy
                    <IconChevronDown className="h-4 w-4 text-gray-500 ml-1 opacity-50" />
                </button>
                <button className="flex items-center gap-2 bg-[#2a3447] border border-gray-700/50 px-5 py-3 rounded-2xl text-sm text-gray-200 font-bold hover:bg-[#323d54] transition-all">
                    Canal de venta: Todos
                    <IconChevronDown className="h-4 w-4 text-gray-500 ml-1 opacity-50" />
                </button>
            </div>

            {/* Grid de KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Ventas', value: `$${dashboardStats.current.sales.toFixed(2)}`, prev: `$${dashboardStats.previous.sales.toFixed(2)}` },
                    { label: 'Pedidos', value: dashboardStats.current.orderCount.toString(), prev: dashboardStats.previous.orderCount.toString() },
                    { label: 'Envíos', value: dashboardStats.current.shippingCount.toString(), prev: dashboardStats.previous.shippingCount.toString() },
                    { label: 'Propinas', value: `$${dashboardStats.current.tips.toFixed(2)}`, prev: `$${dashboardStats.previous.tips.toFixed(2)}` },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#1e2533] p-8 rounded-[2rem] border border-gray-800/50 shadow-2xl transition-all hover:border-emerald-500/20 group">
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 group-hover:text-gray-400 transition-colors">{stat.label}</p>
                        <div className="space-y-1">
                            <h4 className="text-5xl font-black text-white tracking-tighter">{stat.value}</h4>
                            <p className="text-xs font-bold text-gray-500/60">{stat.prev}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Insights secundarios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1e2533] p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl flex flex-col justify-between group min-h-[16rem] relative overflow-hidden">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] relative z-10">Ticket promedio</p>
                    <div className="flex items-center justify-center py-4 relative z-10">
                         <span className="text-8xl font-black text-gray-800/20 tracking-tighter group-hover:text-emerald-500/5 transition-colors duration-700">
                            ${ticketPromedio}
                         </span>
                    </div>
                </div>
                <div className="bg-[#1e2533] p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl flex flex-col justify-between group min-h-[16rem]">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Métodos de pago más usados</p>
                    <div className="flex flex-col items-center justify-center py-6 space-y-6">
                         <div className="w-full space-y-2">
                             <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                 <span>Efectivo</span>
                                 <span>66%</span>
                             </div>
                             <div className="w-full bg-gray-800/50 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[66%] shadow-[0_0_15px_rgba(16,185,129,0.2)]"></div>
                             </div>
                         </div>
                         <div className="w-full space-y-2">
                             <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                 <span>Digital / Transferencia</span>
                                 <span>34%</span>
                             </div>
                             <div className="w-full bg-gray-800/50 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-400 h-full w-[34%] opacity-40"></div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Badge flotante inferior */}
            <div className="fixed bottom-8 right-10 z-[100]">
                <button className="bg-[#242e42] hover:bg-[#2c3851] text-gray-300 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-700/60 transition-all active:scale-95 group">
                    <span className="text-sm font-black text-white/90 uppercase tracking-tight">Estás en tu periodo de prueba</span>
                    <IconChevronUp className="h-5 w-5 text-emerald-500 group-hover:-translate-y-1 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

// Componente de pedidos rediseñado para la pestaña de pedidos
const OrderBoardView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getActiveOrders().then(data => { setOrders(data); setIsLoading(false); });
        subscribeToNewOrders((o) => setOrders(prev => [o, ...prev]), (u) => setOrders(prev => prev.map(o => o.id === u.id ? u : o)));
        return () => unsubscribeFromChannel();
    }, []);

    if (isLoading) return <div className="p-20 text-center text-gray-500 uppercase font-black tracking-widest animate-pulse">Sincronizando...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(o => (
                <div key={o.id} className="bg-[#1e2533] p-8 rounded-[2.5rem] border border-gray-800/60 shadow-2xl transition-all hover:border-emerald-500/30 hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">#{o.id.slice(0,6).toUpperCase()}</span>
                                <span className="text-[10px] font-bold text-gray-500">{new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                             <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">{o.customer.name}</h3>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            o.status === OrderStatus.Pending ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 
                            o.status === OrderStatus.Confirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                            'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>{o.status}</span>
                    </div>
                    <div className="space-y-3 mb-8">
                        {o.items.map(i => (
                            <div key={i.cartItemId} className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-400">{i.quantity}x {i.name}</span>
                                <span className="text-gray-200">${(i.price * i.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-gray-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
                            <span className="text-2xl font-black text-white tracking-tighter">${o.total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => updateOrder(o.id, {status: OrderStatus.Confirmed})} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-2xl transition-all shadow-lg shadow-emerald-900/40">
                                <IconCheck className="h-5 w-5"/>
                            </button>
                            <button onClick={() => updateOrder(o.id, {status: OrderStatus.Cancelled})} className="bg-[#1e2533] border border-gray-700 hover:border-red-500 text-gray-500 hover:text-red-500 p-3 rounded-2xl transition-all">
                                <IconTrash className="h-5 w-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            {orders.length === 0 && (
                <div className="col-span-full py-40 text-center bg-[#1e2533] rounded-[3rem] border border-dashed border-gray-700">
                    <p className="text-gray-500 font-bold uppercase tracking-[0.3em]">Sin pedidos por el momento</p>
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [theme, toggleTheme] = useTheme();

    const renderContent = () => {
        switch(currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'orders': return <OrderBoardView />;
            default: return (
                <div className="py-40 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                        <IconSettings className="h-12 w-12 text-emerald-500 animate-spin-slow" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-4">Módulo en Desarrollo</h2>
                    <p className="text-gray-500 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest opacity-50">Estamos construyendo la mejor experiencia para gestionar tu negocio.</p>
                </div>
            );
        }
    };

    return (
        <div className="flex h-screen bg-[#111827] font-sans selection:bg-emerald-500 selection:text-white overflow-hidden text-gray-200">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header title={PAGE_TITLES[currentPage]} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-10 bg-[#161d2a] relative">
                    <div className="max-w-6xl mx-auto h-full">{renderContent()}</div>
                </main>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; border: 2px solid #161d2a; }
                ::-webkit-scrollbar-thumb:hover { background: #374151; }
            `}</style>
        </div>
    );
};

export default AdminView;
