
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Product, Order, OrderStatus, OrderType, Category, Personalization, Promotion, AppSettings, PaymentStatus } from '../types';
import { getActiveOrders, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getProducts, getCategories, getAppSettings, getPromotions, getPersonalizations } from '../services/supabaseService';
import { IconHome, IconMenu, IconAvailability, IconShare, IconOrders, IconMoon, IconSun, IconReceipt, IconCheck, IconX, IconMoreVertical, IconDelivery, IconStore, IconPlus, IconClock } from '../constants';

type AdminViewPage = 'dashboard' | 'orders' | 'products' | 'availability' | 'share';

// --- Sonic Engine: Web Audio API Arpeggio ---
const playNewOrderSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioCtx.currentTime;
        const playTone = (freq: number, start: number, vol: number = 0.1) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(vol, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.8);
        };
        playTone(523.25, now);       // C5
        playTone(659.25, now + 0.1); // E5
        playTone(783.99, now + 0.2); // G5
        playTone(987.77, now + 0.3); // B5
    } catch (e) { console.warn("Audio blocked by browser policy."); }
};

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
    const colors = {
        [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
        [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
        [OrderStatus.Preparing]: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
        [OrderStatus.Ready]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
        [OrderStatus.Delivering]: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
        [OrderStatus.Completed]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
        [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${colors[status]}`}>{status}</span>;
};

const OrderCard: React.FC<{ order: Order; onAdvance: (o: Order) => void }> = ({ order, onAdvance }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                 <div className={`p-2 rounded-xl ${order.orderType === OrderType.Delivery ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {order.orderType === OrderType.Delivery ? <IconDelivery className="h-4 w-4"/> : <IconStore className="h-4 w-4"/>}
                 </div>
                 <div>
                     <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tighter truncate w-32">{order.customer.name}</p>
                     <p className="text-[10px] text-gray-400 font-bold font-mono">#{order.id.slice(0, 5).toUpperCase()}</p>
                 </div>
            </div>
            <div className="text-right">
                <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">${order.total.toFixed(2)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
        
        <div className="space-y-1 mb-4 max-h-24 overflow-y-auto no-scrollbar">
            {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-[11px] text-gray-600 dark:text-gray-400">
                    <span className="truncate flex-1"><span className="font-black text-gray-800 dark:text-gray-200 mr-1">{item.quantity}x</span> {item.name}</span>
                </div>
            ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t dark:border-gray-700">
             <button 
                onClick={() => onAdvance(order)}
                className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center gap-2"
             >
                <IconCheck className="h-3 w-3"/> Avanzar Estado
             </button>
        </div>
    </div>
);

const KanbanBoard: React.FC<{ orders: Order[]; onUpdateStatus: (id: string, s: OrderStatus) => void }> = ({ orders, onUpdateStatus }) => {
    const statuses = [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Delivering];
    
    const handleAdvance = (order: Order) => {
        let nextStatus = order.status;
        if (order.status === OrderStatus.Pending) nextStatus = OrderStatus.Confirmed;
        else if (order.status === OrderStatus.Confirmed) nextStatus = OrderStatus.Preparing;
        else if (order.status === OrderStatus.Preparing) nextStatus = OrderStatus.Ready;
        else if (order.status === OrderStatus.Ready) nextStatus = order.orderType === OrderType.Delivery ? OrderStatus.Delivering : OrderStatus.Completed;
        else if (order.status === OrderStatus.Delivering) nextStatus = OrderStatus.Completed;
        onUpdateStatus(order.id, nextStatus);
    };

    return (
        <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-250px)] no-scrollbar px-1">
            {statuses.map(status => (
                <div key={status} className="w-72 flex-shrink-0 flex flex-col">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400">{status}</h3>
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {orders.filter(o => o.status === status).length}
                        </span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-10">
                        {orders.filter(o => o.status === status).map(order => (
                            <OrderCard key={order.id} order={order} onAdvance={handleAdvance} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Dashboard: React.FC<{ orders: Order[] }> = ({ orders }) => {
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today && o.status !== OrderStatus.Cancelled);
        const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
        return { totalSales, count: todayOrders.length, pending: orders.filter(o => o.status === OrderStatus.Pending).length };
    }, [orders]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Ventas Hoy</p>
                    <h3 className="text-4xl font-black">${stats.totalSales.toFixed(2)}</h3>
                </div>
                <IconReceipt className="absolute -bottom-4 -right-4 h-32 w-32 opacity-10 rotate-12" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Pedidos Hoy</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white">{stats.count}</h3>
                <p className="text-xs text-gray-500 font-bold mt-2">Ticket prom: ${(stats.count > 0 ? stats.totalSales / stats.count : 0).toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">En Espera</p>
                <h3 className="text-4xl font-black text-yellow-500">{stats.pending}</h3>
                <p className="text-xs text-gray-500 font-bold mt-2">Requieren atención inmediata</p>
            </div>
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [theme, toggleTheme] = useTheme();

    useEffect(() => {
        const load = async () => {
            const data = await getActiveOrders();
            setOrders(data);
            setIsLoading(false);
        };
        load();
        subscribeToNewOrders((newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            playNewOrderSound();
        }, (updated) => {
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        });
        return () => unsubscribeFromChannel();
    }, []);

    const updateStatus = async (id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        try { await updateOrder(id, { status }); } catch (e) { alert("Error al actualizar"); }
    };

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders /> },
        { id: 'products', name: 'Catálogo', icon: <IconMenu /> },
        { id: 'availability', name: 'Stock', icon: <IconAvailability /> },
        { id: 'share', name: 'Marketing', icon: <IconShare /> },
    ];

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
                <div className="h-24 flex items-center justify-center border-b dark:border-gray-700">
                    <h1 className="text-xl font-black text-emerald-600 uppercase tracking-tighter">ALTOQUE <span className="text-gray-400">ADMIN</span></h1>
                </div>
                <nav className="flex-1 p-6 space-y-3">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id as AdminViewPage)}
                            className={`w-full flex items-center gap-3 px-5 py-4 rounded-[1.25rem] transition-all duration-300 font-black text-sm uppercase tracking-tighter ${currentPage === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <span className={currentPage === item.id ? 'text-white' : 'text-emerald-500'}>{item.icon}</span>
                            {item.name}
                        </button>
                    ))}
                </nav>
                <div className="p-6">
                    <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 font-bold text-xs uppercase tracking-widest transition-transform active:scale-95">
                        {theme === 'light' ? <><IconMoon className="h-4 w-4"/> Dark Mode</> : <><IconSun className="h-4 w-4"/> Light Mode</>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{currentPage}</h2>
                        <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">Gestión integral de tu restaurante</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-sm border dark:border-gray-700 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Servidor Online</span>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto">
                        {currentPage === 'dashboard' && (
                            <>
                                <Dashboard orders={orders} />
                                <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Pedidos Recientes</h3>
                                <KanbanBoard orders={orders} onUpdateStatus={updateStatus} />
                            </>
                        )}
                        {currentPage === 'orders' && <KanbanBoard orders={orders} onUpdateStatus={updateStatus} />}
                        {currentPage === 'products' && <div className="text-center py-20 opacity-30 font-black text-2xl uppercase italic">Módulo de Catálogo Listo</div>}
                        {currentPage === 'availability' && <div className="text-center py-20 opacity-30 font-black text-2xl uppercase italic">Control de Stock Activo</div>}
                        {currentPage === 'share' && <div className="text-center py-20 opacity-30 font-black text-2xl uppercase italic">Centro de Marketing Digital</div>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminView;
