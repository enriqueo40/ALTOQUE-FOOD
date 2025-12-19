
import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, BranchSettings, PaymentSettings, ShippingSettings, PaymentMethod, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconChatAdmin, IconLogout, IconSearch, IconBell, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconTag, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOn, IconToggleOff } from '../constants';

const IconEye: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className={className} />;

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'analytics' | 'messages' | 'availability' | 'share' | 'tutorials';

// --- Audio Utility for Chic Notification ---
const playChicNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, duration: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        const now = audioCtx.currentTime;
        playTone(523.25, now, 1.2); // C5
        playTone(659.25, now + 0.1, 1.2); // E5
        playTone(783.99, now + 0.2, 1.2); // G5
        playTone(1046.50, now + 0.3, 1.5); // C6
    } catch (e) {
        console.warn("Audio Context not allowed by browser yet.");
    }
};

const PAGE_TITLES: { [key in AdminViewPage]: string } = {
    dashboard: 'Inicio',
    products: 'Menú',
    orders: 'Pedidos',
    analytics: 'Analítica',
    messages: 'Mensajes',
    availability: 'Disponibilidad',
    share: 'Compartir',
    tutorials: 'Tutoriales'
};

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void; hasNewOrders: boolean }> = ({ currentPage, setCurrentPage, hasNewOrders }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: (
            <div className="relative">
                <IconOrders />
                {hasNewOrders && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white dark:border-gray-800"></span>
                    </span>
                )}
            </div>
        ) },
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold dark:text-gray-100 uppercase tracking-tighter">ALTOQUE FOOD</h2>
                    <IconChevronDown className="h-4 w-4" />
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentPage === item.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {item.icon}
                        <span className="font-semibold">{item.name}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 py-6 border-t dark:border-gray-700 text-sm">
                <p className="text-gray-600 dark:text-gray-300">+58 414 694 5877</p>
                <p className="text-gray-500 dark:text-gray-400">Atención rápida</p>
                <button className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <span>Contactar soporte</span>
                </button>
            </div>
        </aside>
    );
};

const Header: React.FC<{ title: string; onSettingsClick: () => void; theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ title, onSettingsClick, theme, toggleTheme }) => (
    <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <div className="flex items-center space-x-6">
            <a href="#/menu" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <span>Menú digital</span>
                <IconExternalLink className="h-4 w-4" />
            </a>
            <button onClick={onSettingsClick} className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <span>Configuración</span>
                <IconSettings className="h-5 w-5" />
            </button>
             <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                {theme === 'light' ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
            </button>
        </div>
    </header>
);

// Optimization: React.memo for list items to prevent redundant re-renders
const ProductListItem = memo(({product, onEdit, onDuplicate, onDelete}: {product: Product, onEdit: () => void, onDuplicate: () => void, onDelete: () => void}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-x-4">
                <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover" loading="lazy" />
                <span className="font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
            </div>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(prev => !prev)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded-full">
                    <IconMoreVertical />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <div className="p-2">
                            <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><IconPencil className="h-4 w-4" /> Editar</button>
                            <button onClick={() => { onDuplicate(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><IconDuplicate className="h-4 w-4" /> Duplicar</button>
                            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// Kanban and Orders logic ...

const OrderCard = memo(({ order, onClick }: { order: Order; onClick: () => void }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all duration-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-900">
        <div className="flex justify-between items-start mb-2">
            <p className="font-bold text-gray-900 dark:text-gray-100">{order.customer.name}</p>
            <p className="font-bold text-emerald-600">${order.total.toFixed(2)}</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">#{order.id.slice(0, 4)}</p>
        <div className="space-y-1">
            {order.items.slice(0, 2).map((item, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    <span className="font-bold">{item.quantity}x</span> {item.name}
                </p>
            ))}
        </div>
    </div>
));

const OrdersKanbanBoard: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void }> = ({ orders, onOrderClick }) => {
    const columns = [
        { status: OrderStatus.Pending, title: 'Nuevos' },
        { status: OrderStatus.Confirmed, title: 'Confirmados' },
        { status: OrderStatus.Preparing, title: 'Preparando' },
        { status: OrderStatus.Ready, title: 'Listos' },
    ];

    return (
        <div className="flex space-x-4 overflow-x-auto pb-4 h-full">
            {columns.map(col => (
                <div key={col.status} className="w-80 flex-shrink-0 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider">{col.title}</h3>
                        <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {orders.filter(o => o.status === col.status).length}
                        </span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {orders.filter(o => o.status === col.status).map(order => (
                            <OrderCard key={order.id} order={order} onClick={() => onOrderClick(order)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const NewOrderToast: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
    if (!order) return null;
    return (
        <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
            <div className="bg-white/80 dark:bg-emerald-900/90 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 shadow-2xl rounded-2xl p-4 w-80 flex items-start gap-4">
                <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full">
                    <IconReceipt className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">¡Nuevo Pedido!</h4>
                    <p className="text-sm text-gray-600 dark:text-emerald-100">Cliente: {order.customer.name}</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">${order.total.toFixed(2)}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <IconX className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasNewOrders, setHasNewOrders] = useState(false);
    const [latestOrder, setLatestOrder] = useState<Order | null>(null);

    useEffect(() => {
        getActiveOrders().then(data => {
            setOrders(data);
            setIsLoading(false);
        });

        const channel = subscribeToNewOrders((newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            setLatestOrder(newOrder);
            playChicNotificationSound();
            
            // If admin is not on the orders page, show visual dot
            if (currentPage !== 'orders') {
                setHasNewOrders(true);
            }
        });

        return () => { unsubscribeFromChannel(); };
    }, [currentPage]);

    // Clear notification dot when entering orders page
    useEffect(() => {
        if (currentPage === 'orders') {
            setHasNewOrders(false);
        }
    }, [currentPage]);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'products': return <ProductsView />;
            case 'orders': return (
                <div className="h-full">
                    <OrdersKanbanBoard orders={orders} onOrderClick={() => {}} />
                </div>
            );
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} hasNewOrders={hasNewOrders} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    title={PAGE_TITLES[currentPage]} 
                    onSettingsClick={() => setIsSettingsOpen(true)} 
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
                <main className="flex-1 overflow-auto p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                </main>
            </div>
            
            {/* Real-time Notifications */}
            <NewOrderToast 
                order={latestOrder} 
                onClose={() => setLatestOrder(null)} 
            />
        </div>
    );
};

// Placeholder components ...
const Dashboard = () => <div className="p-10 text-center text-gray-500">Dashboard Optimizado</div>;
const ProductsView = () => <div className="p-10 text-center text-gray-500">Gestión de Menú</div>;

export default AdminView;
