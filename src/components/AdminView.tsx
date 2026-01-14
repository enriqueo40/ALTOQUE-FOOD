
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

// --- AUDIO SYNTHESIZER ---
const playChicAlert = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
        masterGain.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05); 
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5); 
        osc1.connect(gain1);
        gain1.connect(masterGain);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        
        osc1.stop(ctx.currentTime + 1.5);
        osc2.stop(ctx.currentTime + 1.5);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

const NewOrderToast: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
    if (!order) return null;

    return (
        <div className="fixed top-24 right-5 z-50 w-80 animate-fade-in-up">
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-l-4 border-emerald-500 shadow-2xl rounded-r-lg p-4 overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-start gap-3">
                         <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm">
                             <IconBell className="h-6 w-6 animate-[swing_1s_ease-in-out_infinite]" />
                         </div>
                         <div>
                             <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">¡Nuevo Pedido!</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">#{order.id.slice(0,6)}</p>
                             <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">${order.total.toFixed(2)}</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <IconX className="h-4 w-4"/>
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes swing {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(15deg); }
                    40% { transform: rotate(-10deg); }
                    60% { transform: rotate(5deg); }
                    80% { transform: rotate(-5deg); }
                }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes shimmer { 100% { transform: translateX(100%); } }
            `}</style>
        </div>
    );
}

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void; hasUnreadOrders: boolean }> = ({ currentPage, setCurrentPage, hasUnreadOrders }) => {
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
                    <h2 className="text-xl font-bold dark:text-gray-100">ALTOQUE FOOD</h2>
                    <IconChevronDown className="h-4 w-4" />
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${currentPage === item.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <div className="relative">
                            {item.icon}
                            {item.id === 'orders' && hasUnreadOrders && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-gray-800"></span>
                                </span>
                            )}
                        </div>
                        <span className="font-semibold">{item.name}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 py-6 border-t dark:border-gray-700 text-sm">
                <p className="text-gray-600 dark:text-gray-300 font-medium">+584146945877</p>
                <p className="text-gray-500 dark:text-gray-400">Atención rápida</p>
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

const Dashboard: React.FC = () => {
    // Connected to Real Data from Supabase
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

    const previousDaySales = totalSales * 0.9; // Simulation for comparison
    const previousDayOrders = Math.floor(totalOrders * 0.9); // Simulation for comparison
    
    const totalEnvios = orders.filter(o => o.orderType === OrderType.Delivery).length;
    const totalPropinas = 0; // This would need extraction from order details if stored separately

    if (isLoading) {
        return <div className="p-10 text-center animate-pulse text-gray-500">Cargando estadísticas...</div>;
    }

    return (
        <div className="space-y-6">
            <FeatureBanner />
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
                <DashboardStatCard title="Ventas" value={`$${totalSales.toFixed(2)}`} secondaryValue={`$${previousDaySales.toFixed(2)}`} />
                <DashboardStatCard title="Pedidos" value={totalOrders.toString()} secondaryValue={previousDayOrders.toString()} />
                <DashboardStatCard title="Envíos" value={totalEnvios.toString()} secondaryValue={"0"} />
                <DashboardStatCard title="Propinas" value={`$${totalPropinas.toFixed(2)}`} secondaryValue={"$0.00"} />

                {/* Placeholder Cards */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Ticket promedio</h4>
                    <div className="h-48 flex items-center justify-center">
                        <div className="text-4xl font-bold text-gray-300 dark:text-gray-600">${totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}</div>
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

const ProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (product: Omit<Product, 'id' | 'created_at'> & { id?: string }) => void; product: Product | null; categories: Category[] }> = ({ isOpen, onClose, onSave, product, categories }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData(product);
            } else {
                setFormData({ name: '', description: '', price: 0, imageUrl: '', categoryId: categories[0]?.id || '', available: true });
            }
        }
    }, [product, isOpen, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | boolean = value;
        if (type === 'number') processedValue = parseFloat(value) || 0;
        if (name === 'available') processedValue = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => { setFormData(prev => ({ ...prev, imageUrl: reader.result as string })); };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name) { alert("Por favor, introduce primero el nombre del producto."); return; }
        setIsGenerating(true);
        try {
            const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'General';
            const description = await generateProductDescription(formData.name!, categoryName, formData.description || '');
            setFormData(prev => ({ ...prev, description }));
        } catch (error) {
            console.error("Error generating description:", error);
            alert("No se pudo generar la descripción.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) { alert("Por favor, sube una imagen para el producto."); return; }
        onSave({
            id: product?.id,
            name: formData.name!,
            description: formData.description!,
            price: formData.price!,
            imageUrl: formData.imageUrl!,
            categoryId: formData.categoryId!,
            available: formData.available!,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h2>
                    <div className="space-y-4">
                        <input type="text" name="name" placeholder="Nombre" value={formData.name || ''} onChange={handleChange} required className={inputClasses}/>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                                <button type="button" onClick={handleGenerateDescription} disabled={isGenerating || !formData.name} className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <IconSparkles className="h-4 w-4" />{isGenerating ? 'Generando...' : 'Generar con IA'}
                                </button>
                            </div>
                            <textarea id="description" name="description" placeholder="Descripción" rows={3} value={formData.description || ''} onChange={handleChange} required className={inputClasses.replace('mt-1', '')}></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del producto</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} alt="Vista previa" className="mx-auto h-24 w-auto max-w-full object-contain rounded-md" />
                                    ) : (
                                        <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center"><IconUpload className="h-8 w-8"/></div>
                                    )}
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-emerald-600 hover:text-emerald-500 px-1">
                                            <span>{formData.imageUrl ? 'Cambiar imagen' : 'Subir un archivo'}</span>
                                            <input id="file-upload" name="imageUrl" type="file" className="sr-only" onChange={handleImageChange} accept="image/png, image/jpeg, image/gif"/>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input type="number" name="price" placeholder="Precio" step="0.01" value={formData.price || 0} onChange={handleChange} required className={inputClasses}/>
                        <select name="categoryId" value={formData.categoryId} onChange={handleChange} required className={inputClasses}>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <div className="flex items-center">
                            <input id="available" name="available" type="checkbox" checked={formData.available} onChange={handleChange} className="h-4 w-4 text-emerald-500 focus:ring-emerald-400 border-gray-300 rounded" />
                            <label htmlFor="available" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Disponible para la venta</label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Guardar Producto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CategoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Omit<Category, 'id' | 'created_at'> & { id?: string }) => void;
    category: Category | null;
}> = ({ isOpen, onClose, onSave, category }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) setName(category ? category.name : '');
    }, [category, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ id: category?.id, name: name.trim() });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{category ? 'Editar Categoría' : 'Agrega una categoría'}</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de categoría</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"/>
                    </div>
                    <div className="flex justify-end space-x-4 pt-2">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold">{category ? 'Guardar Cambios' : 'Agregar categoría'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProductsView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [fetchedProducts, fetchedCategories] = await Promise.all([
                getProducts(),
                getCategories()
            ]);
            setProducts(fetchedProducts);
            setCategories(fetchedCategories);
        } catch (err) {
            setError("Error al cargar los datos. Revisa la consola y la configuración de Supabase.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenProductModal = (product: Product | null) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => setIsProductModalOpen(false);

    const handleSaveProduct = async (productData: Omit<Product, 'id' | 'created_at'> & { id?: string }) => {
        try {
            await saveProduct(productData);
            await fetchData(); // Refetch data to show changes
        } catch (error) {
            alert("No se pudo guardar el producto.");
        } finally {
            handleCloseProductModal();
        }
    };
    
    const handleOpenCategoryModal = (category: Category | null) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const handleCloseCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
    };

    const handleSaveCategory = async (categoryData: Omit<Category, 'id' | 'created_at'> & { id?: string }) => {
        try {
            await saveCategory(categoryData);
            await fetchData(); // Refetch data
        } catch (error) {
            alert("No se pudo guardar la categoría.");
        } finally {
            handleCloseCategoryModal();
        }
    };
    
    const handleDeleteProduct = async (productId: string) => {
      if(window.confirm('¿Seguro que quieres borrar este producto?')) {
        try {
            await deleteProduct(productId);
            await fetchData();
        } catch (error) {
            alert("No se pudo borrar el producto.");
        }
      }
    };
    
    const handleDuplicateProduct = async (product: Product) => {
        const { id, created_at, ...productData } = product;
        const newProductData = {
            ...productData,
            name: `${product.name} (Copia)`
        };
        try {
            await saveProduct(newProductData);
            await fetchData();
        } catch (error) {
             alert("No se pudo duplicar el producto.");
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        const productsInCategory = products.filter(p => p.categoryId === categoryId);
        let confirmed = false;

        if (productsInCategory.length > 0) {
            confirmed = window.confirm(
                `Esta categoría contiene ${productsInCategory.length} producto(s). Borrarla también borrará todos sus productos. ¿Continuar?`
            );
        } else {
            confirmed = window.confirm('¿Seguro que quieres borrar esta categoría?');
        }

        if (confirmed) {
            try {
                await deleteCategory(categoryId);
                await fetchData();
            } catch (error) {
                alert("No se pudo borrar la categoría. Puede que aún contenga productos.");
            }
        }
    };

    const CategoryActions: React.FC<{ category: Category }> = ({ category }) => {
        const [isOpen, setIsOpen] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        return (
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsOpen(p => !p)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded-full">
                    <IconMoreVertical />
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <div className="p-1">
                            <button onClick={() => { handleOpenCategoryModal(category); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"> <IconEdit className="h-4 w-4" /> Editar</button>
                            <button onClick={() => { handleDeleteCategory(category.id); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const groupedProducts = useMemo(() => {
        if (isLoading || error) return [];
        return categories.map(category => ({
            ...category,
            products: products.filter(p => p.categoryId === category.id)
        }));
    }, [products, categories, isLoading, error]);
    
    if (isLoading) return <div className="text-center p-10">Cargando datos desde Supabase...</div>;
    if (error) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div>
            <div className="flex justify-end items-center mb-6 gap-x-4">
                <button onClick={() => handleOpenCategoryModal(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">
                    + Nueva categoría
                </button>
                <button onClick={() => handleOpenProductModal(null)} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                    + Nuevo producto
                </button>
            </div>

            <div className="space-y-6">
                {groupedProducts.map(category => (
                    <div key={category.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-x-3">
                                <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                                <h3 className="text-lg font-semibold">{category.name}</h3>
                            </div>
                            <CategoryActions category={category} />
                        </div>
                        <div className="space-y-2">
                           {category.products.map((product, index) => (
                               <div key={product.id}>
                                   <ProductListItem 
                                       product={product} 
                                       onEdit={() => handleOpenProductModal(product)}
                                       onDelete={() => handleDeleteProduct(product.id)}
                                       onDuplicate={() => handleDuplicateProduct(product)}
                                   />
                                   {index < category.products.length -1 && <hr className="my-2 dark:border-gray-700"/>}
                               </div>
                           ))}
                        </div>
                         <div className="text-right text-sm text-gray-500 dark:text-gray-400 pt-4">
                            Mostrando {category.products.length} productos
                        </div>
                    </div>
                ))}
            </div>
            
            <ProductModal
                isOpen={isProductModalOpen}
                onClose={handleCloseProductModal}
                onSave={handleSaveProduct}
                product={editingProduct}
                categories={categories}
            />
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={handleCloseCategoryModal}
                onSave={handleSaveCategory}
                category={editingCategory}
            />
        </div>
    );
};

const PersonalizationModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (p: Omit<Personalization, 'id' | 'created_at'> & { id?: string }) => void, personalization: Personalization | null}> = ({isOpen, onClose, onSave, personalization}) => {
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [allowRepetition, setAllowRepetition] = useState(false);
    const [options, setOptions] = useState<Omit<PersonalizationOption, 'id' | 'available'>[]>([{name: '', price: 0}]);
    const [minSelection, setMinSelection] = useState(0);
    const [maxSelection, setMaxSelection] = useState<number | null>(null);

    const lightInputClasses = "w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    useEffect(() => {
        if (isOpen) {
            if (personalization) {
                setName(personalization.name); setLabel(personalization.label); setAllowRepetition(personalization.allowRepetition);
                setOptions(personalization.options.map(({id, available, ...rest}) => rest));
                setMinSelection(personalization.minSelection || 0); setMaxSelection(personalization.maxSelection ?? null);
            } else {
                setName(''); setLabel(''); setOptions([{ name: '', price: 0 }]); setAllowRepetition(false); setMinSelection(0); setMaxSelection(null);
            }
        }
    }, [isOpen, personalization]);

    const handleOptionChange = (index: number, field: 'name' | 'price', value: string) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
        setOptions(newOptions);
    };

    const addOption = () => setOptions([...options, {name: '', price: 0}]);
    
    const removeOption = (index: number) => {
        if (options.length > 1) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newPersonalization = {
            id: personalization?.id,
            name,
            label,
            allowRepetition,
            minSelection,
            maxSelection,
            options: options.map((opt, i) => ({...opt, id: `opt-${Date.now()}-${i}`, available: true }))
        };
        onSave(newPersonalization);
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-end">
            <div className="bg-white dark:bg-gray-800 h-full w-full max-w-3xl flex flex-col relative p-6">
                <h2 className="text-xl font-semibold mb-4">{personalization ? 'Editar' : 'Agregar'} personalización</h2>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
                    <input type="text" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded dark:bg-gray-700"/>
                    <input type="text" placeholder="Etiqueta" value={label} onChange={e => setLabel(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700"/>
                    <div>
                        <label>Opciones</label>
                        {options.map((opt, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" placeholder="Nombre Opción" value={opt.name} onChange={e => {const newOpts = [...options]; newOpts[i].name = e.target.value; setOptions(newOpts)}} className="flex-1 p-2 border rounded dark:bg-gray-700"/>
                                <input type="number" placeholder="Precio" value={opt.price} onChange={e => {const newOpts = [...options]; newOpts[i].price = parseFloat(e.target.value)||0; setOptions(newOpts)}} className="w-24 p-2 border rounded dark:bg-gray-700"/>
                                <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}><IconTrash/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setOptions([...options, {name: '', price: 0}])} className="text-emerald-600">+ Agregar opción</button>
                    </div>
                    <div className="flex gap-4">
                        <label><input type="checkbox" checked={allowRepetition} onChange={e => setAllowRepetition(e.target.checked)}/> Permitir repetición</label>
                        <input type="number" placeholder="Min" value={minSelection} onChange={e => setMinSelection(parseInt(e.target.value)||0)} className="w-20 p-2 border rounded dark:bg-gray-700"/>
                        <input type="number" placeholder="Max" value={maxSelection??''} onChange={e => setMaxSelection(e.target.value ? parseInt(e.target.value) : null)} className="w-20 p-2 border rounded dark:bg-gray-700"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const PersonalizationsView: React.FC = () => {
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Personalization | null>(null);

    const fetchData = async () => { setPersonalizations(await getPersonalizations()); };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async (p: any) => { await savePersonalization(p); fetchData(); setIsModalOpen(false); };
    const handleDelete = async (id: string) => { if(confirm('¿Borrar?')) { await deletePersonalization(id); fetchData(); }};

    return (
        <div>
            <div className="flex justify-end mb-4"><button onClick={() => {setEditing(null); setIsModalOpen(true)}} className="bg-emerald-600 text-white px-4 py-2 rounded">Nueva Personalización</button></div>
            <div className="bg-white dark:bg-gray-800 rounded shadow p-4 space-y-2">
                {personalizations.map(p => (
                    <div key={p.id} className="flex justify-between border-b p-2">
                        <span>{p.name}</span>
                        <div>
                            <button onClick={() => {setEditing(p); setIsModalOpen(true)}} className="mr-2"><IconEdit/></button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-500"><IconTrash/></button>
                        </div>
                    </div>
                ))}
            </div>
            <PersonalizationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} personalization={editing} />
        </div>
    );
};

const PromotionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (promo: any) => void; promotion: Promotion | null; products: Product[]; }> = ({ isOpen, onClose, onSave, promotion, products }) => {
    const [formData, setFormData] = useState<any>({ name: '', discountType: DiscountType.Percentage, discountValue: 0, appliesTo: PromotionAppliesTo.AllProducts, productIds: [], startDate: '', endDate: '' });
    useEffect(() => { if (isOpen) setFormData(promotion || { name: '', discountType: DiscountType.Percentage, discountValue: 0, appliesTo: PromotionAppliesTo.AllProducts, productIds: [], startDate: '', endDate: '' }); }, [isOpen, promotion]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-end">
            <div className="bg-white dark:bg-gray-800 h-full w-full max-w-3xl flex flex-col p-6">
                <h2 className="text-xl font-bold mb-4">{promotion ? 'Editar' : 'Nueva'} Promoción</h2>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
                    <input type="text" placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" required/>
                    <div className="flex gap-4">
                        <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="p-2 border rounded dark:bg-gray-700">
                            <option value={DiscountType.Percentage}>Porcentaje</option>
                            <option value={DiscountType.Fixed}>Monto Fijo</option>
                        </select>
                        <input type="number" placeholder="Valor" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: parseFloat(e.target.value)})} className="p-2 border rounded dark:bg-gray-700" required/>
                    </div>
                    <select value={formData.appliesTo} onChange={e => setFormData({...formData, appliesTo: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700">
                        <option value={PromotionAppliesTo.AllProducts}>Todos los productos</option>
                        <option value={PromotionAppliesTo.SpecificProducts}>Productos específicos</option>
                    </select>
                    {formData.appliesTo === PromotionAppliesTo.SpecificProducts && (
                        <div className="h-40 overflow-y-auto border p-2 rounded">
                            {products.map(p => (
                                <label key={p.id} className="block"><input type="checkbox" checked={formData.productIds.includes(p.id)} onChange={e => {
                                    const ids = e.target.checked ? [...formData.productIds, p.id] : formData.productIds.filter((id: string) => id !== p.id);
                                    setFormData({...formData, productIds: ids});
                                }}/> {p.name}</label>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-4">
                        <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="p-2 border rounded dark:bg-gray-700"/>
                        <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="p-2 border rounded dark:bg-gray-700"/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PromotionsView: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Promotion | null>(null);

    const fetchData = async () => { const [pr, pd] = await Promise.all([getPromotions(), getProducts()]); setPromotions(pr); setProducts(pd); };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async (data: any) => { await savePromotion({...data, id: editing?.id}); fetchData(); setIsModalOpen(false); };
    const handleDelete = async (id: string) => { if(confirm('¿Borrar?')) { await deletePromotion(id); fetchData(); }};

    return (
        <div>
            <div className="flex justify-end mb-4"><button onClick={() => {setEditing(null); setIsModalOpen(true)}} className="bg-emerald-600 text-white px-4 py-2 rounded">Nueva Promoción</button></div>
            <div className="space-y-2">
                {promotions.map(p => (
                    <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between">
                        <div>
                            <h4 className="font-bold">{p.name}</h4>
                            <p className="text-sm">{p.discountValue}{p.discountType === 'percentage' ? '%' : '$'} OFF</p>
                        </div>
                        <div>
                            <button onClick={() => {setEditing(p); setIsModalOpen(true)}} className="mr-2"><IconEdit/></button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-500"><IconTrash/></button>
                        </div>
                    </div>
                ))}
            </div>
            <PromotionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} promotion={editing} products={products} />
        </div>
    );
};

const MenuManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('products');
    const tabs = [{ id: 'products', title: 'Productos' }, { id: 'personalizations', title: 'Personalizaciones' }, { id: 'promotions', title: 'Promociones' }];
    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{tab.title}</button>))}
                </nav>
            </div>
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'personalizations' && <PersonalizationsView />}
            {activeTab === 'promotions' && <PromotionsView />}
        </div>
    );
};

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onUpdatePayment: (id: string, status: PaymentStatus) => void }> = ({ order, onClose, onUpdateStatus, onUpdatePayment }) => {
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
         const text = `Pedido #${order.id.slice(0,5)}\nCliente: ${order.customer.name}\nTotal: $${order.total.toFixed(2)}\n\nItems:\n${order.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')}`;
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
                                         <span className="font-semibold text-gray-700 dark:text-gray-300">${(item.price * item.quantity).toFixed(2)}</span>
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
                                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">${order.total.toFixed(2)}</p>
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
    
    const labels = {
        [OrderStatus.Pending]: 'Nuevo',
        [OrderStatus.Confirmed]: 'Confirmado',
        [OrderStatus.Preparing]: 'Preparando',
        [OrderStatus.Ready]: 'Listo',
        [OrderStatus.Delivering]: 'En camino',
        [OrderStatus.Completed]: 'Completado',
        [OrderStatus.Cancelled]: 'Cancelado',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {labels[status]}
        </span>
    );
};

const TimeAgo: React.FC<{ date: Date; className?: string }> = ({ date, className }) => {
    const [text, setText] = useState('');
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
            
            if (diffInSeconds < 60) setText('hace un momento');
            else {
                const mins = Math.floor(diffInSeconds / 60);
                setText(`hace ${mins} min`);
                setIsLate(mins > 15); // Mark as late after 15 mins
            }
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [date]);

    return <span className={`${className} ${isLate ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{text}</span>;
};

// Memoized Order Card
const OrderCard: React.FC<{ order: Order; onClick: () => void }> = React.memo(({ order, onClick }) => (
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
                <p className="font-bold text-emerald-600 dark:text-emerald-400">${order.total.toFixed(2)}</p>
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

const OrdersKanbanBoard: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void }> = ({ orders, onOrderClick }) => {
    const columns = [
        { status: OrderStatus.Pending, title: 'Nuevos', color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' },
        { status: OrderStatus.Confirmed, title: 'Confirmados', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' },
        { status: OrderStatus.Preparing, title: 'Preparando', color: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10' },
        { status: OrderStatus.Ready, title: 'Listos', color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' },
        { status: OrderStatus.Delivering, title: 'En Reparto', color: 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10' },
    ];

    return (
        <div className="flex space-x-4 overflow-x-auto pb-4 h-full px-2">
            {columns.map(col => {
                const colOrders = orders.filter(o => o.status === col.status);
                return (
                    <div key={col.status} className="w-80 flex-shrink-0 flex flex-col h-full">
                        <div className={`flex justify-between items-center mb-3 px-4 py-2 rounded-lg border-l-4 bg-white dark:bg-gray-800 shadow-sm ${col.color}`}>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase text-xs tracking-wider">{col.title}</h3>
                            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">{colOrders.length}</span>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                            {colOrders.map(order => (
                                <OrderCard key={order.id} order={order} onClick={() => onOrderClick(order)} />
                            ))}
                            {colOrders.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-sm text-gray-400">Sin pedidos</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const OrderListView: React.FC<{ orders: Order[], onOrderClick: (order: Order) => void }> = ({ orders, onOrderClick }) => {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedido</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tiempo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pago</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.map(order => (
                        <tr key={order.id} onClick={() => onOrderClick(order)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600">#{order.id.slice(0, 6)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">{order.customer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${order.orderType === OrderType.Delivery ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                    {order.orderType === OrderType.Delivery ? 'Domicilio' : 'Para llevar'}
                                </span>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <TimeAgo date={order.createdAt} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                 <span className={`px-2 py-1 rounded-md text-xs font-bold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {order.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                ${order.total.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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

const NewOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.TakeAway);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [customerName, setCustomerName] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
    
    // Cart logic
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
            status: OrderStatus.Confirmed, // Manual orders start as Confirmed
            branchId: 'main-branch', // Default
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
                
                {/* Left: Product Selection */}
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
                    
                    {/* Categories */}
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

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-3 gap-4">
                            {filteredProducts.map(product => (
                                <div 
                                    key={product.id} 
                                    onClick={() => addToCart(product, 1)}
                                    className="bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
                                >
                                    <div className="h-28 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
                                        <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 leading-tight min-h-[2.5em]">{product.name}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-emerald-600 text-sm">${product.price.toFixed(2)}</span>
                                        <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-1 rounded-md">
                                            <IconPlus className="h-4 w-4"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Order Details */}
                <div className="w-2/5 flex flex-col bg-white dark:bg-gray-900 h-full relative">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-bold text-lg">Nuevo Pedido</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><IconX/></button>
                    </div>

                    <div className="p-4 space-y-4 border-b dark:border-gray-700">
                        {/* Customer */}
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

                        {/* Type */}
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

                    {/* Cart Items */}
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
                                            <p className="text-xs text-gray-500">${item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                        <div className="flex flex-col gap-1">
                                             <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="text-gray-400 hover:text-emerald-500"><IconChevronUp className="h-4 w-4"/></button>
                                             <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartItemId, item.quantity - 1) : removeFromCart(item.cartItemId)} className="text-gray-400 hover:text-red-500"><IconChevronDown className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer / Checkout */}
                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between mb-4">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
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
                                Confirmar (${cartTotal.toFixed(2)})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
         </div>
    )
}

const OrderManagement: React.FC<{ onSettingsClick: () => void }> = ({ onSettingsClick }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState('panel-pedidos');
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [storeOpen, setStoreOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [zones, setZones] = useState<Zone[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            const [activeOrders, fetchedZones] = await Promise.all([
                getActiveOrders(),
                getZones()
            ]);
            setOrders(activeOrders);
            setZones(fetchedZones);
            if(fetchedZones.length > 0) setActiveZoneId(fetchedZones[0].id);
            setIsLoading(false);
        };
        load();
        const unsubscribe = subscribeToNewOrders((newOrder) => setOrders(prev => [newOrder, ...prev]), (updatedOrder) => setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)));
        return () => { unsubscribe(); };
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try { await updateOrder(orderId, { status: newStatus }); } catch (e: any) { console.error(e); }
    };
    
    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        try { await updateOrder(orderId, { paymentStatus: newStatus }); } catch (e: any) { console.error(e); }
    }
    
    const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId]);
    const getTableStatus = (zoneName: string, tableName: string) => {
        const tableIdentifier = `${zoneName} - ${tableName}`;
        const activeOrder = orders.find(o => o.tableId === tableIdentifier && o.status !== OrderStatus.Completed && o.status !== OrderStatus.Cancelled);
        return activeOrder ? { status: 'occupied', order: activeOrder } : { status: 'free', order: null };
    };
    
    const tableStats = useMemo(() => {
         const activeTables = orders.filter(o => o.tableId && o.status !== OrderStatus.Completed && o.status !== OrderStatus.Cancelled).length;
         const requestingBill = orders.filter(o => o.tableId && o.status === OrderStatus.Ready && o.paymentStatus === 'pending').length;
         return { requestingBill: requestingBill, requestingWaiter: 0, pendingOrders: orders.filter(o => o.tableId && o.status === OrderStatus.Pending).length, activeTables: activeTables }
    }, [orders]);

    const tabs = [{ id: 'panel-pedidos', title: 'Panel de pedidos' }, { id: 'panel-mesas', title: 'Panel de mesas' }, { id: 'comandas-digitales', title: 'Comandas digitales' }];
    
    const renderContent = () => {
        if (isLoading) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando tablero de control...</div>;
        switch (activeTab) {
            case 'panel-pedidos':
                return (
                    <div className="h-[calc(100vh-220px)] flex flex-col">
                         <div className="flex justify-between items-center mb-4 px-1">
                            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm">
                                <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vista Tablero"><IconTableLayout className="h-5 w-5"/></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vista Lista"><IconMenu className="h-5 w-5"/></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                     <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors shadow-sm ${storeOpen ? 'border-green-900/30 bg-green-900/20 text-green-400' : 'border-red-900/30 bg-red-900/20 text-red-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${storeOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>{storeOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}<IconChevronDown className="h-4 w-4 opacity-50 ml-2"/>
                                    </button>
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700 hidden group-hover:block z-10 p-1">
                                        <button onClick={() => setStoreOpen(o => !o)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-gray-300"><IconToggleOff className="h-4 w-4"/> {storeOpen ? 'Cerrar Tienda' : 'Abrir Tienda'}</button>
                                    </div>
                                </div>
                                <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition-all"><IconPlus className="h-4 w-4 text-gray-900" /> Pedido Manual</button>
                            </div>
                         </div>
                        {orders.length === 0 ? (<EmptyOrdersView onNewOrderClick={() => setIsNewOrderModalOpen(true)} />) : (viewMode === 'board' ? (<OrdersKanbanBoard orders={orders} onOrderClick={setSelectedOrder} />) : (<div className="flex-1 overflow-auto rounded-lg border dark:border-gray-700"><OrderListView orders={orders} onOrderClick={setSelectedOrder} /></div>))}
                    </div>
                );
            case 'panel-mesas':
                return (
                    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="flex justify-end gap-3 mb-4"><button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Ver uso de suscripción</button><button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">Ver historial <IconClock className="h-4 w-4 text-gray-400"/></button></div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                            <div className="p-4 flex items-center justify-center md:justify-start md:w-48"><button className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><IconCalendar className="h-5 w-5 text-gray-500"/>Hoy</button></div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
                                <div className="p-4 text-center"><p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.requestingBill}</p><p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas solicitando cuenta</p></div>
                                <div className="p-4 text-center"><p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.requestingWaiter}</p><p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas solicitando mesero</p></div>
                                <div className="p-4 text-center"><p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.pendingOrders}</p><p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas con comandas pendientes</p></div>
                                <div className="p-4 text-center"><p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.activeTables}</p><p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas activas</p></div>
                            </div>
                        </div>
                        <div className="mb-6"><div className="flex gap-2 overflow-x-auto pb-2">{zones.map(zone => (<button key={zone.id} onClick={() => setActiveZoneId(zone.id)} className={`px-6 py-2 rounded-lg border font-medium text-sm transition-all whitespace-nowrap ${activeZoneId === zone.id ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>{zone.name}</button>))}{zones.length === 0 && (<div className="text-sm text-gray-500 p-2">No hay zonas configuradas. Ve a Configuración &gt; Zonas y mesas.</div>)}</div></div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 p-8 overflow-auto relative min-h-[400px]">
                            {activeZone ? (
                                <div className="grid gap-6" style={{gridTemplateColumns: `repeat(${activeZone.cols}, minmax(80px, 1fr))`, gridTemplateRows: `repeat(${activeZone.rows}, minmax(80px, 1fr))`}}>
                                    {activeZone.tables.map(table => {
                                        const { status, order } = getTableStatus(activeZone.name, table.name);
                                        const isOccupied = status === 'occupied';
                                        return (
                                            <div key={table.id} onClick={() => isOccupied && order ? setSelectedOrder(order) : null} style={{gridRow: `${table.row} / span ${table.height}`, gridColumn: `${table.col} / span ${table.width}`}} className={`relative rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 ${table.shape === 'round' ? 'rounded-full aspect-square' : 'rounded-xl'} ${isOccupied ? 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-500/50 shadow-md' : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                                                <span className={`text-2xl font-bold ${isOccupied ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{table.name}</span>
                                                {isOccupied && order && (<div className="absolute -top-2 -right-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-sm">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span></div>)}
                                                {isOccupied && (<div className="mt-1 px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] font-medium text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700 truncate max-w-[90%]">Ocupada</div>)}
                                            </div>
                                        );
                                    })}
                                    {Array.from({ length: activeZone.rows * activeZone.cols }).map((_, index) => {
                                        const row = Math.floor(index / activeZone.cols) + 1; const col = (index % activeZone.cols) + 1;
                                        const isOccupied = activeZone.tables.some(t => row >= t.row && row < t.row + t.height && col >= t.col && col < t.col + t.width);
                                        if (isOccupied) return null;
                                        return (<div key={`dot-${row}-${col}`} style={{ gridRow: row, gridColumn: col }} className="flex items-center justify-center pointer-events-none"><div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"></div></div>)
                                    })}
                                </div>
                            ) : (<div className="flex items-center justify-center h-full text-gray-400">Selecciona una zona para ver las mesas</div>)}
                            <div className="absolute bottom-4 right-4"><div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 cursor-pointer hover:bg-gray-800">Estás en tu periodo de prueba<IconChevronUp className="h-4 w-4 text-gray-400"/></div></div>
                        </div>
                    </div>
                );
            case 'comandas-digitales':
                 return <div className="text-center p-10 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">Comandas digitales (próximamente)</div>;
            default:
                return null;
        }
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}>{tab.title}</button>))}
                </nav>
            </div>
             <div className="mt-6 flex-1">{renderContent()}</div>
            <NewOrderModal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} />
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateOrderStatus} onUpdatePayment={updatePaymentStatus}/>
        </div>
    );
};

// --- Analytics, Messages, Availability, Settings ---

const Analytics: React.FC = () => {
    const [orders] = usePersistentState<Order[]>('orders', []); // Mock persistence for demo
    const [query, setQuery] = useState('');
    const [insights, setInsights] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGetInsights = async () => {
        if (!query) return;
        setIsLoading(true);
        const result = await getAdvancedInsights(query, orders);
        setInsights(result);
        setIsLoading(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Analítica con IA</h2>
            <div className="flex space-x-2">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej: ¿Cuáles son los productos más populares los fines de semana?" className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-transparent dark:text-white" />
                <button onClick={handleGetInsights} disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 disabled:bg-indigo-300"><IconSparkles /><span>{isLoading ? 'Analizando...' : 'Obtener Insights'}</span></button>
            </div>
            {isLoading && <div className="mt-6 text-center">Cargando...</div>}
            {insights && (<div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700 prose dark:prose-invert max-w-none"><pre className="whitespace-pre-wrap font-sans bg-transparent p-0">{insights}</pre></div>)}
        </div>
    );
};

const Messages: React.FC = () => {
    const [conversations, setConversations] = usePersistentState<Conversation[]>('conversations', MOCK_CONVERSATIONS);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0] || null);
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConversation) return;
        const message: AdminChatMessage = { id: `msg-${Date.now()}`, sender: 'admin', text: newMessage.trim(), timestamp: new Date() };
        const updatedConversation: Conversation = { ...selectedConversation, messages: [...selectedConversation.messages, message], lastMessage: message.text, lastMessageTimestamp: message.timestamp };
        setConversations(prev => prev.map(c => c.id === updatedConversation.id ? updatedConversation : c));
        setSelectedConversation(updatedConversation);
        setNewMessage('');
    };

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="w-1/3 border-r dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700"><h2 className="text-xl font-bold">Conversaciones</h2></div>
                <div className="overflow-y-auto h-full">{conversations.map(conv => (<div key={conv.id} onClick={() => setSelectedConversation(conv)} className={`p-4 cursor-pointer border-l-4 ${selectedConversation?.id === conv.id ? 'border-indigo-500 bg-gray-50 dark:bg-gray-700/50' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}><div className="flex justify-between"><p className="font-semibold">{conv.customerName}</p>{conv.unreadCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{conv.unreadCount}</span>}</div><p className="text-sm text-gray-600 dark:text-gray-400 truncate">{conv.lastMessage}</p></div>))}</div>
            </div>
            <div className="w-2/3 flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h3 className="text-lg font-semibold">{selectedConversation.customerName}</h3><button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><IconMoreVertical /></button></div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">{selectedConversation.messages.map(msg => (<div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-md p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}><p>{msg.text}</p><p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p></div></div>))}</div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center space-x-2"><input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Escribe tu mensaje..." className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent"/><button onClick={handleSendMessage} className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700"><IconSend /></button></div>
                        </div>
                    </>
                ) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Selecciona una conversación para chatear.</div>)}
            </div>
        </div>
    );
};

const AvailabilityView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('products');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'unavailable'>('all');

    const fetchData = async () => {
        try {
            setIsLoading(true); setError(null);
            const [fetchedProducts, fetchedCategories, fetchedPersonalizations] = await Promise.all([getProducts(), getCategories(), getPersonalizations()]);
            setProducts(fetchedProducts); setCategories(fetchedCategories); setPersonalizations(fetchedPersonalizations);
        } catch (err) { setError("Error al cargar datos."); console.error(err); } finally { setIsLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, available: !currentStatus } : p));
        try { await updateProductAvailability(productId, !currentStatus); } catch (error) { alert("No se pudo actualizar."); setProducts(prev => prev.map(p => p.id === productId ? { ...p, available: currentStatus } : p)); }
    };

    const handleTogglePersonalizationOption = async (optionId: string, currentStatus: boolean) => {
        setPersonalizations(prev => prev.map(p => ({ ...p, options: p.options.map(opt => opt.id === optionId ? { ...opt, available: !currentStatus } : opt) })));
        try { await updatePersonalizationOptionAvailability(optionId, !currentStatus); } catch (error) { alert("No se pudo actualizar."); setPersonalizations(prev => prev.map(p => ({ ...p, options: p.options.map(opt => opt.id === optionId ? { ...opt, available: currentStatus } : opt) }))); }
    };

    const filteredProducts = useMemo(() => products.filter(p => filter === 'all' || !p.available).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [products, filter, searchTerm]);
    const groupedProducts = useMemo(() => categories.map(category => ({ ...category, products: filteredProducts.filter(p => p.categoryId === category.id) })).filter(category => category.products.length > 0), [filteredProducts, categories]);
    const filteredPersonalizations = useMemo(() => {
        const allOptions: (PersonalizationOption & { parentName: string })[] = [];
        personalizations.forEach(p => p.options.forEach(opt => allOptions.push({ ...opt, parentName: p.name })));
        return allOptions.filter(opt => filter === 'all' || !opt.available).filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [personalizations, filter, searchTerm]);
    const groupedPersonalizations = useMemo(() => {
        const groups: { [key: string]: (PersonalizationOption & { parentName: string })[] } = {};
        filteredPersonalizations.forEach(opt => { if (!groups[opt.parentName]) groups[opt.parentName] = []; groups[opt.parentName].push(opt); });
        return Object.entries(groups).map(([name, options]) => ({ name, options }));
    }, [filteredPersonalizations]);

    const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; id: string; label: string }> = ({ checked, onChange, id, label }) => (
        <label htmlFor={id} className="flex items-center cursor-pointer"><div className="relative"><input id={id} type="checkbox" className="sr-only" checked={checked} onChange={onChange} /><div className={`block w-14 h-8 rounded-full ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div></div><span className="ml-3 text-gray-700 dark:text-gray-300 font-medium hidden sm:inline">{label}</span></label>
    );

    if (isLoading) return <div className="text-center p-10">Cargando disponibilidad...</div>;
    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-8">
                {[{ id: 'products', title: 'Productos' }, { id: 'personalizations', title: 'Personalizaciones' }].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{tab.title}</button>))}
            </nav></div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4"><div className="flex items-center gap-2"><button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'all' ? 'bg-green-100 text-green-800' : 'bg-white border'}`}>Todos</button><button onClick={() => setFilter('unavailable')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'unavailable' ? 'bg-green-100 text-green-800' : 'bg-white border'}`}>Agotados</button></div><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full sm:w-64 pl-3 pr-3 py-2 border rounded-md sm:text-sm"/></div>
            {activeTab === 'products' && (<div className="space-y-6">{groupedProducts.map(category => (<div key={category.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700"><h3 className="text-lg font-semibold mb-4">{category.name}</h3><div className="divide-y dark:divide-gray-700">{category.products.map(product => (<div key={product.id} className="flex items-center justify-between py-4"><span className="font-medium">{product.name}</span><ToggleSwitch checked={product.available} onChange={() => handleToggleProduct(product.id, product.available)} id={`p-${product.id}`} label={product.available ? 'Disponible' : 'Agotado'}/></div>))}</div></div>))}</div>)}
            {activeTab === 'personalizations' && (<div className="space-y-6">{groupedPersonalizations.map(group => (<div key={group.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700"><h3 className="text-lg font-semibold mb-4">{group.name}</h3><div className="divide-y dark:divide-gray-700">{group.options.map(opt => (<div key={opt.id} className="flex items-center justify-between py-4"><span className="font-medium">{opt.name}</span><ToggleSwitch checked={opt.available} onChange={() => handleTogglePersonalizationOption(opt.id, opt.available)} id={`o-${opt.id}`} label={opt.available ? 'Disponible' : 'Agotado'}/></div>))}</div></div>))}</div>)}
        </div>
    );
};

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; onSave?: () => void; onCancel?: () => void; noActions?: boolean }> = ({ title, description, children, onSave, onCancel, noActions }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700"><div className="p-6"><h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>{description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}<div className="mt-6 space-y-4">{children}</div></div>{!noActions && (<div className="mt-6 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-x-3 rounded-b-lg"><button onClick={onCancel} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button><button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Guardar</button></div>)}</div>
);

const SearchableDropdown: React.FC<{ options: Currency[], selected: Currency, onSelect: (option: Currency) => void }> = ({ options, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false); const [searchTerm, setSearchTerm] = useState(''); const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
    return (<div className="relative" ref={dropdownRef}><button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"><span className="block truncate">{selected.name}</span><span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"><IconChevronDown className="h-5 w-5 text-gray-400" /></span></button>{isOpen && (<div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"><div className="p-2"><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-md" /></div>{options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).map(option => (<button key={option.code} type="button" onClick={() => { onSelect(option); setIsOpen(false); setSearchTerm(''); }} className="w-full text-left py-2 pl-10 pr-4 hover:bg-gray-100">{option.name}</button>))}</div>)}</div>);
};

const GeneralSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [original, setOriginal] = useState(settings.company); useEffect(() => setOriginal(settings.company), [settings.company]);
    return (<div className="space-y-6"><SettingsCard title="Datos de empresa" onSave={onSave} onCancel={() => setSettings(p => ({...p, company: original}))}><label>Nombre de empresa</label><input type="text" value={settings.company.name} onChange={e => setSettings(p => ({...p, company: {...p.company, name: e.target.value}}))} className="w-full border rounded p-2"/><label className="mt-4 block">Divisa</label><SearchableDropdown options={CURRENCIES} selected={settings.company.currency} onSelect={c => setSettings(p => ({...p, company: {...p.company, currency: c}}))} /></SettingsCard></div>);
};

const BranchSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [original, setOriginal] = useState(settings.branch); useEffect(() => setOriginal(settings.branch), [settings.branch]);
    const handleImage = (e: any, field: any) => { if (e.target.files[0]) { const r = new FileReader(); r.onloadend = () => { const ns = {...settings, branch: {...settings.branch, [field]: r.result}}; setSettings(ns); saveAppSettings(ns); }; r.readAsDataURL(e.target.files[0]); }};
    return (<div className="space-y-6"><SettingsCard title="Datos de sucursal" onSave={onSave} onCancel={() => setSettings(p => ({...p, branch: original}))}><label>Alias</label><input type="text" value={settings.branch.alias} onChange={e => setSettings(p => ({...p, branch: {...p.branch, alias: e.target.value}}))} className="w-full border rounded p-2"/><label className="mt-4 block">Dirección</label><input type="text" value={settings.branch.fullAddress} onChange={e => setSettings(p => ({...p, branch: {...p.branch, fullAddress: e.target.value}}))} className="w-full border rounded p-2"/></SettingsCard><div className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700"><h4>Logo</h4><input type="file" onChange={e => handleImage(e, 'logoUrl')} /></div></div>);
};

const ShippingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [original, setOriginal] = useState(settings.shipping); useEffect(() => setOriginal(settings.shipping), [settings.shipping]);
    return (<div className="space-y-6"><SettingsCard title="Envíos" onSave={onSave} onCancel={() => setSettings(p => ({...p, shipping: original}))}><select value={settings.shipping.costType} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, costType: e.target.value as any}}))} className="w-full border rounded p-2"><option value={ShippingCostType.ToBeQuoted}>Por cotizar</option><option value={ShippingCostType.Free}>Gratis</option><option value={ShippingCostType.Fixed}>Fijo</option></select></SettingsCard></div>);
};

const PaymentSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [original, setOriginal] = useState(settings.payment); useEffect(() => setOriginal(settings.payment), [settings.payment]);
    return (<div className="space-y-6"><SettingsCard title="Métodos de Pago" onSave={onSave} onCancel={() => setSettings(p => ({...p, payment: original}))}><label><input type="checkbox" checked={settings.payment.showTipField} onChange={e => setSettings(p => ({...p, payment: {...p.payment, showTipField: e.target.checked}}))} /> Mostrar propina</label></SettingsCard></div>);
};

const HoursSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    return (<div className="space-y-6"><SettingsCard title="Horarios" onSave={onSave} onCancel={() => {}} noActions><p>Gestión de horarios próximamente.</p></SettingsCard></div>);
};

const ZonesAndTablesSettings: React.FC<{ zones: Zone[]; onAddZone: () => void; onEditZoneName: (zone: Zone) => void; onDeleteZone: (zoneId: string) => void; onEditZoneLayout: (zone: Zone) => void; }> = ({ zones, onAddZone, onEditZoneName, onDeleteZone, onEditZoneLayout }) => {
    return (<div className="space-y-6"><div className="flex justify-end"><button onClick={onAddZone} className="bg-green-600 text-white px-4 py-2 rounded">Nueva Zona</button></div>{zones.map(z => (<div key={z.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded shadow"><input defaultValue={z.name} onBlur={e => onEditZoneName({...z, name: e.target.value})} className="font-bold bg-transparent"/><div className="flex gap-2"><button onClick={() => onEditZoneLayout(z)}><IconEdit/></button><button onClick={() => onDeleteZone(z.id)} className="text-red-500"><IconTrash/></button></div></div>))}</div>);
};

const PrintingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [original, setOriginal] = useState(settings.printing); useEffect(() => setOriginal(settings.printing), [settings.printing]);
    return (<div className="space-y-6"><SettingsCard title="Impresión" onSave={onSave} onCancel={() => setSettings(p => ({...p, printing: original}))}><select value={settings.printing.method} onChange={e => setSettings(p => ({...p, printing: {method: e.target.value as any}}))} className="w-full border rounded p-2"><option value={PrintingMethod.Native}>Nativa</option><option value={PrintingMethod.Bluetooth}>Bluetooth</option><option value={PrintingMethod.USB}>USB</option></select></SettingsCard></div>);
};

const ZoneEditor: React.FC<{ initialZone: Zone; onSave: (zone: Zone) => void; onExit: () => void; }> = ({ initialZone, onSave, onExit }) => {
    const [zone, setZone] = useState(initialZone); const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const addTable = () => { const nt: Table = { id: crypto.randomUUID(), zoneId: zone.id, name: `${zone.tables.length + 1}`, row: 1, col: 1, width: 1, height: 1, shape: 'square', status: 'available' }; setZone(prev => ({ ...prev, tables: [...prev.tables, nt] })); };
    return (<div className="fixed inset-0 bg-gray-100 z-50 flex flex-col"><div className="p-4 bg-white flex justify-between"><button onClick={onExit}>Salir</button><h2 className="font-bold">{zone.name}</h2><button onClick={() => onSave(zone)} className="bg-green-600 text-white px-4 py-2 rounded">Guardar</button></div><div className="flex-1 p-8"><button onClick={addTable} className="mb-4 bg-blue-500 text-white px-4 py-2 rounded">Agregar Mesa</button><div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${zone.cols}, 100px)` }}>{zone.tables.map(t => (<div key={t.id} className="w-24 h-24 bg-white border flex items-center justify-center">{t.name}</div>))}</div></div></div>);
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onEditZoneLayout: (zone: Zone) => void; initialPage?: SettingsPage; }> = ({ isOpen, onClose, onEditZoneLayout, initialPage = 'general' }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null); const [activePage, setActivePage] = useState<SettingsPage>(initialPage); const [zones, setZones] = useState<Zone[]>([]);
    useEffect(() => { if (isOpen) { getAppSettings().then(setSettings); getZones().then(setZones); } }, [isOpen]);
    const handleSave = async () => { if (settings) await saveAppSettings(settings); onClose(); };
    const renderPage = () => { switch(activePage) { case 'general': return <GeneralSettings onSave={handleSave} settings={settings!} setSettings={setSettings as any} />; case 'zones-tables': return <ZonesAndTablesSettings zones={zones} onAddZone={async () => { await saveZone({name: 'Nueva Zona', rows: 5, cols: 5}); setZones(await getZones()); }} onEditZoneName={async (z) => { await saveZone(z); }} onDeleteZone={async (id) => { await deleteZone(id); setZones(await getZones()); }} onEditZoneLayout={onEditZoneLayout} />; default: return <div>Configuración</div>; } };
    if (!isOpen || !settings) return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end"><div className="w-full max-w-5xl bg-white dark:bg-gray-900 h-full flex"><div className="w-64 border-r p-4"><button onClick={() => setActivePage('general')} className="block w-full text-left p-2">General</button><button onClick={() => setActivePage('zones-tables')} className="block w-full text-left p-2">Zonas y Mesas</button></div><div className="flex-1 p-8 overflow-y-auto"><button onClick={onClose} className="mb-4">Cerrar</button>{renderPage()}</div></div></div>);
};

const QRModal: React.FC<{ isOpen: boolean; onClose: () => void; url: string; title: string; filename: string; }> = ({ isOpen, onClose, url, title, filename }) => {
    if (!isOpen) return null;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    return (<div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="bg-white p-8 rounded text-center"><h2 className="text-xl font-bold mb-4">{title}</h2><img src={qrUrl} alt="QR" /><button onClick={onClose} className="mt-4 bg-gray-200 px-4 py-2 rounded">Cerrar</button></div></div>);
};

const ShareView: React.FC<{ onGoToTableSettings: () => void }> = ({ onGoToTableSettings }) => {
    const baseUrl = window.location.origin + window.location.pathname; const menuLink = `${baseUrl}#/menu`;
    const copy = () => navigator.clipboard.writeText(menuLink).then(() => alert('Copiado'));
    return (<div className="p-6 bg-white dark:bg-gray-800 rounded shadow"><h2>Compartir Menú</h2><div className="flex gap-2 mt-4"><input readOnly value={menuLink} className="border p-2 flex-1"/><button onClick={copy} className="bg-gray-200 px-4 py-2 rounded">Copiar</button></div></div>);
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();
    const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
    const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);
    const [lastNewOrder, setLastNewOrder] = useState<Order | null>(null);
    const [hasUnreadOrders, setHasUnreadOrders] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToNewOrders((newOrderPayload: Order) => {
            playChicAlert();
            setLastNewOrder(newOrderPayload);
            setTimeout(() => setLastNewOrder(null), 5000); 
            if (currentPage !== 'orders') setHasUnreadOrders(true);
        });
        const unlockAudio = () => { const AudioContext = window.AudioContext || (window as any).webkitAudioContext; if(AudioContext) { const ctx = new AudioContext(); ctx.resume(); } window.removeEventListener('click', unlockAudio); window.removeEventListener('touchstart', unlockAudio); };
        window.addEventListener('click', unlockAudio); window.addEventListener('touchstart', unlockAudio);
        return () => { unsubscribe(); };
    }, [currentPage]);

    useEffect(() => { let interval: any; if (hasUnreadOrders) { let visible = true; interval = setInterval(() => { document.title = visible ? "(1) ¡Nuevo Pedido!" : "ALTOQUE FOOD"; visible = !visible; }, 1000); } else { document.title = "ALTOQUE FOOD"; } return () => clearInterval(interval); }, [hasUnreadOrders]);
    useEffect(() => { if (currentPage === 'orders') setHasUnreadOrders(false); }, [currentPage]);

    const openTableSettings = () => { setIsSettingsOpen(true); };
    const handleEditZoneLayout = (zone: Zone) => { setZoneToEdit(zone); setIsSettingsOpen(false); setIsZoneEditorOpen(true); };
    const handleSaveZoneLayout = async (updatedZone: Zone) => { try { await saveZoneLayout(updatedZone); setIsZoneEditorOpen(false); setZoneToEdit(null); setIsSettingsOpen(true); } catch (error) { alert("Error al guardar la distribución: " + error); } };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'products': return <MenuManagement />;
            case 'orders': return <OrderManagement onSettingsClick={openTableSettings} />;
            case 'analytics': return <Analytics />;
            case 'messages': return <Messages />;
            case 'availability': return <AvailabilityView />;
            case 'share': return <ShareView onGoToTableSettings={openTableSettings}/>;
            case 'tutorials': return <div className="p-10 text-center text-gray-500">Tutoriales próximamente...</div>;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} hasUnreadOrders={hasUnreadOrders} />
            <div className="flex-1 flex flex-col min-w-0 relative">
                <Header title={PAGE_TITLES[currentPage]} onSettingsClick={() => setIsSettingsOpen(true)} onPreviewClick={() => setIsPreviewOpen(true)} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">{renderPage()}</div>
                </main>
                <NewOrderToast order={lastNewOrder} onClose={() => setLastNewOrder(null)} />
            </div>
            {isZoneEditorOpen && zoneToEdit && (<ZoneEditor initialZone={zoneToEdit} onSave={handleSaveZoneLayout} onExit={() => { setIsZoneEditorOpen(false); setZoneToEdit(null); setIsSettingsOpen(true); }} />)}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onEditZoneLayout={handleEditZoneLayout} />
        </div>
    );
};

export default AdminView;
