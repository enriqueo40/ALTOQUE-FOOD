
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod, BranchSettings } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder, subscribeToMenuUpdates } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff, IconToggleOn, IconChatAdmin } from '../constants';

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

// --- Helper Components ---

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

const DashboardStatCard: React.FC<{ title: string; value: string; secondaryValue: string; }> = ({ title, value, secondaryValue }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        <div className="mt-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{secondaryValue}</p>
        </div>
    </div>
);

const OrderStatusBadge: React.FC<{status: OrderStatus}> = ({status}) => {
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
};

const TimeAgo: React.FC<{ date: Date; className?: string }> = ({ date, className }) => {
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
};

// --- Pages and Views ---

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

const ProductListItem: React.FC<{product: Product, onEdit: () => void, onDuplicate: () => void, onDelete: () => void}> = ({product, onEdit, onDuplicate, onDelete}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-center gap-x-4">
                <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover"/>
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
}

const ProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (product: any) => void; product: Product | null; categories: Category[] }> = ({ isOpen, onClose, onSave, product, categories }) => {
    const [formData, setFormData] = useState<any>({});
    useEffect(() => { if (isOpen) setFormData(product || { name: '', price: 0, categoryId: categories[0]?.id || '', available: true }); }, [isOpen, product]);
    
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">{product ? 'Editar' : 'Nuevo'} Producto</h2>
                <input className="w-full p-2 border rounded mb-2" placeholder="Nombre" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <input className="w-full p-2 border rounded mb-2" type="number" placeholder="Precio" value={formData.price || 0} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required />
                <input className="w-full p-2 border rounded mb-2" placeholder="URL Imagen" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                <select className="w-full p-2 border rounded mb-4" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
                </div>
            </form>
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
                <h2 className="text-xl font-bold mb-4">{category ? 'Editar' : 'Nueva'} Categoría</h2>
                <input className="w-full p-2 border rounded mb-4" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
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
                <button onClick={() => { setEditingCat(null); setIsCatModal(true); }} className="px-4 py-2 border rounded">Nueva Categoría</button>
                <button onClick={() => { setEditingProd(null); setIsProdModal(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded">Nuevo Producto</button>
            </div>
            {categories.map(c => (
                <div key={c.id} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded shadow">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg">{c.name}</h3>
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

const PersonalizationsView: React.FC = () => <div className="p-10 text-center">Gestión de personalizaciones (Simplificado)</div>;
const PromotionsView: React.FC = () => <div className="p-10 text-center">Gestión de promociones (Simplificado)</div>;

const MenuManagement: React.FC = () => {
    const [tab, setTab] = useState('products');
    return (
        <div>
            <div className="flex gap-4 border-b mb-4">
                <button onClick={() => setTab('products')} className={`py-2 border-b-2 ${tab === 'products' ? 'border-emerald-500' : 'border-transparent'}`}>Productos</button>
                <button onClick={() => setTab('personalizations')} className={`py-2 border-b-2 ${tab === 'personalizations' ? 'border-emerald-500' : 'border-transparent'}`}>Personalizaciones</button>
                <button onClick={() => setTab('promotions')} className={`py-2 border-b-2 ${tab === 'promotions' ? 'border-emerald-500' : 'border-transparent'}`}>Promociones</button>
            </div>
            {tab === 'products' && <ProductsView />}
            {tab === 'personalizations' && <PersonalizationsView />}
            {tab === 'promotions' && <PromotionsView />}
        </div>
    );
};

// --- Order Management Components ---

const EmptyOrdersView: React.FC<{ onNewOrderClick: () => void }> = ({ onNewOrderClick }) => (
    <div className="text-center py-20 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center h-full">
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-full mb-4 animate-pulse">
            <IconReceipt className="h-12 w-12 text-gray-400"/>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Esperando pedidos...</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Los pedidos aparecerán aquí automáticamente.</p>
        <button onClick={onNewOrderClick} className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors">
            Crear pedido manual
        </button>
    </div>
);

/* Error fix: Added OrderCard component which was missing and used in OrdersKanbanBoard */
const OrderCard: React.FC<{ order: Order; onClick: () => void; currencySymbol: string }> = ({ order, onClick, currencySymbol }) => (
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
);

const OrdersKanbanBoard: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void, currencySymbol: string }> = ({ orders, onOrderClick, currencySymbol }) => {
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
};

const OrderListView: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void, currencySymbol: string }> = ({ orders, onOrderClick, currencySymbol }) => (
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
);

const NewOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; currencySymbol: string }> = ({ isOpen, onClose, currencySymbol }) => {
    const [customerName, setCustomerName] = useState('');
    const { cartItems, addToCart, clearCart, cartTotal } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    
    useEffect(() => { 
        if(isOpen) { getProducts().then(setProducts); clearCart(); } 
    }, [isOpen]);

    const handleCreate = async () => {
        if(!customerName) return alert('Nombre requerido');
        if(cartItems.length===0) return alert('Carrito vacío');
        await saveOrder({
            customer: { name: customerName, phone: '', address: { colonia: '', calle: '', numero: '' } },
            items: cartItems, total: cartTotal, status: OrderStatus.Confirmed, orderType: OrderType.TakeAway
        });
        onClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full h-[80vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4">Nuevo Pedido Manual</h2>
                <input placeholder="Nombre Cliente" className="w-full p-2 border rounded mb-4" value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
                <div className="flex-1 overflow-auto grid grid-cols-2 gap-2 mb-4">
                    {products.map(p => (
                        <div key={p.id} onClick={() => addToCart(p)} className="p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <div className="font-bold">{p.name}</div>
                            <div className="font-bold text-emerald-600 text-sm">{currencySymbol}{p.price}</div>
                        </div>
                    ))}
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-bold text-xl">Total: {currencySymbol}{cartTotal.toFixed(2)} ({cartItems.length} items)</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                        <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 text-white rounded">Crear</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onUpdatePayment: (id: string, status: PaymentStatus) => void; currencySymbol: string }> = ({ order, onClose, onUpdateStatus, onUpdatePayment, currencySymbol }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold">Pedido #{order.id.slice(0,6)}</h2>
                    <button onClick={onClose}><IconX/></button>
                </div>
                <div className="mb-4">
                    <p><strong>Cliente:</strong> {order.customer.name}</p>
                    <p><strong>Tel:</strong> {order.customer.phone}</p>
                    <p><strong>Total:</strong> {currencySymbol}{order.total.toFixed(2)}</p>
                    {order.customer.address.googleMapsLink && <a href={order.customer.address.googleMapsLink} target="_blank" className="text-blue-500 underline">Ver mapa</a>}
                </div>
                <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-40 overflow-auto">
                    {order.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-sm mb-1">
                            <span>{i.quantity}x {i.name}</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{currencySymbol}{(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    <button onClick={() => onUpdateStatus(order.id, OrderStatus.Ready)} className="bg-blue-600 text-white py-2 rounded">Marcar Listo</button>
                    <button onClick={() => onUpdateStatus(order.id, OrderStatus.Completed)} className="bg-green-600 text-white py-2 rounded">Completar</button>
                    <button onClick={() => onUpdatePayment(order.id, 'paid')} className="bg-purple-600 text-white py-2 rounded">Marcar Pagado</button>
                </div>
            </div>
        </div>
    )
};

/* Error fix: Added OrderManagement component which was missing and used in AdminView renderPage */
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

    const tabs = [
        { id: 'panel-pedidos', title: 'Panel de pedidos' },
        { id: 'panel-mesas', title: 'Panel de mesas' },
    ];

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
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{tab.title}</button>
                    ))}
                </nav>
            </div>
            <div className="flex-1">{renderContent()}</div>
            <NewOrderModal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} currencySymbol={currencySymbol} />
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateOrderStatus} onUpdatePayment={updatePaymentStatus} currencySymbol={currencySymbol} />
        </div>
    );
};

const Analytics: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    
    useEffect(() => { getActiveOrders().then(setOrders); }, []);

    const handleAnalyze = async () => {
        setLoading(true);
        const res = await getAdvancedInsights(query, orders);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Analítica IA</h2>
            <div className="flex gap-2 mb-4">
                <input className="flex-1 p-2 border rounded" placeholder="Pregunta sobre tus ventas..." value={query} onChange={e=>setQuery(e.target.value)} />
                <button onClick={handleAnalyze} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
                    {loading ? 'Analizando...' : 'Preguntar'}
                </button>
            </div>
            {result && <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded whitespace-pre-wrap">{result}</div>}
        </div>
    );
};

const Messages: React.FC = () => (
    <div className="flex h-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="w-1/3 border-r dark:border-gray-700 p-4">
            <h3 className="font-bold mb-4">Conversaciones</h3>
            {MOCK_CONVERSATIONS.map(c => (
                <div key={c.id} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded">
                    <div className="font-bold">{c.customerName}</div>
                    <div className="text-sm text-gray-500 truncate">{c.lastMessage}</div>
                </div>
            ))}
        </div>
        <div className="flex-1 p-4 flex flex-col justify-center items-center text-gray-500">
            <IconChatAdmin className="h-12 w-12 mb-2"/>
            <p>Selecciona una conversación</p>
        </div>
    </div>
);

const AvailabilityView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    useEffect(() => { getProducts().then(setProducts); }, []);
    
    const toggle = async (p: Product) => {
        const newStatus = !p.available;
        setProducts(prev => prev.map(prod => prod.id === p.id ? {...prod, available: newStatus} : prod));
        await updateProductAvailability(p.id, newStatus);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Disponibilidad de Productos</h2>
            <div className="space-y-2">
                {products.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2 border-b dark:border-gray-700">
                        <span>{p.name}</span>
                        <button onClick={() => toggle(p)} className={`px-3 py-1 rounded text-sm font-bold ${p.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.available ? 'Disponible' : 'Agotado'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; onSave?: () => void; onCancel?: () => void; noActions?: boolean }> = ({ title, description, children, onSave, onCancel, noActions }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            <div className="mt-6 space-y-4">
                {children}
            </div>
        </div>
        {!noActions && (
            <div className="mt-6 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-x-3 rounded-b-lg">
                <button onClick={onCancel} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
                <button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Guardar</button>
            </div>
        )}
    </div>
);

// --- Settings Components ---
const GeneralSettings: React.FC<{ onSave: () => void; settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    return (
        <SettingsCard title="General" onSave={onSave}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la Empresa</label>
            <input 
                type="text" 
                value={settings.company.name}
                onChange={e => setSettings(s => ({...s, company: {...s.company, name: e.target.value}}))}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
            />
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Divisa</label>
            <select
                value={settings.company.currency.code}
                onChange={e => {
                    const newCurrency = CURRENCIES.find(c => c.code === e.target.value);
                    if (newCurrency) {
                        setSettings(s => ({...s, company: {...s.company, currency: newCurrency}}));
                    }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
            >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
        </SettingsCard>
    );
};
const BranchSettingsView: React.FC<any> = ({ onSave }) => <SettingsCard title="Sucursal" onSave={onSave}>Datos de la sucursal</SettingsCard>;
const ShippingSettingsView: React.FC<any> = ({ onSave }) => <SettingsCard title="Envíos" onSave={onSave}>Costos de envío</SettingsCard>;
const PaymentSettingsView: React.FC<any> = ({ onSave }) => <SettingsCard title="Pagos" onSave={onSave}>Métodos de pago</SettingsCard>;
const HoursSettings: React.FC<any> = ({ onSave }) => <SettingsCard title="Horarios" onSave={onSave}>Horarios de atención</SettingsCard>;
const PrintingSettingsView: React.FC<any> = ({ onSave }) => <SettingsCard title="Impresión" onSave={onSave}>Configuración de impresora</SettingsCard>;

const ZoneEditor: React.FC<{ initialZone: Zone; onSave: (zone: Zone) => void; onExit: () => void }> = ({ initialZone, onSave, onExit }) => {
    const [zone, setZone] = useState(initialZone);
    const addTable = () => {
        setZone(prev => ({
            ...prev,
            tables: [...prev.tables, { id: Date.now().toString(), name: `T${prev.tables.length+1}`, row: 1, col: 1, width: 1, height: 1, shape: 'square', status: 'available', zoneId: prev.id }]
        }));
    };
    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 p-6 flex flex-col">
            <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">Editor de Zona: {zone.name}</h2>
                <div className="flex gap-2">
                    <button onClick={addTable} className="px-4 py-2 bg-blue-600 text-white rounded">Agregar Mesa</button>
                    <button onClick={() => onSave(zone)} className="px-4 py-2 bg-green-600 text-white rounded">Guardar</button>
                    <button onClick={onExit} className="px-4 py-2 border rounded">Salir</button>
                </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 overflow-auto rounded grid grid-cols-6 gap-4">
                {zone.tables.map(t => (
                    <div key={t.id} className="w-24 h-24 bg-white border flex items-center justify-center rounded shadow">
                        {t.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ZonesAndTablesSettings: React.FC<{ zones: Zone[]; onAddZone: () => void; onEditZoneName: (z: Zone) => void; onDeleteZone: (id: string) => void; onEditZoneLayout: (z: Zone) => void }> = ({ zones, onAddZone, onEditZoneLayout }) => (
    <div className="p-6">
        <div className="flex justify-between mb-4">
            <h3 className="font-bold text-lg">Zonas y Mesas</h3>
            <button onClick={onAddZone} className="px-4 py-2 bg-green-600 text-white rounded">Nueva Zona</button>
        </div>
        {zones.map(z => (
            <div key={z.id} className="border p-4 mb-2 rounded flex justify-between items-center">
                <span>{z.name}</span>
                <button onClick={() => onEditZoneLayout(z)} className="text-blue-600">Editar Distribución</button>
            </div>
        ))}
    </div>
);

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onEditZoneLayout: (zone: Zone) => void; initialPage?: SettingsPage }> = ({ isOpen, onClose, onEditZoneLayout }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [page, setPage] = useState<SettingsPage>('general');
    const [zones, setZones] = useState<Zone[]>([]);

    const loadData = async () => {
        const [s, z] = await Promise.all([getAppSettings(), getZones()]);
        setSettings(s);
        setZones(z);
    };

    useEffect(() => { 
        if(isOpen) loadData();
    }, [isOpen]);

    const handleSave = async () => { 
        if(settings) {
            await saveAppSettings(settings);
            alert("Configuración guardada.");
            loadData(); // Re-fetch to confirm
        }
    };
    
    if (!isOpen || !settings) return null;

    const renderPage = () => {
        switch (page) {
            case 'general': return <GeneralSettings onSave={handleSave} settings={settings} setSettings={setSettings} />;
            case 'store-data': return <BranchSettingsView onSave={handleSave} />;
            case 'shipping-costs': return <ShippingSettingsView onSave={handleSave} />;
            case 'payment-methods': return <PaymentSettingsView onSave={handleSave} />;
            case 'hours': return <HoursSettings onSave={handleSave} />;
            case 'zones-tables': return <ZonesAndTablesSettings zones={zones} onAddZone={() => {}} onEditZoneName={() => {}} onDeleteZone={() => {}} onEditZoneLayout={onEditZoneLayout} />;
            case 'printing': return <PrintingSettingsView onSave={handleSave} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex justify-end">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-full flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between">
                    <h2 className="text-xl font-bold">Configuración</h2>
                    <button onClick={onClose}><IconX/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-64 border-r dark:border-gray-700 p-4 space-y-1">
                        {['general', 'store-data', 'shipping-costs', 'payment-methods', 'hours', 'zones-tables', 'printing'].map(p => (
                            <button key={p} onClick={() => setPage(p as SettingsPage)} className={`w-full text-left px-4 py-2 rounded ${page === p ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                {p.replace('-', ' ').charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50">
                        {renderPage()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const QRModal: React.FC<{ isOpen: boolean; onClose: () => void; url: string; title: string }> = ({ isOpen, onClose, url, title }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white p-6 rounded text-center" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold mb-4">{title}</h3>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} alt="QR" />
                <button onClick={onClose} className="mt-4 px-4 py-2 border rounded">Cerrar</button>
            </div>
        </div>
    )
}

const ShareView: React.FC<{ onGoToTableSettings: () => void }> = ({ onGoToTableSettings }) => {
    const [qr, setQr] = useState({ open: false, url: '', title: '' });
    const baseUrl = window.location.origin + window.location.pathname + '#/menu';
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Compartir Menú</h2>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setQr({ open: true, url: baseUrl, title: 'Menú General' })} className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    <IconQR className="mx-auto mb-2"/>
                    Ver QR Menú
                </button>
                <button onClick={onGoToTableSettings} className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    <IconTableLayout className="mx-auto mb-2"/>
                    Configurar Mesas
                </button>
            </div>
            <QRModal isOpen={qr.open} onClose={() => setQr({ ...qr, open: false })} url={qr.url} title={qr.title} />
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
        const currentCurrencySymbol = settings?.company.currency.symbol || '$';
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
