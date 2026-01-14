
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
                            <button onClick={() => { onDuplicate(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><IconDuplicate className="h-4 w-4" /> Duplicar</button>
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
                setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    imageUrl: '',
                    categoryId: categories[0]?.id || '',
                    available: true,
                });
            }
        }
    }, [product, isOpen, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | boolean = value;
        if (type === 'number') {
            processedValue = parseFloat(value) || 0;
        }
        if (name === 'available') {
            processedValue = (e.target as HTMLInputElement).checked;
        }
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name) {
            alert("Por favor, introduce primero el nombre del producto.");
            return;
        }
        setIsGenerating(true);
        try {
            const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'General';
            const description = await generateProductDescription(
                formData.name!,
                categoryName,
                formData.description || ''
            );
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
        if (!formData.imageUrl) {
            alert("Por favor, sube una imagen para el producto.");
            return;
        }
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
                                <button
                                    type="button"
                                    onClick={handleGenerateDescription}
                                    disabled={isGenerating || !formData.name}
                                    className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <IconSparkles className="h-4 w-4" />
                                    {isGenerating ? 'Generando...' : 'Generar con IA'}
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
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500 px-1">
                                            <span>{formData.imageUrl ? 'Cambiar imagen' : 'Subir un archivo'}</span>
                                            <input id="file-upload" name="imageUrl" type="file" className="sr-only" onChange={handleImageChange} accept="image/png, image/jpeg, image/gif"/>
                                        </label>
                                        <p className="pl-1">o arrastra y suelta</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        PNG, JPG, GIF
                                    </p>
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
        if (isOpen) {
            setName(category ? category.name : '');
        }
    }, [category, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            id: category?.id,
            name: name.trim(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {category ? 'Editar Categoría' : 'Agrega una categoría'}
                        </h2>
                    </div>
                    <div>
                        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre de categoría
                        </label>
                        <input
                            id="categoryName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="schedules" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Horarios que incluyen esta categoría
                        </label>
                        <select
                            id="schedules"
                            disabled
                            className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:text-white disabled:opacity-70"
                        >
                            <option>Menú general</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Puedes usar una misma categoría en múltiples sucursales
                        </p>
                    </div>
                    <div className="flex justify-end space-x-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold"
                        >
                            {category ? 'Guardar Cambios' : 'Agregar categoría'}
                        </button>
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
            alert("No se pudo borrar the product.");
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
                setName(personalization.name);
                setLabel(personalization.label);
                setAllowRepetition(personalization.allowRepetition);
                setOptions(personalization.options.map(({id, available, ...rest}) => rest));
                setMinSelection(personalization.minSelection || 0);
                setMaxSelection(personalization.maxSelection === undefined ? null : personalization.maxSelection);
            } else {
                setName('');
                setLabel('');
                setOptions([{ name: '', price: 0 }]);
                setAllowRepetition(false);
                setMinSelection(0);
                setMaxSelection(null);
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
            <div className="bg-white dark:bg-gray-800 h-full w-full max-w-3xl flex flex-col relative">
                <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 shrink-0">
                    <h2 className="text-xl font-semibold">{personalization ? 'Editar' : 'Agregar'} una personalización</h2>
                    <div className="flex items-center gap-x-4">
                        <button className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-600">Vista previa</button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1"><IconX /></button>
                    </div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col w-2/3">
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de personalización</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instrucciones para el cliente.</p>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={lightInputClasses}/>
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Etiqueta distintiva
                                    <IconInfo className="inline h-4 w-4 ml-1 text-gray-400" title="No es visible para tus clientes."/>
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">No es visible para tus clientes.</p>
                                <input type="text" value={label} onChange={e => setLabel(e.target.value)} className={lightInputClasses}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opciones</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ingredientes, extras, aderezos, etc.</p>
                                <div className="space-y-3">
                                    {options.map((opt, index) => (
                                        <div key={index} className="flex items-center gap-x-2">
                                            <IconGripVertical className="h-5 w-5 text-gray-400 cursor-grab flex-shrink-0" />
                                            <input type="text" placeholder="Nombre" value={opt.name} onChange={e => handleOptionChange(index, 'name', e.target.value)} required className={`${lightInputClasses} flex-1`}/>
                                            <div className="relative flex-shrink-0">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 text-sm">$</span>
                                                <input type="number" step="0.01" placeholder="0" value={opt.price} onChange={e => handleOptionChange(index, 'price', e.target.value)} required className={`${lightInputClasses} w-28 pl-7`}/>
                                            </div>
                                            <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 1} className="text-gray-500 hover:text-red-600 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"><IconTrash className="h-4 w-4"/> Borrar</button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addOption} className="mt-4 text-emerald-600 font-semibold text-sm flex items-center gap-x-2 hover:text-emerald-800">
                                    <IconPlus className="h-4 w-4" /> Agregar otro opción
                                </button>
                            </div>
                            <div className="border-t dark:border-gray-700 pt-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permitir repetición de opciones</label>
                                    <div className="flex">
                                        <button type="button" onClick={() => setAllowRepetition(false)} className={`px-6 py-2 text-sm border focus:outline-none focus:z-10 focus:ring-2 focus:ring-emerald-500 rounded-l-md ${!allowRepetition ? 'bg-white dark:bg-gray-600 border-emerald-500 text-emerald-600 dark:text-white z-10' : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>No</button>
                                        <button type="button" onClick={() => setAllowRepetition(true)} className={`-ml-px px-6 py-2 text-sm border focus:outline-none focus:z-10 focus:ring-2 focus:ring-emerald-500 rounded-r-md ${allowRepetition ? 'bg-white dark:bg-gray-600 border-emerald-500 text-emerald-600 dark:text-white z-10' : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>Sí</button>
                                    </div>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cantidad que se podrá seleccionar</label>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 text-sm">Mínimo</span>
                                            <input 
                                                type="number" 
                                                value={minSelection} 
                                                onChange={e => setMinSelection(Math.max(0, Number(e.target.value)))} 
                                                className={`${lightInputClasses} text-right pr-4 pl-16`}
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 text-sm">Máximo</span>
                                            <input 
                                                type="number"
                                                value={maxSelection ?? ''}
                                                onChange={e => setMaxSelection(e.target.value === '' ? null : Math.max(minSelection, Number(e.target.value)))}
                                                placeholder="Sin límite"
                                                className={`${lightInputClasses} text-right pr-4 pl-16`}
                                            />
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                        <footer className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end items-center space-x-3 sticky bottom-0 shrink-0">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">Agregar personalización</button>
                        </footer>
                    </form>
                    <div className="w-1/3 bg-gray-100 dark:bg-gray-900/50 p-6 border-l dark:border-gray-700">
                         <h3 className="font-semibold text-gray-800 dark:text-gray-200">Vista previa</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">La vista previa aparecerá aquí a medida que completes el formulario.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PersonalizationsView: React.FC = () => {
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPersonalization, setEditingPersonalization] = useState<Personalization | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getPersonalizations();
            setPersonalizations(data);
        } catch (err) {
            setError("No se pudieron cargar las personalizaciones.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (p: Personalization | null) => {
        setEditingPersonalization(p);
        setIsModalOpen(true);
    };

    const handleSave = async (personalizationData: Omit<Personalization, 'id' | 'created_at'> & { id?: string }) => {
        try {
            await savePersonalization(personalizationData);
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            alert("No se pudo guardar la personalización.");
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta personalización?')) {
            try {
                await deletePersonalization(id);
                await fetchData();
            } catch (error) {
                alert("No se pudo eliminar la personalización.");
                console.error(error);
            }
        }
    };

    if (isLoading) return <div className="text-center p-10">Cargando personalizaciones...</div>;
    if (error) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div>
            <div className="flex justify-end items-center mb-6">
                <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                    + Agregar personalización
                </button>
            </div>
            {personalizations.length === 0 ? (
                 <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Crea personalizaciones para tus productos</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Permite que tus clientes agreguen extras, elijan ingredientes y más.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                    <ul className="divide-y dark:divide-gray-700">
                        {personalizations.map(p => (
                            <li key={p.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{p.options.length} opciones</p>
                                </div>
                                <div className="flex items-center gap-x-2">
                                    <button onClick={() => handleOpenModal(p)} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><IconPencil className="h-5 w-5"/></button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><IconTrash className="h-5 w-5"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
             <PersonalizationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                personalization={editingPersonalization}
            />
        </div>
    );
};

const PromotionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (promo: Omit<Promotion, 'id' | 'created_at'> & { id?: string }) => void;
    promotion: Promotion | null;
    products: Product[];
}> = ({ isOpen, onClose, onSave, promotion, products }) => {
    
    const getInitialFormData = (): Omit<Promotion, 'id' | 'created_at'> & { id?: string } => ({
        id: '',
        name: '',
        discountType: DiscountType.Percentage,
        discountValue: 0,
        appliesTo: PromotionAppliesTo.SpecificProducts,
        productIds: [''],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
    });
    
    const [formData, setFormData] = useState(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            if (promotion) {
                const productIds = (promotion.productIds?.length || 0) > 0 ? promotion.productIds : [''];
                setFormData({...promotion, productIds});
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [promotion, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'discountValue' ? parseFloat(value) || 0 : value }));
    };
    
    const handleProductChange = (index: number, productId: string) => {
        const newProductIds = [...formData.productIds];
        newProductIds[index] = productId;
        setFormData(prev => ({ ...prev, productIds: newProductIds }));
    };

    const addProductField = () => {
        setFormData(prev => ({ ...prev, productIds: [...prev.productIds, ''] }));
    };

    const removeProductField = (index: number) => {
        if (formData.productIds.length > 1) {
            const newProductIds = formData.productIds.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, productIds: newProductIds }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPromo = {
            ...formData,
            id: promotion?.id,
            productIds: formData.productIds.filter(id => id !== ''),
        };
        onSave(finalPromo);
    };

    if (!isOpen) return null;
    
    const lightInputClasses = "w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-end">
            <div className="bg-white dark:bg-gray-800 h-full w-full max-w-3xl flex flex-col relative">
                <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 shrink-0">
                    <h2 className="text-xl font-semibold">{promotion ? 'Editar' : 'Agregar'} una promoción</h2>
                    <div className="flex items-center gap-x-4">
                        <button className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-600 flex items-center gap-1">
                            <IconEye className="w-4 h-4" /> Vista previa
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1"><IconX /></button>
                    </div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:w-2/3">
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={`${lightInputClasses} mt-1`}/>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor del descuento</label>
                                <div className="flex items-center mt-1">
                                    <select name="discountType" value={formData.discountType} onChange={handleChange} className={`${lightInputClasses} w-1/3 rounded-r-none border-r-0`}>
                                        <option value={DiscountType.Percentage}>Porcentaje (%)</option>
                                        <option value={DiscountType.Fixed}>Monto fijo ($)</option>
                                    </select>
                                    <div className="relative flex-1">
                                        <input type="number" name="discountValue" value={formData.discountValue} onChange={handleChange} required className={`${lightInputClasses} rounded-l-none`}/>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Se aplica a</label>
                                <select name="appliesTo" value={formData.appliesTo} onChange={handleChange} className={`${lightInputClasses} mt-1`}>
                                    <option value={PromotionAppliesTo.SpecificProducts}>Productos específicos</option>
                                </select>
                            </div>

                            {formData.appliesTo === PromotionAppliesTo.SpecificProducts && (
                                <div className="p-4 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50">
                                    {formData.productIds.map((pid, index) => (
                                        <div key={index} className="flex items-center gap-x-2 mb-2">
                                            <select value={pid} onChange={(e) => handleProductChange(index, e.target.value)} className={`${lightInputClasses} flex-1`}>
                                                <option value="">Selecciona un producto</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <button type="button" onClick={() => removeProductField(index)} disabled={formData.productIds.length <= 1} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50"><IconTrash/></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addProductField} className="mt-2 text-emerald-600 font-semibold text-sm flex items-center gap-x-2 hover:text-emerald-800">
                                        <IconPlus className="h-4 w-4" /> Agregar otro producto
                                    </button>
                                </div>
                            )}

                            <div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de inicio</label>
                                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`${lightInputClasses} mt-1`}/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de fin</label>
                                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`${lightInputClasses} mt-1`}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <footer className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end items-center space-x-3 sticky bottom-0 shrink-0">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">Agregar promoción</button>
                        </footer>
                    </form>
                    <div className="w-1/3 bg-gray-100 dark:bg-gray-900/50 p-6 border-l dark:border-gray-700 hidden lg:block">
                         <h3 className="font-semibold text-gray-800 dark:text-gray-200">Vista previa</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Aparecerá una etiqueta de "Oferta" en los productos seleccionados dentro del rango de fechas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PromotionsView: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [promoData, productData] = await Promise.all([getPromotions(), getProducts()]);
            setPromotions(promoData);
            setProducts(productData);
        } catch (err) {
            setError("No se pudieron cargar las promociones.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (promo: Promotion | null) => {
        setEditingPromotion(promo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPromotion(null);
    };

    const handleSavePromotion = async (promoData: Omit<Promotion, 'id' | 'created_at'> & { id?: string }) => {
        try {
            await savePromotion(promoData);
            await fetchData();
            handleCloseModal();
        } catch (error) {
            alert("No se pudo guardar la promoción.");
            console.error(error);
        }
    };

    const handleDeletePromotion = (promoId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
            deletePromotion(promoId).then(() => fetchData()).catch(err => {
                alert("No se pudo eliminar la promoción.");
                console.error(err);
            });
        }
    };

    const filteredPromotions = useMemo(() => {
        return promotions.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [promotions, searchTerm]);
    
    if (isLoading) return <div className="text-center p-10">Cargando promociones...</div>;
    if (error) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full sm:w-80">
                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input 
                        type="text" 
                        placeholder="Buscar promoción por nombre..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 sm:text-sm"
                    />
                </div>
                <button onClick={() => handleOpenModal(null)} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                    <IconPlus className="h-5 w-5" />
                    <span>Nueva promoción</span>
                </button>
            </div>

            {promotions.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto h-16 w-16 text-gray-300">
                        <IconPercent className="h-16 w-16"/>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Crea promociones y atrae más clientes</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Llama la atención de tus clientes y aumenta tus ventas.</p>
                </div>
            ) : (
                <div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Promociones Registradas</h3>
                        <div className="space-y-4">
                            {filteredPromotions.length > 0 ? filteredPromotions.map(promo => {
                                const now = new Date();
                                const startDate = promo.startDate ? new Date(promo.startDate + 'T00:00:00') : null;
                                const endDate = promo.endDate ? new Date(promo.endDate + 'T23:59:59') : null;

                                let statusColor = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
                                let statusText = 'Inactiva';
                                let nameColor = 'text-gray-400 dark:text-gray-600';

                                if (startDate && now < startDate) {
                                    statusColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                                    statusText = 'Programada';
                                    nameColor = 'text-blue-600 dark:text-blue-400';
                                } else if (endDate && now > endDate) {
                                    statusColor = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
                                    statusText = 'Finalizada';
                                    nameColor = 'text-gray-400 dark:text-gray-600';
                                } else {
                                    statusColor = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
                                    statusText = 'Activa';
                                    nameColor = 'text-emerald-500 dark:text-emerald-400 font-black'; // Vibrant highlight for active ones
                                }

                                return (
                                    <div key={promo.id} className="p-4 border dark:border-gray-700 rounded-md flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-lg transition-colors ${nameColor}`}>{promo.name}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-bold text-emerald-600">{promo.discountValue}{promo.discountType === DiscountType.Percentage ? '%' : '$'} OFF</span> en {promo.appliesTo === PromotionAppliesTo.SpecificProducts ? `${promo.productIds.length} producto(s)` : 'todos los productos'}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <IconCalendar className="h-3 w-3" />
                                                    <span>{promo.startDate || 'Siempre'} - {promo.endDate || 'Indefinido'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <button onClick={() => handleOpenModal(promo)} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><IconPencil/></button>
                                            <button onClick={() => handleDeletePromotion(promo.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><IconTrash/></button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-10 text-gray-500">
                                    No se encontraron promociones para "{searchTerm}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <PromotionModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSavePromotion}
                promotion={editingPromotion}
                products={products}
            />
        </div>
    );
};

const EmptyOrdersView: React.FC<{ onNewOrderClick: () => void }> = ({ onNewOrderClick }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
        <IconOrders className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No hay pedidos activos</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Los pedidos que realicen tus clientes aparecerán aquí.</p>
        <button onClick={onNewOrderClick} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">Crear pedido manual</button>
    </div>
);

const OrdersKanbanBoard: React.FC<{ orders: Order[], onOrderClick: (o: Order) => void }> = ({ orders, onOrderClick }) => {
    const statuses = [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Preparing, OrderStatus.Ready];
    return (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
            {statuses.map(status => (
                <div key={status} className="w-80 shrink-0 flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border dark:border-gray-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">{status}</h3>
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {orders.filter(o => o.status === status).map(order => (
                            <div key={order.id} onClick={() => onOrderClick(order)} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-emerald-500 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-gray-400">#{order.id.slice(0, 6)}</span>
                                    <span className="text-xs font-bold text-emerald-600">${order.total.toFixed(2)}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{order.customer.name}</p>
                                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                                    <span>{order.items.length} items</span>
                                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const OrderListView: React.FC<{ orders: Order[], onOrderClick: (o: Order) => void }> = ({ orders, onOrderClick }) => (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => onOrderClick(order)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">#{order.id.slice(0, 6)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{order.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><button className="text-emerald-600 hover:text-emerald-900">Detalles</button></td>
                </tr>
            ))}
        </tbody>
    </table>
);

const NewOrderModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Crear pedido manual</h2>
                    <button onClick={onClose}><IconX /></button>
                </div>
                <p className="text-gray-500 mb-6 text-sm">Esta funcionalidad está en desarrollo. Pronto podrás registrar ventas directamente desde el panel.</p>
                <button onClick={onClose} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold">Cerrar</button>
            </div>
        </div>
    );
};

const OrderDetailModal: React.FC<{ order: Order | null, onClose: () => void, onUpdateStatus: (id: string, s: OrderStatus) => void, onUpdatePayment: (id: string, s: PaymentStatus) => void }> = ({ order, onClose, onUpdateStatus, onUpdatePayment }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Orden #{order.id.slice(0, 6)}</h2>
                    <button onClick={onClose}><IconX /></button>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cliente</h3>
                            <p className="font-semibold">{order.customer.name}</p>
                            <p className="text-sm text-gray-500">{order.customer.phone}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Estado Actual</h3>
                            <select 
                                value={order.status} 
                                onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-2 text-sm"
                            >
                                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {order.customer.address && order.customer.address.latitude && (
                        <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl">
                            <h3 className="text-xs font-bold text-emerald-600 uppercase mb-2">Ubicación GPS Detectada</h3>
                            <a 
                                href={`https://www.google.com/maps?q=${order.customer.address.latitude},${order.customer.address.longitude}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold"
                            >
                                <IconLocationMarker className="h-5 w-5" />
                                Abrir en Google Maps
                            </a>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección de entrega</h3>
                        <p className="text-sm">{order.customer.address.calle} #{order.customer.address.numero}, {order.customer.address.colonia}</p>
                        {order.customer.address.referencias && <p className="text-xs text-gray-500 mt-1 italic">Ref: {order.customer.address.referencias}</p>}
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Detalle de productos</h3>
                        <div className="space-y-2">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-2 border-b dark:border-gray-700">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span className="font-bold">${item.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-2xl font-black text-emerald-600">${order.total.toFixed(2)}</span>
                    </div>
                </div>
                <button onClick={onClose} className="mt-8 w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold">Cerrar</button>
            </div>
        </div>
    );
};

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
            if(fetchedZones.length > 0) {
                setActiveZoneId(fetchedZones[0].id);
            }
            setIsLoading(false);
        };
        load();

        const channel = subscribeToNewOrders(
            (newOrder) => {
                try { const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.volume=0.5; audio.play().catch(e=>{}); } catch(e){}
                setOrders(prev => [newOrder, ...prev]);
            },
            (updatedOrder) => {
                 setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            }
        );

        return () => {
            unsubscribeFromChannel();
        };
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try {
            await updateOrder(orderId, { status: newStatus });
        } catch (e: any) {
            console.error(e);
            alert(`Error updating order status: ${e.message || JSON.stringify(e)}`);
        }
    };
    
    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        try {
             await updateOrder(orderId, { paymentStatus: newStatus });
        } catch (e: any) {
            console.error(e);
             alert(`Error updating payment status: ${e.message || JSON.stringify(e)}`);
        }
    }
    
    const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId]);
    
    const getTableStatus = (zoneName: string, tableName: string) => {
        const tableIdentifier = `${zoneName} - ${tableName}`;
        const activeOrder = orders.find(o => 
            o.tableId === tableIdentifier && 
            o.status !== OrderStatus.Completed && 
            o.status !== OrderStatus.Cancelled
        );
        
        return activeOrder ? { status: 'occupied', order: activeOrder } : { status: 'free', order: null };
    };
    
    const tableStats = useMemo(() => {
         const activeTables = orders.filter(o => o.tableId && o.status !== OrderStatus.Completed && o.status !== OrderStatus.Cancelled).length;
         const requestingBill = orders.filter(o => o.tableId && o.status === OrderStatus.Ready && o.paymentStatus === 'pending').length;
         
         return {
             requestingBill: requestingBill,
             requestingWaiter: 0, 
             pendingOrders: orders.filter(o => o.tableId && o.status === OrderStatus.Pending).length,
             activeTables: activeTables
         }
    }, [orders]);

    const tabs = [
        { id: 'panel-pedidos', title: 'Panel de pedidos' },
        { id: 'panel-mesas', title: 'Panel de mesas' },
        { id: 'comandas-digitales', title: 'Comandas digitales' },
    ];
    
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
                                        <div className={`w-2 h-2 rounded-full ${storeOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {storeOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}
                                        <IconChevronDown className="h-4 w-4 opacity-50 ml-2"/>
                                    </button>
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700 hidden group-hover:block z-10 p-1">
                                        <button onClick={() => setStoreOpen(o => !o)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-gray-300">
                                             <IconToggleOff className="h-4 w-4"/> {storeOpen ? 'Cerrar Tienda' : 'Abrir Tienda'}
                                        </button>
                                    </div>
                                </div>

                                <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition-all">
                                    <IconPlus className="h-4 w-4 text-gray-900" /> Pedido Manual
                                </button>
                            </div>
                         </div>
                        
                        {orders.length === 0 ? (
                             <EmptyOrdersView onNewOrderClick={() => setIsNewOrderModalOpen(true)} />
                        ) : (
                            viewMode === 'board' ? (
                                <OrdersKanbanBoard orders={orders} onOrderClick={setSelectedOrder} />
                            ) : (
                                <div className="flex-1 overflow-auto rounded-lg border dark:border-gray-700">
                                    <OrderListView orders={orders} onOrderClick={setSelectedOrder} />
                                </div>
                            )
                        )}
                    </div>
                );

            case 'panel-mesas':
                return (
                    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="flex justify-end gap-3 mb-4">
                            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Ver uso de suscripción
                            </button>
                            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                Ver historial <IconClock className="h-4 w-4 text-gray-400"/>
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                            <div className="p-4 flex items-center justify-center md:justify-start md:w-48">
                                <button className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <IconCalendar className="h-5 w-5 text-gray-500"/>
                                    Hoy
                                </button>
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
                                <div className="p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.requestingBill}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas solicitando cuenta</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.requestingWaiter}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas solicitando mesero</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.pendingOrders}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas con comandas pendientes</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{tableStats.activeTables}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">mesas activas</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {zones.map(zone => (
                                    <button
                                        key={zone.id}
                                        onClick={() => setActiveZoneId(zone.id)}
                                        className={`px-6 py-2 rounded-lg border font-medium text-sm transition-all whitespace-nowrap ${
                                            activeZoneId === zone.id
                                            ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        {zone.name}
                                    </button>
                                ))}
                                {zones.length === 0 && (
                                     <div className="text-sm text-gray-500 p-2">No hay zonas configuradas. Ve a Configuración &gt; Zonas y mesas.</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 p-8 overflow-auto relative min-h-[400px]">
                            {activeZone ? (
                                <div 
                                    className="grid gap-6"
                                    style={{
                                        gridTemplateColumns: `repeat(${activeZone.cols}, minmax(80px, 1fr))`,
                                        gridTemplateRows: `repeat(${activeZone.rows}, minmax(80px, 1fr))`
                                    }}
                                >
                                    {activeZone.tables.map(table => {
                                        const { status, order } = getTableStatus(activeZone.name, table.name);
                                        const isOccupied = status === 'occupied';
                                        
                                        return (
                                            <div
                                                key={table.id}
                                                onClick={() => isOccupied && order ? setSelectedOrder(order) : null}
                                                style={{
                                                    gridRow: `${table.row} / span ${table.height}`,
                                                    gridColumn: `${table.col} / span ${table.width}`,
                                                }}
                                                className={`
                                                    relative rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border-2
                                                    ${table.shape === 'round' ? 'rounded-full aspect-square' : 'rounded-xl'}
                                                    ${isOccupied 
                                                        ? 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-500/50 shadow-md' 
                                                        : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    }
                                                `}
                                            >
                                                <span className={`text-2xl font-bold ${isOccupied ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {table.name}
                                                </span>
                                                
                                                {isOccupied && order && (
                                                    <div className="absolute -top-2 -right-2">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-sm">
                                                            {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {isOccupied && (
                                                    <div className="mt-1 px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] font-medium text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700 truncate max-w-[90%]">
                                                        Ocupada
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {Array.from({ length: activeZone.rows * activeZone.cols }).map((_, index) => {
                                        const row = Math.floor(index / activeZone.cols) + 1;
                                        const col = (index % activeZone.cols) + 1;
                                        
                                        const isOccupied = activeZone.tables.some(t => 
                                            row >= t.row && row < t.row + t.height &&
                                            col >= t.col && col < t.col + t.width
                                        );
                                        
                                        if (isOccupied) return null;
                                        
                                        return (
                                            <div 
                                                key={`dot-${row}-${col}`}
                                                style={{ gridRow: row, gridColumn: col }}
                                                className="flex items-center justify-center pointer-events-none"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Selecciona una zona para ver las mesas
                                </div>
                            )}
                            
                            <div className="absolute bottom-4 right-4">
                                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 cursor-pointer hover:bg-gray-800">
                                    Estás en tu periodo de prueba
                                    <IconChevronUp className="h-4 w-4 text-gray-400"/>
                                </div>
                            </div>
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
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                        >
                            {tab.title}
                        </button>
                    ))}
                </nav>
            </div>
             <div className="mt-6 flex-1">
                {renderContent()}
            </div>
            <NewOrderModal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} />
            <OrderDetailModal 
                order={selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                onUpdateStatus={updateOrderStatus}
                onUpdatePayment={updatePaymentStatus}
            />
        </div>
    );
};

const ZonesAndTablesSettings: React.FC<{
    zones: Zone[];
    onAddZone: () => void;
    onEditZoneName: (zone: Zone) => void;
    onDeleteZone: (zoneId: string) => void;
    onEditZoneLayout: (zone: Zone) => void;
}> = ({ zones, onAddZone, onEditZoneName, onDeleteZone, onEditZoneLayout }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Zonas y Mesas</h3>
            <button onClick={onAddZone} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 flex items-center gap-2">
                <IconPlus className="h-4 w-4"/> Nueva zona
            </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
            <ul className="divide-y dark:divide-gray-700">
                {zones.map(zone => (
                    <li key={zone.id} className="p-4 flex justify-between items-center">
                        <div className="flex-1">
                            <input 
                                type="text" 
                                defaultValue={zone.name} 
                                onBlur={e => onEditZoneName({ ...zone, name: e.target.value })}
                                className="font-semibold bg-transparent border-none focus:ring-0 p-0 text-gray-800 dark:text-gray-100"
                            />
                            <p className="text-xs text-gray-500">{zone.tables.length} mesas</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => onEditZoneLayout(zone)} className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">Editar diseño</button>
                            <button onClick={() => onDeleteZone(zone.id)} className="text-red-500 hover:text-red-600"><IconTrash className="h-5 w-5"/></button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const MenuManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'personalizations' | 'promotions'>('products');
    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {['products', 'personalizations', 'promotions'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all capitalize ${
                                activeTab === tab
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab === 'products' ? 'Productos' : tab === 'personalizations' ? 'Personalizaciones' : 'Promociones'}
                        </button>
                    ))}
                </nav>
            </div>
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'personalizations' && <PersonalizationsView />}
            {activeTab === 'promotions' && <PromotionsView />}
        </div>
    );
};

const AvailabilityView: React.FC = () => (
    <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <IconAvailability className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Gestión de Disponibilidad</h3>
        <p className="text-gray-500">Aquí podrás activar o desactivar productos y opciones rápidamente según tu inventario actual.</p>
    </div>
);

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();

    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);

    useEffect(() => {
        getAppSettings().then(setAppSettings);
        getZones().then(setZones);
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'products': return <MenuManagement />;
            case 'orders': return <OrderManagement onSettingsClick={() => setIsSettingsOpen(true)} />;
            case 'analytics': return <Dashboard />; // Fallback stub
            case 'messages': return <Dashboard />; // Fallback stub
            case 'availability': return <AvailabilityView />;
            case 'share': return <Dashboard />; // Fallback stub
            case 'tutorials': return <Dashboard />; // Fallback stub
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    title={PAGE_TITLES[currentPage]} 
                    onSettingsClick={() => setIsSettingsOpen(true)} 
                    onPreviewClick={() => {}}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
                <main className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminView;
