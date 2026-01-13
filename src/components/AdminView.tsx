
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
type SettingsPage = 'general' | 'store-data' | 'shipping-costs' | 'payment-methods' | 'hours' | 'zones-tables' | 'printing';


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

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void }> = ({ currentPage, setCurrentPage }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders /> },
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold dark:text-gray-100">ALTOQUE FOOD</h2>
                    <IconChevronDown className="h-4 w-4" />
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {item.icon}
                        <span className="font-semibold">{item.name}</span>
                    </button>
                ))}
            </nav>
            <div className="px-6 py-6 border-t dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border dark:border-gray-700">
                    <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Soporte</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">+584146945877</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Atención rápida</p>
                </div>
            </div>
        </aside>
    );
};

const Header: React.FC<{ title: string; onSettingsClick: () => void; onPreviewClick: () => void; theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ title, onSettingsClick, onPreviewClick, theme, toggleTheme }) => (
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

const FeatureBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;

    return (
        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-800 p-4 rounded-lg flex items-center justify-between">
            <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Nueva funcionalidad</h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Conoce las comandas digitales (KDS).</p>
            </div>
            <div className="flex items-center space-x-4">
                 <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    Ver detalles de actualización
                </button>
                <button onClick={() => setIsVisible(false)} className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200" aria-label="Cerrar">
                    <IconX className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};

const FilterDropdown: React.FC<{ 
    options: string[]; 
    icon?: React.ReactNode; 
    selected: string; 
    onSelect: (val: string) => void;
    prefix?: string;
}> = ({ options, icon, selected, onSelect, prefix }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">
                {icon}
                <span className="whitespace-nowrap">{prefix ? `${prefix}: ${selected}` : selected}</span>
                <IconChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20 animate-fade-in-up">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {options.map(option => (
                            <button
                                key={option}
                                onClick={() => {
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                                className={`block w-full text-left px-4 py-2 text-sm transition-colors ${selected === option ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                role="menuitem"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardStatCard: React.FC<{ title: string; value: string; secondaryValue: string; }> = ({ title, value, secondaryValue }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</h4>
        <div className="mt-3">
            <p className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium flex items-center gap-1">
               <span className="font-bold">{secondaryValue}</span> <span className="opacity-60">vs anterior</span>
            </p>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Controlled Filter State
    const [dateRange, setDateRange] = useState('Hoy');
    const [salesChannel, setSalesChannel] = useState('Todos');

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

    // Advanced Filtering and Recalculation Logic
    const stats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const msPerDay = 24 * 60 * 60 * 1000;

        let startTime: number;
        let endTime: number = now.getTime();
        let prevStartTime: number;
        let prevEndTime: number;

        // Date Range Logic
        switch (dateRange) {
            case 'Ayer':
                startTime = startOfToday - msPerDay;
                endTime = startOfToday;
                prevStartTime = startTime - msPerDay;
                prevEndTime = startTime;
                break;
            case 'Últimos 7 días':
                startTime = now.getTime() - (7 * msPerDay);
                prevStartTime = startTime - (7 * msPerDay);
                prevEndTime = startTime;
                break;
            case 'Últimos 30 días':
                startTime = now.getTime() - (30 * msPerDay);
                prevStartTime = startTime - (30 * msPerDay);
                prevEndTime = startTime;
                break;
            case 'Hoy':
            default:
                startTime = startOfToday;
                prevStartTime = startOfToday - msPerDay;
                prevEndTime = startOfToday; 
                break;
        }

        // Filter Function for Sales Channel
        const channelFilter = (o: Order) => {
            if (salesChannel === 'Todos') return true;
            if (salesChannel === 'Domicilio') return o.orderType === OrderType.Delivery;
            if (salesChannel === 'Para llevar') return o.orderType === OrderType.TakeAway;
            if (salesChannel === 'Para comer aqui') return o.orderType === OrderType.DineIn;
            return true;
        };

        const currentPeriodOrders = orders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= startTime && t < endTime && channelFilter(o);
        });

        const previousPeriodOrders = orders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= prevStartTime && t < prevEndTime && channelFilter(o);
        });

        const calcStats = (orderList: Order[]) => {
            const valid = orderList.filter(o => o.status !== OrderStatus.Cancelled);
            const sales = valid.reduce((sum, o) => sum + o.total, 0);
            const count = valid.length;
            const shipping = valid.filter(o => o.orderType === OrderType.Delivery).length;
            
            // Extract tips from comments if formatted as "Propina: $XX.XX"
            let tips = 0;
            valid.forEach(o => {
                if (o.generalComments) {
                    const match = o.generalComments.match(/Propina:?\s*[A-Z$]*\s*([\d.]+)/i);
                    if (match && match[1]) tips += parseFloat(match[1]);
                }
            });

            const methodCounts: {[key: string]: number} = {};
            valid.forEach(o => {
                const method = o.customer.paymentMethod || 'Efectivo';
                methodCounts[method] = (methodCounts[method] || 0) + 1;
            });

            const paymentMethods = Object.entries(methodCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([name, val]) => ({
                    name,
                    percentage: count > 0 ? Math.round((val / count) * 100) : 0
                }));

            return { sales, count, shipping, tips, paymentMethods };
        };

        return {
            current: calcStats(currentPeriodOrders),
            previous: calcStats(previousPeriodOrders)
        };
    }, [orders, dateRange, salesChannel]);

    if (isLoading) {
        return <div className="p-20 text-center animate-pulse text-gray-500 font-bold uppercase tracking-widest">Sincronizando Dashboard...</div>;
    }

    const ticketPromedio = stats.current.count > 0 
        ? (stats.current.sales / stats.current.count).toFixed(2) 
        : "0.00";

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <FeatureBanner />
            
            <div className="flex flex-wrap items-center gap-4">
                <FilterDropdown 
                    options={['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días']} 
                    icon={<IconCalendar className="h-5 w-5 text-gray-500" />} 
                    selected={dateRange}
                    onSelect={setDateRange}
                />
                <FilterDropdown 
                    prefix="Canal de venta"
                    options={['Todos', 'Domicilio', 'Para llevar', 'Para comer aqui']} 
                    selected={salesChannel}
                    onSelect={setSalesChannel}
                />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStatCard 
                    title="Ventas" 
                    value={`$${stats.current.sales.toFixed(2)}`} 
                    secondaryValue={`$${stats.previous.sales.toFixed(2)}`} 
                />
                <DashboardStatCard 
                    title="Pedidos" 
                    value={stats.current.count.toString()} 
                    secondaryValue={stats.previous.count.toString()} 
                />
                <DashboardStatCard 
                    title="Envíos" 
                    value={stats.current.shipping.toString()} 
                    secondaryValue={stats.previous.shipping.toString()} 
                />
                <DashboardStatCard 
                    title="Propinas" 
                    value={`$${stats.current.tips.toFixed(2)}`} 
                    secondaryValue={`$${stats.previous.tips.toFixed(2)}`} 
                />

                {/* Insight Analytics */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2 flex flex-col justify-between group">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Ticket promedio</h4>
                    <div className="flex items-center justify-center py-10">
                        <div className="text-7xl font-black text-gray-200 dark:text-gray-700/50 tracking-tighter group-hover:text-emerald-500/10 transition-colors duration-500">${ticketPromedio}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-8">Métodos de pago más usados ({dateRange})</h4>
                    <div className="space-y-6">
                         {stats.current.paymentMethods.length > 0 ? (
                             stats.current.paymentMethods.map((method, idx) => (
                                <div key={method.name} className="w-full space-y-2">
                                     <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase">
                                         <span>{method.name}</span>
                                         <span>{method.percentage}%</span>
                                     </div>
                                     <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-500/40'}`} 
                                            style={{ width: `${method.percentage}%` }}
                                        ></div>
                                     </div>
                                 </div>
                             ))
                         ) : (
                             <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">
                                 Sin datos para mostrar
                             </div>
                         )}
                    </div>
                </div>
            </div>

             <div className="fixed bottom-6 right-8 z-50">
                <button className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm dark:bg-gray-700 dark:text-gray-200 border border-gray-700/50 transition-transform active:scale-95">
                    <span className="font-black uppercase tracking-tight opacity-90">Estás en tu periodo de prueba</span>
                    <IconChevronUp className="h-4 w-4 text-emerald-500" />
                </button>
            </div>
            
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

const ProductListItem: React.FC<{product: Product, onEdit: () => void, onDuplicate: () => void, onDelete: () => void}> = ({product, onEdit, onDuplicate, onDelete}) => {
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
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-center gap-x-4">
                <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover"/>
                <span className="font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
            </div>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(prev => !prev)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded-full">
                    <IconMoreVertical />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <div className="p-2">
                            <p className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Acciones</p>
                            <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><IconPencil className="h-4 w-4" /> Editar</button>
                            <button onClick={() => { onDuplicate(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><IconDuplicate className="h-4 w-4" /> Duplicar</button>
                            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
