import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, BranchSettings, PaymentSettings, ShippingSettings, PaymentMethod, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer } from '../types';
import { getProducts, getCategories, getPersonalizations, getPromotions, getActiveOrders, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, saveOrder, saveZoneLayout, getZones, getAppSettings } from '../services/supabaseService';
// Fix: Removed duplicate import of IconReceipt
import { IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSettings, IconExternalLink, IconMoon, IconSun, IconChevronDown, IconX, IconReceipt, IconMoreVertical, IconPencil, IconDuplicate, IconTrash, IconGripVertical, IconCheck } from '../constants';

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'analytics' | 'availability' | 'share' | 'tutorials';

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
        // Arpegio de Do Mayor 7 (Elegante)
        playTone(523.25, now);       // C5
        playTone(659.25, now + 0.1); // E5
        playTone(783.99, now + 0.2); // G5
        playTone(987.77, now + 0.3); // B5
    } catch (e) { console.warn("Audio blocked by browser autoplay policy."); }
};

const NewOrderToast: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => (
    <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right-full duration-500">
        <div className="bg-white/90 dark:bg-emerald-900/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 shadow-2xl rounded-2xl p-5 w-80 flex items-start gap-4">
            <div className="bg-emerald-500 text-white p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                <IconReceipt className="h-6 w-6" />
            </div>
            <div className="flex-1">
                <h4 className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider">¡Nuevo Pedido!</h4>
                <p className="text-sm text-gray-600 dark:text-emerald-100 font-medium truncate">{order.customer.name}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${order.total.toFixed(2)}</span>
                    <button onClick={onClose} className="text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 px-2 py-1 rounded-md font-bold uppercase">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
);

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void; hasUnread: boolean }> = ({ currentPage, setCurrentPage, hasUnread }) => {
    const navItems = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: (
            <div className="relative">
                <IconOrders />
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white dark:border-gray-800"></span>
                    </span>
                )}
            </div>
        )},
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col border-r dark:border-gray-700">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">ALTOQUE FOOD</h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id as AdminViewPage)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${currentPage === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <span className={currentPage === item.id ? 'text-white' : 'text-emerald-500'}>{item.icon}</span>
                        <span className="font-bold text-sm">{item.name}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnreadOrders, setHasUnreadOrders] = useState(false);
    const [activeToast, setActiveToast] = useState<Order | null>(null);
    const [theme, toggleTheme] = useTheme();

    useEffect(() => {
        const load = async () => {
            const data = await getActiveOrders();
            setOrders(data);
            setIsLoading(false);
        };
        load();

        const channel = subscribeToNewOrders((newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            playNewOrderSound();
            setActiveToast(newOrder);
            if (currentPage !== 'orders') {
                setHasUnreadOrders(true);
            }
        });

        return () => { unsubscribeFromChannel(); };
    }, [currentPage]);

    useEffect(() => {
        if (currentPage === 'orders') {
            setHasUnreadOrders(false);
        }
    }, [currentPage]);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} hasUnread={hasUnreadOrders} />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8">
                    <h2 className="text-2xl font-black uppercase tracking-tight">{currentPage}</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            {theme === 'light' ? <IconMoon /> : <IconSun />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-8">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto">
                            {currentPage === 'orders' && <div className="text-gray-500 text-center py-20 font-bold uppercase tracking-widest opacity-30">Panel de Pedidos listo para servir</div>}
                            {currentPage === 'dashboard' && <div className="text-gray-500 text-center py-20 font-bold uppercase tracking-widest opacity-30">Bienvenido al Centro de Control</div>}
                        </div>
                    )}
                </main>
            </div>
            
            {activeToast && <NewOrderToast order={activeToast} onClose={() => setActiveToast(null)} />}
        </div>
    );
};

export default AdminView;