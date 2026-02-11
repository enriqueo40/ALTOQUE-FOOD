
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod, BranchSettings } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
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

const EmptyOrdersView: React.FC<{ onNewOrderClick: () => void }> = ({ onNewOrderClick }) => (
    <div className="text-center py-20 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center h-full">
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-full mb-4 animate-pulse">
            <IconReceipt className="h-12 w-12 text-gray-400"/>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Esperando pedidos...</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Los pedidos realizados desde el menú digital aparecerán aquí automáticamente en tiempo real.</p>
    </div>
);

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onUpdatePayment: (id: string, status: PaymentStatus) => void; currencySymbol: string }> = ({ order, onClose, onUpdateStatus, onUpdatePayment, currencySymbol }) => {
    const [isClosing, setIsClosing] = useState(false);

    if (!order) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleCopyOrder = () => {
         const text = `Pedido #${order.id.slice(0,5)}\nCliente: ${order.customer.name}\nTotal: ${currencySymbol}${order.total.toFixed(2)}\n\nItems:\n${order.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')}`;
         navigator.clipboard.writeText(text).then(() => alert('Pedido copiado'));
    };
    
    const handlePrint = () => {
        window.print();
    };

    const handleAdvanceStatus = () => {
        let nextStatus = OrderStatus.Pending;
        if(order.status === OrderStatus.Pending) nextStatus = OrderStatus.Confirmed;
        else if(order.status === OrderStatus.Confirmed) nextStatus = OrderStatus.Preparing;
        else if(order.status === OrderStatus.Preparing) nextStatus = OrderStatus.Ready;
        else if(order.status === OrderStatus.Ready) nextStatus = order.orderType === OrderType.Delivery ? OrderStatus.Delivering : OrderStatus.Completed;
        else if(order.status === OrderStatus.Delivering) nextStatus = OrderStatus.Completed;
        
        onUpdateStatus(order.id, nextStatus);
        handleClose();
    };

    const formattedDate = new Date(order.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'pointer-events-none' : ''}`}>
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}></div>
            <div className={`bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] ${isClosing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}>
                
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">#{order.id.slice(0, 6).toUpperCase()}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{order.customer.name}</h2>
                             <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-mono text-sm mt-1 flex items-center gap-1">
                             <IconWhatsapp className="h-4 w-4 text-green-500"/> 
                             <a href={`https://wa.me/${order.customer.phone.replace(/\D/g,'')}`} target="_blank" className="hover:underline">{order.customer.phone}</a>
                        </p>
                    </div>
                    
                     <div className="relative group">
                        <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><IconMoreVertical /></button>
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-lg border dark:border-gray-700 hidden group-hover:block z-10 overflow-hidden">
                             <button onClick={handleCopyOrder} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"><IconDuplicate className="h-4 w-4"/> Copiar detalles</button>
                             <button onClick={() => { onUpdateStatus(order.id, OrderStatus.Cancelled); handleClose(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-sm border-t dark:border-gray-700"><IconX className="h-4 w-4"/> Cancelar pedido</button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-2 space-y-4">
                             <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                 <IconReceipt className="h-5 w-5 text-gray-400"/> Detalle del pedido
                             </h3>
                             <div className="space-y-3">
                                 {order.items.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                         <div className="flex gap-3">
                                             <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{item.quantity}x</span>
                                             <div>
                                                 <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                                                 {item.comments && <p className="text-xs text-orange-600 dark:text-orange-300 italic mt-1 font-medium">Nota: {item.comments}</p>}
                                             </div>
                                         </div>
                                         <span className="font-semibold text-gray-700 dark:text-gray-300">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                                     </div>
                                 ))}
                             </div>
                             {order.generalComments && (
                                 <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                     <strong className="block mb-1">📝 Nota general del cliente:</strong> {order.generalComments}
                                 </div>
                             )}
                             
                             {/* Payment Proof Section */}
                             {order.paymentProof && (
                                 <div className="mt-4 border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                     <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                         <IconCheck className="h-5 w-5 text-green-500"/> Comprobante de pago
                                     </h4>
                                     <div className="rounded-lg overflow-hidden border dark:border-gray-600">
                                         <img src={order.paymentProof} alt="Comprobante" className="w-full h-auto object-contain max-h-64" />
                                     </div>
                                     <a href={order.paymentProof} download={`comprobante-${order.id}.png`} className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                         <IconUpload className="h-4 w-4 rotate-180"/> Descargar comprobante
                                     </a>
                                 </div>
                             )}
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                    <IconLocationMarker className="h-5 w-5 text-gray-400"/> Datos de entrega
                                </h3>
                                <div className="text-sm space-y-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tipo:</span>
                                        <span className="font-medium">{order.orderType}</span>
                                    </div>
                                    {order.tableId && (
                                         <div className="flex justify-between">
                                            <span className="text-gray-500">Mesa:</span>
                                            <span className="font-bold text-emerald-600">{order.tableId}</span>
                                        </div>
                                    )}
                                    {order.orderType === OrderType.Delivery && (
                                        <div className="pt-2 border-t dark:border-gray-600 mt-2">
                                            <p className="font-medium">{order.customer.address.calle} #{order.customer.address.numero}</p>
                                            <p className="text-gray-500">{order.customer.address.colonia}</p>
                                            {order.customer.address.referencias && <p className="text-xs mt-1 italic text-gray-500">"{order.customer.address.referencias}"</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                             <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                    <IconPayment className="h-5 w-5 text-gray-400"/> Pago
                                </h3>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{currencySymbol}{order.total.toFixed(2)}</p>
                                    <div className="flex justify-center mt-2">
                                         <button 
                                            onClick={() => onUpdatePayment(order.id, order.paymentStatus === 'paid' ? 'pending' : 'paid')}
                                            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${order.paymentStatus === 'paid' ? 'bg-green-200 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-green-100'}`}
                                        >
                                            {order.paymentStatus === 'paid' ? 'PAGADO' : 'MARCAR PAGADO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-3 justify-end">
                     <button onClick={handlePrint} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                         <IconPrinter className="h-5 w-5"/>
                     </button>
                     
                     {order.status !== OrderStatus.Completed && order.status !== OrderStatus.Cancelled && (
                        <button onClick={handleAdvanceStatus} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                            <IconCheck className="h-5 w-5"/>
                            {order.status === OrderStatus.Pending ? 'Confirmar Pedido' : 
                             order.status === OrderStatus.Confirmed ? 'Empezar Preparación' :
                             order.status === OrderStatus.Preparing ? 'Marcar Listo' :
                             order.status === OrderStatus.Ready ? (order.orderType === OrderType.Delivery ? 'Enviar Repartidor' : 'Entregar a Cliente') :
                             'Completar Pedido'}
                        </button>
                     )}
                </div>
            </div>
        </div>
    );
};

const NewOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; currencySymbol: string }> = ({ isOpen, onClose, currencySymbol }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.TakeAway);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [customerName, setCustomerName] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
    
    const { cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                const [p, c, z] = await Promise.all([getProducts(), getCategories(), getZones()]);
                setProducts(p);
                setCategories(c);
                setZones(z);
            };
            loadData();
            clearCart();
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
            return matchesSearch && matchesCategory && p.available;
        });
    }, [products, searchTerm, activeCategory]);

    const handleCreateOrder = async () => {
        if (cartItems.length === 0) {
            alert("El carrito está vacío");
            return;
        }
        if (!customerName.trim()) {
            alert("Ingresa el nombre del cliente");
            return;
        }

        const newOrder: any = {
            customer: {
                name: customerName,
                phone: '',
                address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '' }
            },
            items: cartItems,
            total: cartTotal,
            status: OrderStatus.Confirmed,
            branchId: 'main-branch',
            orderType: orderType,
            tableId: orderType === OrderType.DineIn ? selectedTable : undefined,
            paymentStatus: paymentStatus
        };

        try {
            await saveOrder(newOrder);
            onClose();
        } catch (error) {
            alert("Error al crear pedido");
        }
    };
    
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden border dark:border-gray-700">
                
                <div className="w-3/5 flex flex-col border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3">
                         <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"/>
                            <input 
                                type="text" 
                                placeholder="Buscar producto..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                         </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto p-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                        <button 
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                        >
                            Todo
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-3 gap-4">
                            {filteredProducts.map(product => (
                                <div 
                                    key={product.id} 
                                    onClick={() => addToCart(product, 1)}
                                    className="bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
                                >
                                    <div className="h-28 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
                                        <FadeInImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 leading-tight min-h-[2.5em]">{product.name}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-emerald-600 text-sm">{currencySymbol}{product.price.toFixed(2)}</span>
                                        <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-1 rounded-md">
                                            <IconPlus className="h-4 w-4"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-2/5 flex flex-col bg-white dark:bg-gray-900 h-full relative">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-bold text-lg">Nuevo Pedido</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><IconX/></button>
                    </div>

                    <div className="p-4 space-y-4 border-b dark:border-gray-700">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cliente</label>
                            <input 
                                type="text" 
                                placeholder="Nombre del cliente" 
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full p-2 border dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setOrderType(OrderType.TakeAway)}
                                className={`p-2 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${orderType === OrderType.TakeAway ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'dark:border-gray-700'}`}
                            >
                                <IconStore className="h-4 w-4"/> Para Llevar
                            </button>
                            <button 
                                onClick={() => setOrderType(OrderType.DineIn)}
                                className={`p-2 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${orderType === OrderType.DineIn ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'dark:border-gray-700'}`}
                            >
                                <IconTableLayout className="h-4 w-4"/> Comer Aquí
                            </button>
                        </div>
                        {orderType === OrderType.DineIn && (
                            <select 
                                value={selectedTable}
                                onChange={e => setSelectedTable(e.target.value)}
                                className="w-full p-2 border dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 outline-none text-sm"
                            >
                                <option value="">Seleccionar Mesa...</option>
                                {zones.map(z => (
                                    <optgroup key={z.id} label={z.name}>
                                        {z.tables.map(t => (
                                            <option key={t.id} value={`${z.name} - ${t.name}`}>Mesa {t.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                <IconReceipt className="h-12 w-12 opacity-50"/>
                                <p>Carrito vacío</p>
                            </div>
                        ) : (
                            cartItems.map(item => (
                                <div key={item.cartItemId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white dark:bg-gray-700 h-10 w-10 rounded-md flex items-center justify-center text-sm font-bold border dark:border-gray-600">
                                            {item.quantity}x
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-500">{currencySymbol}{item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-sm">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                                        <div className="flex flex-col gap-1">
                                             <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="text-gray-400 hover:text-emerald-500"><IconChevronUp className="h-4 w-4"/></button>
                                             <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartItemId, item.quantity - 1) : removeFromCart(item.cartItemId)} className="text-gray-400 hover:text-red-500"><IconChevronDown className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between mb-4">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-bold text-lg">{currencySymbol}{cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                            <span className="text-sm font-medium">Estado del pago:</span>
                            <button 
                                onClick={() => setPaymentStatus(s => s === 'paid' ? 'pending' : 'paid')}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                            >
                                {paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => {clearCart(); onClose();}} className="px-4 py-3 border dark:border-gray-600 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                                Cancelar
                            </button>
                            <button onClick={handleCreateOrder} className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20">
                                Confirmar ({currencySymbol}{cartTotal.toFixed(2)})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
         </div>
    )
}

const OrderListView: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void, currencySymbol: string }> = React.memo(({ orders, onOrderClick, currencySymbol }) => (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map(o => (
                    <tr key={o.id} onClick={() => onOrderClick(o)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm font-medium">#{o.id.slice(0,6)}</td>
                        <td className="px-6 py-4 text-sm">{o.customer.name}</td>
                        <td className="px-6 py-4"><OrderStatusBadge status={o.status}/></td>
                        <td className="px-6 py-4 text-sm font-bold">{currencySymbol}{o.total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm"><TimeAgo date={o.createdAt}/></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
));

const OrderManagement: React.FC<{ onSettingsClick: () => void; currencySymbol: string }> = ({ onSettingsClick, currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState('panel-pedidos');
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        const activeOrders = await getActiveOrders();
        setOrders(activeOrders);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
        const channel = subscribeToNewOrders(
            (newOrder) => setOrders(prev => [newOrder, ...prev]),
            (updatedOrder) => setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
        );
        return () => { unsubscribeFromChannel(); };
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try { await updateOrder(orderId, { status: newStatus }); } catch (e) { console.error(e); }
    };
    
    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        try { await updateOrder(orderId, { paymentStatus: newStatus }); } catch (e) { console.error(e); }
    };

    const renderContent = () => {
        if (isLoading) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando tablero de control...</div>;
        
        if (activeTab === 'panel-pedidos') {
            return (
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
                            <button onClick={() => setViewMode('board')} className={`p-2 rounded-md ${viewMode === 'board' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500'}`}><IconTableLayout className="h-5 w-5"/></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500'}`}><IconMenu className="h-5 w-5"/></button>
                        </div>
                        <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <IconPlus className="h-4 w-4" /> Pedido Manual
                        </button>
                    </div>
                    {orders.length === 0 ? <EmptyOrdersView onNewOrderClick={() => setIsNewOrderModalOpen(true)} /> : 
                        viewMode === 'board' ? <OrdersKanbanBoard orders={orders} onOrderClick={setSelectedOrder} currencySymbol={currencySymbol} /> :
                        <OrderListView orders={orders} onOrderClick={setSelectedOrder} currencySymbol={currencySymbol} />
                    }
                </div>
            );
        }
        return <div className="p-10 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">Panel de mesas (Simplificado)</div>;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('panel-pedidos')} className={`${activeTab === 'panel-pedidos' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Panel de pedidos</button>
                    <button onClick={() => setActiveTab('panel-mesas')} className={`${activeTab === 'panel-mesas' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Panel de mesas</button>
                </nav>
            </div>
            <div className="flex-1">{renderContent()}</div>
            <NewOrderModal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} currencySymbol={currencySymbol} />
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateOrderStatus} onUpdatePayment={updatePaymentStatus} currencySymbol={currencySymbol} />
        </div>
    );
};

// --- Mock Implementations for Missing Components to Ensure Functionality ---

const MenuManagement: React.FC = () => <div className="p-10 text-center">Gestión de Menú (Simplificada)</div>;
const Analytics: React.FC = () => <div className="p-10 text-center">Analítica (Simplificada)</div>;
const Messages: React.FC = () => <div className="p-10 text-center">Mensajes (Simplificada)</div>;
const AvailabilityView: React.FC = () => <div className="p-10 text-center">Disponibilidad (Simplificada)</div>;
const ShareView: React.FC<{ onGoToTableSettings: () => void }> = () => <div className="p-10 text-center">Compartir (Simplificada)</div>;
const ZoneEditor: React.FC<{ initialZone: any; onSave: any; onExit: any }> = () => null;
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onEditZoneLayout: any }> = ({isOpen, onClose}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Configuración (Simplificada)</h2>
                <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cerrar</button>
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
        const currentCurrencySymbol = (settings?.company.currency as any)?.symbol || (CURRENCIES.find(c => c.code === settings?.company.currency.code)?.symbol) || '$';
        switch (currentPage) {
            case 'dashboard': 
                return <Dashboard currencySymbol={currentCurrencySymbol} />;
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
