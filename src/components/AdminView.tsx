
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod, BranchSettings } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES, getCurrencySymbol } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder, subscribeToMenuUpdates } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff, IconToggleOn, IconChatAdmin, FadeInImage } from '../constants';

// --- MEMOIZED COMPONENTS FOR PERFORMANCE ---

const OrderStatusBadge: React.FC<{status: OrderStatus}> = React.memo(({status}) => {
    const colors = {
        [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        [OrderStatus.Preparing]: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
        [OrderStatus.Ready]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        [OrderStatus.Delivering]: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
        [OrderStatus.Completed]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
});

const TimeAgo: React.FC<{ date: Date; className?: string }> = React.memo(({ date, className }) => {
    const [text, setText] = useState('');
    useEffect(() => {
        const update = () => {
            const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
            setText(diff < 1 ? 'ahora' : `hace ${diff} min`);
        };
        update();
        const i = setInterval(update, 60000);
        return () => clearInterval(i);
    }, [date]);
    return <span className={className}>{text}</span>;
});

const OrderCard: React.FC<{ order: Order; onClick: () => void; currencySymbol: string }> = React.memo(({ order, onClick, currencySymbol }) => (
    <div onClick={onClick} className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${order.status === OrderStatus.Pending ? 'border-yellow-400 ring-1 ring-yellow-400/20' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                 <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${order.orderType === OrderType.Delivery ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                    {order.orderType === OrderType.Delivery ? <IconDelivery className="h-4 w-4"/> : <IconStore className="h-4 w-4"/>}
                 </span>
                 <div>
                     <p className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{order.customer.name}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">#{order.id.slice(0, 4)}</p>
                 </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}{order.total.toFixed(2)}</p>
                <TimeAgo date={order.createdAt} className="text-xs block"/>
            </div>
        </div>
        
        <div className="space-y-1 mb-4">
            {order.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex-1 truncate"><span className="font-bold text-gray-800 dark:text-gray-200">{item.quantity}x</span> {item.name}</span>
                </div>
            ))}
            {order.items.length > 3 && <p className="text-xs text-gray-400 italic">+ {order.items.length - 3} más...</p>}
        </div>

        <div className="flex justify-between items-center pt-3 border-t dark:border-gray-700">
             <span className={`text-xs font-semibold px-2 py-0.5 rounded ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                 {order.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
             </span>
             <button className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 text-sm font-bold flex items-center hover:underline">
                 Ver detalles <IconArrowLeft className="h-3 w-3 rotate-180 ml-1"/>
             </button>
        </div>
    </div>
));

const ProductListItem: React.FC<{product: Product, onEdit: () => void, onDuplicate: () => void, onDelete: () => void}> = React.memo(({product, onEdit, onDuplicate, onDelete}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-center gap-x-4">
                <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                    <FadeInImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"/>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
            </div>
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded-full"><IconMoreVertical /></button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700 p-2">
                        <button onClick={onEdit} className="w-full text-left px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Editar</button>
                        <button onClick={onDuplicate} className="w-full text-left px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Duplicar</button>
                        <button onClick={onDelete} className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded">Borrar</button>
                    </div>
                )}
            </div>
        </div>
    );
});

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

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void; whatsappNumber: string }> = ({ currentPage, setCurrentPage, whatsappNumber }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders /> },
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col shrink-0">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold dark:text-gray-100 uppercase tracking-tighter">ALTOQUE FOOD</h2>
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
            <div className="px-6 py-6 border-t dark:border-gray-700 text-xs text-gray-500 font-bold uppercase tracking-widest text-center">
                Ventas: +{whatsappNumber}
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

const FilterDropdown: React.FC<{ label: string; options: string[]; icon?: React.ReactNode }> = ({ label, options, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(options[0]);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                {icon}
                <span>{label.includes(':') ? `${label.split(':')[0]}: ${selected}` : selected}</span>
                <IconChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {isOpen && (
                <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {options.map(option => (
                            <a
                                key={option}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setSelected(option);
                                    setIsOpen(false);
                                }}
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                            >
                                {option}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardStatCard: React.FC<{ title: string; value: string; secondaryValue: string; }> = React.memo(({ title, value, secondaryValue }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        <div className="mt-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{secondaryValue}</p>
        </div>
    </div>
));

const OrdersKanbanBoard: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void, currencySymbol: string }> = React.memo(({ orders, onOrderClick, currencySymbol }) => {
    const columns = [
        { status: OrderStatus.Pending, title: 'Nuevos' },
        { status: OrderStatus.Confirmed, title: 'Confirmados' },
        { status: OrderStatus.Preparing, title: 'Preparando' },
        { status: OrderStatus.Ready, title: 'Listos' },
        { status: OrderStatus.Delivering, title: 'En Reparto' },
        { status: OrderStatus.Completed, title: 'Completados' }
    ];
    return (
        <div className="flex gap-4 overflow-x-auto h-full pb-4 px-2">
            {columns.map(col => (
                <div key={col.status} className="w-72 flex-shrink-0 flex flex-col">
                    <div className="font-bold text-gray-700 dark:text-gray-200 mb-2 px-2">{col.title}</div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {orders.filter(o => o.status === col.status).map(o => <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)} currencySymbol={currencySymbol} />)}
                    </div>
                </div>
            ))}
        </div>
    );
});

const Dashboard: React.FC<{ currencySymbol: string }> = ({ currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        getActiveOrders().then(data => {
            setOrders(data);
            setIsLoading(false);
        });
    }, []);

    const totalSales = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
    const totalOrders = orders.length;
    const previousDaySales = totalSales * 0.9;
    const previousDayOrders = Math.floor(totalOrders * 0.9);
    const totalEnvios = orders.filter(o => o.orderType === OrderType.Delivery).length;
    const totalPropinas = orders.reduce((sum, o) => sum + (o.tip || 0), 0);

    if (isLoading) {
        return <div className="p-10 text-center animate-pulse text-gray-500">Cargando estadísticas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <FilterDropdown 
                    label="Hoy" 
                    options={['Hoy', 'Ayer', 'Últimos 7 días']} 
                    icon={<IconCalendar className="h-5 w-5 text-gray-500" />} 
                />
                <FilterDropdown 
                    label="Canal de venta: Todos" 
                    options={['Todos', 'Punto de venta', 'Menú digital']} 
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStatCard title="Ventas" value={`${currencySymbol}${totalSales.toFixed(2)}`} secondaryValue={`${currencySymbol}${previousDaySales.toFixed(2)}`} />
                <DashboardStatCard title="Pedidos" value={totalOrders.toString()} secondaryValue={previousDayOrders.toString()} />
                <DashboardStatCard title="Envíos" value={totalEnvios.toString()} secondaryValue={"0"} />
                <DashboardStatCard title="Propinas" value={`${currencySymbol}${totalPropinas.toFixed(2)}`} secondaryValue={`${currencySymbol}0.00`} />

                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Ticket promedio</h4>
                    <div className="h-48 flex items-center justify-center">
                        <div className="text-4xl font-bold text-gray-300 dark:text-gray-600">{currencySymbol}{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Métodos de pago más usados</h4>
                    <div className="h-48 flex items-center justify-center">
                         <div className="w-full h-5 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
                    </div>
                </div>
            </div>
             <div className="fixed bottom-5 right-5 z-20">
                <button className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm dark:bg-gray-700 dark:text-gray-200">
                    <span>Estás en tu periodo de prueba</span>
                    <IconChevronUp className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// --- Modals and Views ---

const ProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (product: Omit<Product, 'id' | 'created_at'> & { id?: string }) => void; product: Product | null; categories: Category[] }> = ({ isOpen, onClose, onSave, product, categories }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    useEffect(() => {
        if(isOpen) {
            setFormData(product || { 
                name: '', 
                description: '', 
                price: 0, 
                imageUrl: '', 
                categoryId: categories[0]?.id || '', 
                available: true,
                personalizationIds: [] // Initialize with empty array
            });
            // Fetch available personalizations when opening
            getPersonalizations().then(setPersonalizations);
        }
    }, [isOpen, product, categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as any);
        onClose();
    };

    const handleGenerateDescription = async () => {
        if (!formData.name) return;
        setIsGenerating(true);
        try {
            const catName = categories.find(c => c.id === formData.categoryId)?.name || '';
            const desc = await generateProductDescription(formData.name, catName, formData.description || '');
            setFormData(prev => ({ ...prev, description: desc }));
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePersonalization = (pId: string) => {
        setFormData(prev => {
            const currentIds = prev.personalizationIds || [];
            const newIds = currentIds.includes(pId) 
                ? currentIds.filter(id => id !== pId) 
                : [...currentIds, pId];
            return { ...prev, personalizationIds: newIds };
        });
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 dark:text-white">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Nombre" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClasses} required />
                    
                    <div className="relative">
                        <textarea placeholder="Descripción" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClasses} rows={3} />
                        <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="absolute bottom-2 right-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 flex items-center gap-1">
                            <IconSparkles className="h-3 w-3"/> {isGenerating ? '...' : 'IA'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Precio" value={formData.price || 0} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className={inputClasses} required step="0.01"/>
                        <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={inputClasses}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <input type="text" placeholder="URL Imagen" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className={inputClasses} />
                    
                    {/* Personalizations Selector */}
                    <div className="border-t dark:border-gray-700 pt-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Personalizaciones disponibles</label>
                        <div className="max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md p-2 space-y-2">
                            {personalizations.length === 0 && <p className="text-sm text-gray-500">No hay personalizaciones creadas.</p>}
                            {personalizations.map(p => (
                                <label key={p.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        checked={(formData.personalizationIds || []).includes(p.id)} 
                                        onChange={() => togglePersonalization(p.id)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 bg-gray-100 border-gray-300 dark:bg-gray-600 dark:border-gray-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{p.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center pt-2">
                        <input type="checkbox" checked={formData.available} onChange={e => setFormData({...formData, available: e.target.checked})} className="rounded text-emerald-600" />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Disponible para venta</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CategoryModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (cat: any) => void; category: Category | null }> = ({ isOpen, onClose, onSave, category }) => {
    const [name, setName] = useState('');
    useEffect(() => { if (isOpen) setName(category?.name || ''); }, [isOpen, category]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <form onSubmit={(e) => { e.preventDefault(); onSave({ id: category?.id, name }); onClose(); }} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 dark:text-white">{category ? 'Editar' : 'Nueva'} Categoría</h2>
                <input className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded dark:text-white dark:border-gray-600">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
                </div>
            </form>
        </div>
    );
};

const ProductsView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isProdModal, setIsProdModal] = useState(false);
    const [isCatModal, setIsCatModal] = useState(false);
    const [editingProd, setEditingProd] = useState<Product | null>(null);
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    const load = async () => {
        const [p, c] = await Promise.all([getProducts(), getCategories()]);
        setProducts(p); setCategories(c);
    };
    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className="flex justify-end gap-2 mb-4">
                <button onClick={() => { setEditingCat(null); setIsCatModal(true); }} className="px-4 py-2 border rounded dark:text-white dark:border-gray-600">Nueva Categoría</button>
                <button onClick={() => { setEditingProd(null); setIsProdModal(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded">Nuevo Producto</button>
            </div>
            {categories.map(c => (
                <div key={c.id} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded shadow">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg dark:text-white">{c.name}</h3>
                        <button onClick={() => { setEditingCat(c); setIsCatModal(true); }}><IconEdit /></button>
                    </div>
                    {products.filter(p => p.categoryId === c.id).map(p => (
                        <ProductListItem key={p.id} product={p} onEdit={() => { setEditingProd(p); setIsProdModal(true); }} onDelete={() => deleteProduct(p.id).then(load)} onDuplicate={() => saveProduct({...p, name: p.name + ' (Copy)'}).then(load)} />
                    ))}
                </div>
            ))}
            <ProductModal isOpen={isProdModal} onClose={() => setIsProdModal(false)} onSave={async (p) => { await saveProduct(p); load(); }} product={editingProd} categories={categories} />
            <CategoryModal isOpen={isCatModal} onClose={() => setIsCatModal(false)} onSave={async (c) => { await saveCategory(c); load(); }} category={editingCat} />
        </div>
    );
};

const PersonalizationModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (p: any) => void, personalization: Personalization | null}> = ({isOpen, onClose, onSave, personalization}) => {
    // Basic modal logic placeholder or full implementation if available in context
    const [name, setName] = useState('');
    const [options, setOptions] = useState([{name: '', price: 0}]);
    
    useEffect(() => {
        if(isOpen) {
            setName(personalization?.name || '');
            setOptions(personalization?.options || [{name: '', price: 0}]);
        }
    }, [isOpen, personalization]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: personalization?.id, name, options, label: '', allowRepetition: false, minSelection: 0, maxSelection: 1 });
        onClose();
    }

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 dark:text-white">{personalization ? 'Editar' : 'Nueva'} Personalización</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Nombre (Ej: Tipo de leche)" value={name} onChange={e => setName(e.target.value)} required />
                    <div className="space-y-2">
                        <label className="text-sm dark:text-gray-300">Opciones</label>
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input className="flex-1 p-1 border rounded dark:bg-gray-700" placeholder="Opción" value={opt.name} onChange={e => {
                                    const newOpts = [...options]; newOpts[idx].name = e.target.value; setOptions(newOpts);
                                }} required />
                                <input className="w-20 p-1 border rounded dark:bg-gray-700" type="number" placeholder="$" value={opt.price} onChange={e => {
                                    const newOpts = [...options]; newOpts[idx].price = parseFloat(e.target.value); setOptions(newOpts);
                                }} required />
                            </div>
                        ))}
                        <button type="button" onClick={() => setOptions([...options, {name: '', price: 0}])} className="text-sm text-emerald-600">+ Agregar opción</button>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded dark:text-white">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PersonalizationsView: React.FC = () => {
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingP, setEditingP] = useState<Personalization | null>(null);

    useEffect(() => { getPersonalizations().then(setPersonalizations); }, []);

    const handleSave = async (p: any) => {
        await savePersonalization(p);
        getPersonalizations().then(setPersonalizations);
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => { setEditingP(null); setIsModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded">Nueva Personalización</button>
            </div>
            <div className="space-y-2">
                {personalizations.map(p => (
                    <div key={p.id} className="p-3 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <span className="font-bold dark:text-white">{p.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({p.options.length} opciones)</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingP(p); setIsModalOpen(true); }}><IconEdit/></button>
                            <button onClick={async () => { if(confirm('¿Borrar?')) { await deletePersonalization(p.id); getPersonalizations().then(setPersonalizations); } }} className="text-red-500"><IconTrash/></button>
                        </div>
                    </div>
                ))}
            </div>
            <PersonalizationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} personalization={editingP} />
        </div>
    );
};

const PromotionsView: React.FC = () => <div>Gestión de Promociones (Próximamente)</div>;

const MenuManagement: React.FC = () => {
    const [tab, setTab] = useState('products');
    return (
        <div>
            <div className="flex gap-4 mb-4 border-b dark:border-gray-700">
                <button onClick={() => setTab('products')} className={`pb-2 ${tab === 'products' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Productos</button>
                <button onClick={() => setTab('personalizations')} className={`pb-2 ${tab === 'personalizations' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Personalizaciones</button>
                <button onClick={() => setTab('promotions')} className={`pb-2 ${tab === 'promotions' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Promociones</button>
            </div>
            {tab === 'products' && <ProductsView />}
            {tab === 'personalizations' && <PersonalizationsView />}
            {tab === 'promotions' && <PromotionsView />}
        </div>
    );
};

// --- Order Management ---

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, s: OrderStatus) => void; onUpdatePayment: (id: string, s: PaymentStatus) => void }> = ({ order, onClose }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg">
                <h2 className="text-xl font-bold dark:text-white">Pedido #{order.id.slice(0,4)}</h2>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded text-gray-800">Cerrar</button>
            </div>
        </div>
    );
};

const OrderManagement: React.FC<{ onSettingsClick: () => void; currencySymbol: string }> = ({ onSettingsClick, currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    useEffect(() => { getActiveOrders().then(setOrders); }, []);
    
    return (
        <div>
            <OrdersKanbanBoard orders={orders} onOrderClick={setSelectedOrder} currencySymbol={currencySymbol} />
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={() => {}} onUpdatePayment={() => {}} />
        </div>
    );
};

// --- Other Views ---

const Analytics: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const handleAsk = async () => {
        const res = await getAdvancedInsights(query, []);
        setResult(res);
    };
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Analítica IA</h2>
            <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pregunta sobre tus ventas..." />
            <button onClick={handleAsk} className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded">Analizar</button>
            <div className="mt-4 whitespace-pre-wrap dark:text-gray-300">{result}</div>
        </div>
    );
};

const Messages: React.FC = () => <div className="text-center p-10 dark:text-gray-400">Mensajes (Próximamente)</div>;
const AvailabilityView: React.FC = () => <div className="text-center p-10 dark:text-gray-400">Disponibilidad (Próximamente)</div>;

const ShareView: React.FC<{ onGoToTableSettings: () => void }> = ({ onGoToTableSettings }) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Compartir Menú</h2>
        <button onClick={onGoToTableSettings} className="text-emerald-600 underline">Ir a configuración de mesas</button>
    </div>
);

// --- Settings ---

const ZoneEditor: React.FC<{ initialZone: Zone; onSave: (z: Zone) => void; onExit: () => void }> = ({ initialZone, onExit }) => (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 p-4">
        <h2 className="text-xl font-bold dark:text-white">Editor de Zona: {initialZone.name}</h2>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-gray-200 rounded">Salir</button>
    </div>
);

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onEditZoneLayout: (z: Zone) => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Configuración</h2>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cerrar</button>
            </div>
        </div>
    );
};

// --- Main Admin View ---

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
    const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);

    useEffect(() => {
        getAppSettings().then(setSettings);
    }, []);

    const openTableSettings = () => { setIsSettingsOpen(true); };
    
    const handleEditZoneLayout = (zone: Zone) => {
        setZoneToEdit(zone);
        setIsSettingsOpen(false);
        setIsZoneEditorOpen(true);
    };

    const handleSaveZoneLayout = async (updatedZone: Zone) => {
        try {
            await saveZoneLayout(updatedZone);
            setIsZoneEditorOpen(false);
            setZoneToEdit(null);
            setIsSettingsOpen(true);
        } catch (error) {
            alert("Error: " + error);
        }
    };

    const renderPage = () => {
        const currentCurrencySymbol = getCurrencySymbol(settings);
        switch (currentPage) {
            case 'dashboard': return <Dashboard currencySymbol={currentCurrencySymbol} />;
            case 'products': return <MenuManagement />;
            case 'orders': return <OrderManagement onSettingsClick={openTableSettings} currencySymbol={currentCurrencySymbol} />;
            case 'analytics': return <Analytics />;
            case 'messages': return <Messages />;
            case 'availability': return <AvailabilityView />;
            case 'share': return <ShareView onGoToTableSettings={openTableSettings}/>;
            default: return <Dashboard currencySymbol={currentCurrencySymbol} />;
        }
    };

    if (!settings) return null;

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} whatsappNumber={settings.branch.whatsappNumber} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header title={PAGE_TITLES[currentPage]} onSettingsClick={() => setIsSettingsOpen(true)} onPreviewClick={() => {}} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900/50">
                    <div className="max-w-7xl mx-auto">{renderPage()}</div>
                </main>
            </div>
            {isZoneEditorOpen && zoneToEdit && <ZoneEditor initialZone={zoneToEdit} onSave={handleSaveZoneLayout} onExit={() => { setIsZoneEditorOpen(false); setZoneToEdit(null); setIsSettingsOpen(true); }} />}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onEditZoneLayout={handleEditZoneLayout} />
        </div>
    );
};

export default AdminView;
