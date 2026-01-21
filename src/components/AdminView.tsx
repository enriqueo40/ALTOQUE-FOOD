
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff } from '../constants';

const IconEye: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className={className} />;

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'analytics' | 'messages' | 'availability' | 'share' | 'tutorials';
type SettingsPage = 'general' | 'store-data' | 'shipping-costs' | 'payment-methods' | 'hours' | 'zones-tables' | 'printing';

const PAGE_TITLES: { [key in AdminViewPage]: string } = { dashboard: 'Inicio', products: 'Menú', orders: 'Pedidos', analytics: 'Analítica', messages: 'Mensajes', availability: 'Disponibilidad', share: 'Compartir', tutorials: 'Tutoriales' };

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void }> = ({ currentPage, setCurrentPage }) => (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
        <div className="h-20 flex items-center justify-center border-b dark:border-gray-700 font-bold">ALTOQUE FOOD</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
            {[ {id:'dashboard', name:'Inicio', icon:<IconHome/>}, {id:'orders', name:'Pedidos', icon:<IconOrders/>}, {id:'products', name:'Menú', icon:<IconMenu/>}, {id:'availability', name:'Disponibilidad', icon:<IconAvailability/>}, {id:'share', name:'Compartir', icon:<IconShare/>}, {id:'tutorials', name:'Tutoriales', icon:<IconTutorials/>}].map(item => (
                <button key={item.id} onClick={() => setCurrentPage(item.id as AdminViewPage)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${currentPage === item.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    {item.icon} <span className="font-semibold">{item.name}</span>
                </button>
            ))}
        </nav>
    </aside>
);

const Header: React.FC<{ title: string; onSettingsClick: () => void; theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ title, onSettingsClick, theme, toggleTheme }) => (
    <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center space-x-6">
            <button onClick={onSettingsClick} className="flex items-center gap-2 font-medium"><IconSettings className="h-5 w-5"/> Configuración</button>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{theme === 'light' ? <IconMoon /> : <IconSun />}</button>
        </div>
    </header>
);

const OrderStatusBadge: React.FC<{status: OrderStatus}> = ({status}) => {
    const colors = { [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800', [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800', [OrderStatus.Preparing]: 'bg-indigo-100 text-indigo-800', [OrderStatus.Ready]: 'bg-purple-100 text-purple-800', [OrderStatus.Delivering]: 'bg-cyan-100 text-cyan-800', [OrderStatus.Completed]: 'bg-green-100 text-green-800', [OrderStatus.Cancelled]: 'bg-red-100 text-red-800' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[status]}`}>{status}</span>;
};

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onUpdatePayment: (id: string, status: PaymentStatus) => void }> = ({ order, onClose, onUpdateStatus, onUpdatePayment }) => {
    if (!order) return null;
    const handleAdvance = () => {
        const flow = [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Delivering, OrderStatus.Completed];
        const next = flow[flow.indexOf(order.status) + 1] || order.status;
        onUpdateStatus(order.id, next);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col relative max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Pedido #{order.id.slice(0, 6)}</h2>
                    <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase">Cliente</p>
                            <p className="font-semibold text-lg">{order.customer.name}</p>
                            <p className="text-sm font-mono">{order.customer.phone}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase">Datos de Entrega</p>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                                <p className="text-sm font-medium">{order.customer.address.calle} #{order.customer.address.numero}</p>
                                <p className="text-xs text-gray-500">{order.customer.address.colonia}</p>
                                {order.customer.address.referencias && <p className="text-xs italic text-gray-400 mt-1">"{order.customer.address.referencias}"</p>}
                                
                                {order.customer.address.googleMapsLink && (
                                    <a 
                                        href={order.customer.address.googleMapsLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-bold shadow-md shadow-blue-900/20"
                                    >
                                        <IconLocationMarker className="h-4 w-4"/>
                                        Ver Ubicación GPS
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase">Productos</p>
                        <div className="divide-y dark:divide-gray-700">
                            {order.items.map((item, i) => (
                                <div key={i} className="py-3 flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <span className="font-bold text-emerald-600">{item.quantity}x</span>
                                        <div>
                                            <p className="font-medium text-sm">{item.name}</p>
                                            {item.comments && <p className="text-xs text-gray-400 italic">"{item.comments}"</p>}
                                        </div>
                                    </div>
                                    <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t dark:border-gray-700 flex justify-between font-bold text-xl">
                        <span>TOTAL</span>
                        <span className="text-emerald-600">${order.total.toFixed(2)}</span>
                    </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <button onClick={() => onUpdateStatus(order.id, OrderStatus.Cancelled)} className="px-4 py-2 border dark:border-gray-600 rounded-lg text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Cancelar</button>
                    <button onClick={handleAdvance} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-900/20">Avanzar Estado</button>
                </div>
            </div>
        </div>
    );
};

const OrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selOrder, setSelOrder] = useState<Order | null>(null);
    useEffect(() => {
        getActiveOrders().then(setOrders);
        const unsub = subscribeToNewOrders((o) => setOrders(prev => [o, ...prev]), (upd) => setOrders(prev => prev.map(o => o.id === upd.id ? upd : o)));
        return unsub;
    }, []);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(o => (
                <div key={o.id} onClick={() => setSelOrder(o)} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 cursor-pointer shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex justify-between mb-2"><span className="font-bold text-xs text-gray-400">#{o.id.slice(0,6)}</span><OrderStatusBadge status={o.status}/></div>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{o.customer.name}</p>
                    <div className="flex justify-between items-end mt-3">
                        <p className="text-sm text-gray-500">{o.items.length} item(s)</p>
                        <p className="text-xl font-bold text-emerald-600">${o.total.toFixed(2)}</p>
                    </div>
                </div>
            ))}
            <OrderDetailModal order={selOrder} onClose={() => setSelOrder(null)} onUpdateStatus={(id, s) => updateOrder(id, {status: s})} onUpdatePayment={(id, p) => updateOrder(id, {paymentStatus: p})} />
        </div>
    );
};

const AdminView: React.FC = () => {
    const [page, setPage] = useState<AdminViewPage>('orders');
    const [theme, toggleTheme] = useTheme();
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200">
            <Sidebar currentPage={page} setCurrentPage={setPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header title={PAGE_TITLES[page]} onSettingsClick={() => {}} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-8">
                    {page === 'orders' && <OrderManagement />}
                    {page !== 'orders' && <div className="text-center p-10 opacity-50">Sección en construcción...</div>}
                </main>
            </div>
        </div>
    );
};

export default AdminView;
