
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
                            <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><IconGripVertical className="h-4 w-4" /> Personalizar</button>
                            <button onClick={() => { onDuplicate(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><IconDuplicate className="h-4 w-4" /> Duplicar</button>
                            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-x-3 px-2 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const ProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (product: Omit<Product, 'id' | 'created_at'> & { id?: string }) => void; product: Product | null; categories: Category[]; personalizations: Personalization[] }> = ({ isOpen, onClose, onSave, product, categories, personalizations }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPersonalizationDropdown, setShowPersonalizationDropdown] = useState(false);
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData({
                    ...product,
                    personalizationIds: product.personalizationIds || (product as any).personalization_ids || []
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    imageUrl: '',
                    categoryId: categories[0]?.id || '',
                    available: true,
                    personalizationIds: []
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

    const handleAddPersonalization = (id: string) => {
        setFormData(prev => {
            const current = prev.personalizationIds || [];
            if (!current.includes(id)) {
                return { ...prev, personalizationIds: [...current, id] };
            }
            return prev;
        });
        setShowPersonalizationDropdown(false);
    };

    const handleRemovePersonalization = (id: string) => {
        setFormData(prev => {
            const current = prev.personalizationIds || [];
            return { ...prev, personalizationIds: current.filter(pId => pId !== id) };
        });
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
            personalizationIds: formData.personalizationIds,
            // Ensure snake_case is also sent for Supabase compatibility
            personalization_ids: formData.personalizationIds
        } as any);
        onClose();
    };

    if (!isOpen) return null;

    const availablePersonalizations = personalizations.filter(p => !formData.personalizationIds?.includes(p.id));
    const selectedPersonalizations = personalizations.filter(p => formData.personalizationIds?.includes(p.id));

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
                        
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <IconGripVertical className="h-4 w-4 text-emerald-600"/> Personalizaciones
                                </label>
                                <div className="relative">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPersonalizationDropdown(!showPersonalizationDropdown)}
                                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 flex items-center gap-1"
                                    >
                                        <IconPlus className="h-3 w-3" /> Añadir personalización
                                    </button>
                                    
                                    {showPersonalizationDropdown && (
                                        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-600 max-h-48 overflow-y-auto">
                                            {availablePersonalizations.length > 0 ? (
                                                availablePersonalizations.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => handleAddPersonalization(p.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        {p.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No hay más opciones disponibles</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {selectedPersonalizations.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedPersonalizations.map(pers => (
                                        <div key={pers.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{pers.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemovePersonalization(pers.id)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                <IconX className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                                    Este producto no tiene personalizaciones asignadas.
                                </p>
                            )}
                        </div>

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
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
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
            const [fetchedProducts, fetchedCategories, fetchedPersonalizations] = await Promise.all([
                getProducts(),
                getCategories(),
                getPersonalizations()
            ]);
            setProducts(fetchedProducts);
            setCategories(fetchedCategories);
            setPersonalizations(fetchedPersonalizations);
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
                personalizations={personalizations}
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
    
    if (isLoading) return <div className="text-center p-10">Cargando promociones...</div>;
    if (error) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div>
            {promotions.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto h-16 w-16 text-gray-300">
                        <IconPercent className="h-16 w-16"/>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Crea promociones y atrae más clientes</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Llama la atención de tus clientes y aumenta tus ventas.</p>
                    <div className="mt-6">
                        <button onClick={() => handleOpenModal(null)} className="flex items-center mx-auto space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                            <IconPlus className="h-5 w-5" />
                            <span>Nueva promoción</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                     <div className="flex justify-end mb-6">
                         <button onClick={() => handleOpenModal(null)} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                            <IconPlus className="h-5 w-5" />
                            <span>Nueva promoción</span>
                        </button>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Promociones Activas</h3>
                        <div className="space-y-4">
                            {promotions.map(promo => {
                                const now = new Date();
                                const startDate = promo.startDate ? new Date(promo.startDate) : null;
                                const endDate = promo.endDate ? new Date(promo.endDate) : null;
                                
                                if (endDate) {
                                    endDate.setHours(23, 59, 59, 999);
                                }

                                let statusColor = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
                                let statusText = 'Inactiva';

                                if (startDate && startDate > now) {
                                    statusColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                                    statusText = 'Programada';
                                } else if (endDate && endDate < now) {
                                    statusColor = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
                                    statusText = 'Finalizada';
                                } else {
                                    statusColor = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                                    statusText = 'Activa';
                                }

                                return (
                                    <div key={promo.id} className="p-4 border dark:border-gray-700 rounded-md flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{promo.name}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-bold text-emerald-600">{promo.discountValue}{promo.discountType === DiscountType.Percentage ? '%' : '$'} OFF</span> en {promo.appliesTo === PromotionAppliesTo.SpecificProducts ? `${promo.productIds.length} producto(s)` : 'todos los productos'}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-gray-400">Inicio:</span>
                                                    <span>{promo.startDate || 'Inmediato'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-gray-400">Fin:</span>
                                                    <span>{promo.endDate || 'Indefinido'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <button onClick={() => handleOpenModal(promo)} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><IconPencil/></button>
                                            <button onClick={() => handleDeletePromotion(promo.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><IconTrash/></button>
                                        </div>
                                    </div>
                                );
                            })}
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

const MenuManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('products');

    const tabs = [
        { id: 'products', title: 'Productos' },
        { id: 'personalizations', title: 'Personalizaciones' },
        { id: 'promotions', title: 'Promociones' },
    ];

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
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

            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'personalizations' && <PersonalizationsView />}
            {activeTab === 'promotions' && <PromotionsView />}
        </div>
    );
};


// --- Order Management Components ---

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

    const handlePrint = () => {
        window.print();
    };

    const handleAdvanceStatus = (nextStatus: OrderStatus) => {
        onUpdateStatus(order.id, nextStatus);
        
        // Auto-print ticket when moving to Preparing
        if (nextStatus === OrderStatus.Preparing) {
            setTimeout(() => window.print(), 500);
        }
    };

    const formattedDate = new Date(order.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });

    const steps = [
        { status: OrderStatus.Pending, label: 'PENDIENTE', icon: IconClock },
        { status: OrderStatus.Confirmed, label: 'CONFIRMADO', icon: IconCheck },
        { status: OrderStatus.Preparing, label: 'PREPARANDO', icon: IconReceipt },
        { status: OrderStatus.Ready, label: 'LISTO', icon: IconCheck },
        { status: OrderStatus.Completed, label: 'ENTREGADO', icon: IconCheck },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order.status);
    const isCancelled = order.status === OrderStatus.Cancelled;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'pointer-events-none' : ''}`}>
            <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}></div>
            <div className={`bg-[#1e293b] w-full max-w-5xl rounded-xl shadow-2xl transform transition-all duration-300 flex flex-col max-h-[95vh] border border-gray-700 ${isClosing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}>
                
                {/* Print-only Ticket (Comanda) */}
                <div className="hidden print:block fixed inset-0 z-[9999] bg-white p-8 m-0 w-full h-full overflow-hidden text-black font-mono leading-tight">
                    <div className="text-center mb-6 border-b-2 border-black pb-4">
                        <h1 className="text-4xl font-black uppercase mb-2">COMANDA COCINA</h1>
                        <div className="flex justify-between items-end border-t-2 border-black pt-2 mt-2">
                             <div className="text-left">
                                 <p className="text-sm font-bold text-gray-600">PEDIDO #</p>
                                 <p className="text-3xl font-black">{order.id.slice(0, 6).toUpperCase()}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm font-bold text-gray-600">HORA</p>
                                 <p className="text-xl font-bold">{new Date(order.createdAt).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                        </div>
                        <div className="mt-4 text-left bg-black text-white p-2 font-bold text-xl uppercase text-center rounded-sm">
                            {order.orderType === OrderType.DineIn ? `MESA ${order.tableId}` : order.orderType}
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="border-b border-dashed border-gray-400 pb-4">
                                <div className="flex gap-4 items-start">
                                    <span className="text-3xl font-black">{item.quantity}</span>
                                    <div className="flex-1">
                                        <span className="text-2xl font-bold block leading-none mb-2">{item.name}</span>
                                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                                                {item.selectedOptions.map((opt, i) => (
                                                    <span key={i} className="text-lg font-medium italic text-gray-800">+ {opt.name}</span>
                                                ))}
                                            </div>
                                        )}
                                        {item.comments && (
                                            <p className="text-lg font-bold mt-1 uppercase bg-gray-200 inline-block px-2 py-1 border border-black">
                                                NOTA: {item.comments}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {order.generalComments && (
                        <div className="mt-8 border-4 border-black p-4 font-bold text-2xl uppercase text-center bg-gray-100">
                            NOTA GENERAL: {order.generalComments}
                        </div>
                    )}
                    
                    <div className="mt-12 text-center text-sm border-t-2 border-black pt-4">
                        <p className="font-bold">--- FIN DE COMANDA ---</p>
                    </div>
                </div>

                {/* Screen Content */}
                <div className="print:hidden flex flex-col h-full text-gray-100">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-700 bg-[#0f172a] rounded-t-xl">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-800 px-3 py-1 rounded text-sm font-mono text-gray-400">
                                    #{order.id.slice(0, 6).toUpperCase()}
                                </div>
                                <span className="text-gray-400 text-sm">{formattedDate}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors">
                                    <IconPrinter className="h-4 w-4"/> Imprimir Comanda
                                </button>
                                <button onClick={handleClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
                                    <IconX className="h-6 w-6"/>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-3xl font-black text-white">{order.customer.name}</h2>
                            <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded border border-orange-500/30">Nuevo</span>
                            <div className="flex items-center gap-2 text-gray-400 text-sm ml-4">
                                <IconWhatsapp className="h-4 w-4 text-green-500"/>
                                <span>{order.customer.phone}</span>
                            </div>
                        </div>

                        {/* Status Stepper */}
                        {!isCancelled && (
                            <div className="w-full px-8">
                                <div className="flex items-center justify-between relative">
                                    {/* Connecting Line */}
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-700 -z-0 -translate-y-1/2"></div>
                                    <div 
                                        className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -z-0 -translate-y-1/2 transition-all duration-500"
                                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                    ></div>

                                    {steps.map((step, index) => {
                                        const isCompleted = currentStepIndex >= index;
                                        const isCurrent = currentStepIndex === index;
                                        const StepIcon = step.icon;
                                        
                                        return (
                                            <div key={step.status} className="flex flex-col items-center relative z-10 bg-[#0f172a] px-2">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-[#1e293b] border-gray-600 text-gray-500'}`}>
                                                    <StepIcon className="h-5 w-5" />
                                                </div>
                                                <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-gray-500'}`}>{step.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-6">
                                 {/* Order Details */}
                                 <div className="bg-[#1e293b] rounded-xl p-6 border border-gray-700">
                                     <h3 className="font-bold text-gray-100 flex items-center gap-2 border-b border-gray-700 pb-4 mb-4">
                                         <IconReceipt className="h-5 w-5 text-gray-400"/> Detalle del pedido
                                     </h3>
                                     <div className="space-y-4">
                                         {order.items.map((item, idx) => (
                                             <div key={idx} className="flex justify-between items-start p-4 bg-[#0f172a] rounded-xl border border-gray-800">
                                                 <div className="flex gap-4">
                                                     <span className="font-black text-emerald-500 text-xl bg-emerald-500/10 w-10 h-10 flex items-center justify-center rounded-lg">{item.quantity}x</span>
                                                     <div>
                                                         <p className="font-bold text-gray-200 text-lg">{item.name}</p>
                                                         {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                             <div className="flex flex-wrap gap-1 mt-1">
                                                                 {item.selectedOptions.map((opt, i) => (
                                                                     <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">{opt.name}</span>
                                                                 ))}
                                                             </div>
                                                         )}
                                                         {item.comments && <p className="text-sm text-orange-400 italic mt-2 font-medium bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 inline-block">Nota: {item.comments}</p>}
                                                     </div>
                                                 </div>
                                                 <span className="font-bold text-gray-300 text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                                             </div>
                                         ))}
                                     </div>
                                     {order.generalComments && (
                                         <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-200 flex items-start gap-3">
                                             <span className="text-2xl">📝</span>
                                             <div>
                                                 <strong className="block mb-1 uppercase tracking-wide text-xs text-yellow-500">Nota general del cliente</strong>
                                                 <p className="font-medium text-lg">{order.generalComments}</p>
                                             </div>
                                         </div>
                                     )}
                                 </div>

                                 {/* Payment Proof */}
                                 {order.paymentProof && (
                                     <div className="bg-[#1e293b] rounded-xl p-6 border border-gray-700">
                                         <h4 className="font-bold text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-700 pb-4">
                                             <IconCheck className="h-5 w-5 text-green-500"/> Comprobante de pago
                                         </h4>
                                         <div className="rounded-xl overflow-hidden border border-gray-700 bg-[#0f172a] flex justify-center p-4">
                                             <img src={order.paymentProof} alt="Comprobante" className="max-h-96 object-contain" />
                                         </div>
                                         <div className="mt-4 flex justify-center">
                                             <a href={order.paymentProof} download={`comprobante-${order.id}.png`} className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 font-semibold flex items-center gap-2 transition-colors border border-blue-500/20">
                                                 <IconUpload className="h-4 w-4 rotate-180"/> Descargar comprobante
                                             </a>
                                         </div>
                                     </div>
                                 )}
                            </div>
                            
                            {/* Right Column */}
                            <div className="space-y-6">
                                <div className="bg-[#1e293b] rounded-xl p-6 border border-gray-700">
                                    <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-700 pb-4">
                                        <IconLocationMarker className="h-5 w-5 text-gray-400"/> Datos de entrega
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-[#0f172a] rounded-lg border border-gray-800">
                                            <span className="text-gray-400 text-sm">Tipo de pedido</span>
                                            <span className="font-bold text-white uppercase tracking-wide text-sm">{order.orderType}</span>
                                        </div>
                                        
                                        {order.tableId && (
                                            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                <span className="text-emerald-400 font-medium">Mesa</span>
                                                <span className="font-black text-emerald-500 text-xl">{order.tableId}</span>
                                            </div>
                                        )}
                                        
                                        {order.orderType === OrderType.Delivery && (
                                            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <p className="font-bold text-white mb-1">{order.customer.address.calle} #{order.customer.address.numero}</p>
                                                <p className="text-gray-400 text-sm mb-2">{order.customer.address.colonia}</p>
                                                {order.customer.address.referencias && <p className="text-xs italic text-gray-400 bg-[#0f172a] p-2 rounded border border-gray-700">"{order.customer.address.referencias}"</p>}
                                                
                                                {order.customer.address.googleMapsLink && (
                                                    <a 
                                                        href={order.customer.address.googleMapsLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-md"
                                                    >
                                                        <IconLocationMarker className="h-4 w-4"/> Ver en Mapa
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#1e293b] rounded-xl p-6 border border-gray-700">
                                    <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-700 pb-4">
                                        <IconPayment className="h-5 w-5 text-gray-400"/> Resumen de Pago
                                    </h3>
                                    <div className="text-center space-y-4">
                                        <div>
                                            <p className="text-gray-500 text-sm uppercase tracking-widest mb-1">Total a Pagar</p>
                                            <p className="text-4xl font-black text-white">${order.total.toFixed(2)}</p>
                                        </div>
                                        
                                        <div className={`p-4 rounded-xl border-2 ${order.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'}`}>
                                            <p className="font-bold uppercase tracking-wider text-sm mb-2">Estado del Pago</p>
                                            <div className="flex items-center justify-center gap-2 text-lg font-black">
                                                {order.paymentStatus === 'paid' ? <IconCheck className="h-6 w-6"/> : <IconClock className="h-6 w-6"/>}
                                                {order.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => onUpdatePayment(order.id, order.paymentStatus === 'paid' ? 'pending' : 'paid')}
                                            className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-300 underline decoration-dashed"
                                        >
                                            {order.paymentStatus === 'paid' ? 'Marcar como pendiente' : 'Marcar como pagado manualmente'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-[#1e293b] border-t border-gray-700 flex flex-col sm:flex-row gap-3 justify-end items-center rounded-b-xl">
                        {order.status !== OrderStatus.Completed && order.status !== OrderStatus.Cancelled && (
                            <>
                                {order.status === OrderStatus.Pending && (
                                    <button onClick={() => handleAdvanceStatus(OrderStatus.Confirmed)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        <IconCheck className="h-5 w-5"/> Confirmar Pedido
                                    </button>
                                )}
                                {order.status === OrderStatus.Confirmed && (
                                    <button onClick={() => handleAdvanceStatus(OrderStatus.Preparing)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        <IconReceipt className="h-5 w-5"/> Enviar a Cocina
                                    </button>
                                )}
                                {order.status === OrderStatus.Preparing && (
                                    <button onClick={() => handleAdvanceStatus(OrderStatus.Ready)} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        <IconCheck className="h-5 w-5"/> Marcar Listo
                                    </button>
                                )}
                                {order.status === OrderStatus.Ready && (
                                    <button onClick={() => handleAdvanceStatus(order.orderType === OrderType.Delivery ? OrderStatus.Delivering : OrderStatus.Completed)} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        {order.orderType === OrderType.Delivery ? 'Enviar Repartidor' : 'Entregar a Cliente'}
                                    </button>
                                )}
                                {order.status === OrderStatus.Delivering && (
                                    <button onClick={() => handleAdvanceStatus(OrderStatus.Completed)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                                        <IconCheck className="h-5 w-5"/> Completar Entrega
                                    </button>
                                )}
                                
                                <button onClick={() => { if(window.confirm('¿Cancelar pedido?')) onUpdateStatus(order.id, OrderStatus.Cancelled); }} className="text-red-500 hover:text-red-400 font-bold px-4 py-2 border border-red-500/20 rounded-lg hover:bg-red-500/10">
                                    Cancelar
                                </button>
                            </>
                        )}
                         {order.status === OrderStatus.Completed && (
                             <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
                                 <IconCheck className="h-5 w-5"/> Pedido Completado
                             </div>
                         )}
                         {order.status === OrderStatus.Cancelled && (
                             <div className="flex items-center gap-2 text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                                 <IconX className="h-5 w-5"/> Pedido Cancelado
                             </div>
                         )}
                    </div>
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

const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => (
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
);

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
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
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
    
    // State for Table Panel
    const [zones, setZones] = useState<Zone[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>('');


    // Initial Load
    useEffect(() => {
        const load = async () => {
            // Fetch orders and zones
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

        // Realtime Subscription
        const channel = subscribeToNewOrders(
            (newOrder) => {
                // Play simple notification sound if possible (browser policy permitting)
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
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try {
            await updateOrder(orderId, { status: newStatus });
        } catch (e: any) {
            console.error(e);
            // Fix: Robust error handling to avoid [object Object]
            const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
            alert(`Error updating order status: ${errorMsg}`);
            // Revert if failed (could be implemented by re-fetching)
        }
    };
    
    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        try {
             await updateOrder(orderId, { paymentStatus: newStatus });
        } catch (e: any) {
            console.error(e);
             // Fix: Robust error handling to avoid [object Object]
             const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
             alert(`Error updating payment status: ${errorMsg}`);
        }
    }
    
    const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId]);
    
    // Calculate Table Status
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
         // Simple stats calculation based on current orders
         const activeTables = orders.filter(o => o.tableId && o.status !== OrderStatus.Completed && o.status !== OrderStatus.Cancelled).length;
         // Mocking specific "Requesting Bill" states since backend doesn't support it yet, using PaymentStatus 'pending' + 'Ready' status as a proxy
         const requestingBill = orders.filter(o => o.tableId && o.status === OrderStatus.Ready && o.paymentStatus === 'pending').length;
         
         return {
             requestingBill: requestingBill,
             requestingWaiter: 0, // Feature not yet implemented in backend
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
                            
                            {/* Updated Header Buttons matching screenshot */}
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
                        {/* Header Actions */}
                        <div className="flex justify-end gap-3 mb-4">
                            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Ver uso de suscripción
                            </button>
                            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                Ver historial <IconClock className="h-4 w-4 text-gray-400"/>
                            </button>
                        </div>

                        {/* Stats Bar */}
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

                        {/* Zone Selector */}
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

                        {/* Tables Grid */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 p-8 overflow-auto relative min-h-[400px]">
                            {activeZone ? (
                                <div 
                                    className="grid gap-6"
                                    style={{
                                        gridTemplateColumns: `repeat(${activeZone.cols}, minmax(80px, 1fr))`,
                                        gridTemplateRows: `repeat(${activeZone.rows}, minmax(80px, 1fr))`
                                    }}
                                >
                                    {/* Render Tables */}
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
                                    
                                    {/* Render Grid Dots for Empty Spaces */}
                                    {Array.from({ length: activeZone.rows * activeZone.cols }).map((_, index) => {
                                        const row = Math.floor(index / activeZone.cols) + 1;
                                        const col = (index % activeZone.cols) + 1;
                                        
                                        // Check if cell is occupied by any table
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
                            
                             {/* Floating Status Badge */}
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

// ... (Analytics, Messages, AvailabilityView, etc. remain unchanged) ...

// --- Analytics Components ---
const Analytics: React.FC = () => {
    const [orders] = usePersistentState<Order[]>('orders', []); // Keeping mock logic here for now as requested, or can be switched
    // For full consistency, this should also be switched, but user asked for "Dashboard" specifically.
    // Let's keep Analytics simple for now as it uses AI analysis on mock data in the original code.
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
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej: ¿Cuáles son los productos más populares los fines de semana?"
                    className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-transparent dark:text-white"
                />
                <button 
                    onClick={handleGetInsights} 
                    disabled={isLoading}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                    <IconSparkles />
                    <span>{isLoading ? 'Analizando...' : 'Obtener Insights'}</span>
                </button>
            </div>
            {isLoading && <div className="mt-6 text-center">Cargando...</div>}
            {insights && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700 prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans bg-transparent p-0">{insights}</pre>
                </div>
            )}
        </div>
    );
};


// --- Messages Components ---
const Messages: React.FC = () => {
    const [conversations, setConversations] = usePersistentState<Conversation[]>('conversations', MOCK_CONVERSATIONS);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0] || null);
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const message: AdminChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'admin',
            text: newMessage.trim(),
            timestamp: new Date()
        };
        
        const updatedConversation: Conversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
            lastMessage: message.text,
            lastMessageTimestamp: message.timestamp
        };
        
        setConversations((prev: Conversation[]) => prev.map((c: Conversation) => c.id === updatedConversation.id ? updatedConversation : c));
        setSelectedConversation(updatedConversation);
        setNewMessage('');
    };

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="w-1/3 border-r dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold">Conversaciones</h2>
                </div>
                <div className="overflow-y-auto h-full">
                    {conversations.map((conv: Conversation) => (
                        <div
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className={`p-4 cursor-pointer border-l-4 ${selectedConversation?.id === conv.id ? 'border-indigo-500 bg-gray-50 dark:bg-gray-700/50' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                            <div className="flex justify-between">
                                <p className="font-semibold">{conv.customerName}</p>
                                {conv.unreadCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{conv.unreadCount}</span>}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{conv.lastMessage}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-2/3 flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">{selectedConversation.customerName}</h3>
                            <button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><IconMoreVertical /></button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {selectedConversation.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                        <p>{msg.text}</p>
                                        <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Escribe tu mensaje..."
                                    className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent"
                                />
                                <button onClick={handleSendMessage} className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700"><IconSend /></button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Selecciona una conversación para chatear.</div>
                )}
            </div>
        </div>
    );
};

// ... (AvailabilityView, Settings Components remain unchanged) ...
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
            setIsLoading(true);
            setError(null);
            const [fetchedProducts, fetchedCategories, fetchedPersonalizations] = await Promise.all([
                getProducts(),
                getCategories(),
                getPersonalizations()
            ]);
            setProducts(fetchedProducts);
            setCategories(fetchedCategories);
            setPersonalizations(fetchedPersonalizations);
        } catch (err) {
            setError("Error al cargar datos. Revisa la consola y la configuración de Supabase.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
        setProducts(prev => 
            prev.map(p => p.id === productId ? { ...p, available: !currentStatus } : p)
        );
        try {
            await updateProductAvailability(productId, !currentStatus);
        } catch (error) {
            alert("No se pudo actualizar la disponibilidad del producto.");
            setProducts(prev => 
                prev.map(p => p.id === productId ? { ...p, available: currentStatus } : p)
            );
        }
    };

    const handleTogglePersonalizationOption = async (optionId: string, currentStatus: boolean) => {
        setPersonalizations(prev => 
            prev.map(p => ({
                ...p,
                options: p.options.map(opt => 
                    opt.id === optionId ? { ...opt, available: !currentStatus } : opt
                )
            }))
        );
        try {
            await updatePersonalizationOptionAvailability(optionId, !currentStatus);
        } catch (error) {
            alert("No se pudo actualizar la disponibilidad de la opción.");
            setPersonalizations(prev => 
                prev.map(p => ({
                    ...p,
                    options: p.options.map(opt => 
                        opt.id === optionId ? { ...opt, available: currentStatus } : opt
                    )
                }))
            );
        }
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => filter === 'all' || !p.available)
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, filter, searchTerm]);

    const groupedProducts = useMemo(() => {
        return categories
            .map(category => ({
                ...category,
                products: filteredProducts.filter(p => p.categoryId === category.id)
            }))
            .filter(category => category.products.length > 0);
    }, [filteredProducts, categories]);
    
    const filteredPersonalizations = useMemo(() => {
        const allOptions: (PersonalizationOption & { parentName: string })[] = [];
        personalizations.forEach(p => {
            p.options.forEach(opt => {
                allOptions.push({ ...opt, parentName: p.name });
            });
        });
        
        return allOptions
            .filter(opt => filter === 'all' || !opt.available)
            .filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [personalizations, filter, searchTerm]);

    const groupedPersonalizations = useMemo(() => {
        const groups: { [key: string]: (PersonalizationOption & { parentName: string })[] } = {};
        filteredPersonalizations.forEach(opt => {
            if (!groups[opt.parentName]) {
                groups[opt.parentName] = [];
            }
            groups[opt.parentName].push(opt);
        });
        return Object.entries(groups).map(([name, options]) => ({ name, options }));
    }, [filteredPersonalizations]);


    const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; id: string; label: string }> = ({ checked, onChange, id, label }) => (
        <label htmlFor={id} className="flex items-center cursor-pointer">
            <div className="relative">
                <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <span className="ml-3 text-gray-700 dark:text-gray-300 font-medium hidden sm:inline">{label}</span>
        </label>
    );

    const tabs = [
        { id: 'products', title: 'Productos' },
        { id: 'personalizations', title: 'Personalizaciones' },
    ];
    
    if (isLoading) return <div className="text-center p-10">Cargando disponibilidad...</div>;
    if (error) return <div className="text-center p-10 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
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

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'all' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-white dark:bg-gray-700 border dark:border-gray-600'}`}>
                        Todos
                    </button>
                    <button onClick={() => setFilter('unavailable')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'unavailable' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-white dark:bg-gray-700 border dark:border-gray-600'}`}>
                        Agotados
                    </button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                </div>
            </div>

            {activeTab === 'products' && (
                <div className="space-y-6">
                    {groupedProducts.map(category => (
                        <div key={category.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{category.name}</h3>
                            <div className="divide-y dark:divide-gray-700">
                                {category.products.map(product => (
                                    <div key={product.id} className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-x-4">
                                            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover"/>
                                            <span className="font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
                                        </div>
                                        <div className="flex items-center gap-x-4">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{product.available ? 'Disponible' : 'Agotado'}</span>
                                            <ToggleSwitch
                                                checked={product.available}
                                                onChange={() => handleToggleProduct(product.id, product.available)}
                                                id={`toggle-prod-${product.id}`}
                                                label={product.name}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {groupedProducts.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">No se encontraron productos.</p>}
                </div>
            )}

            {activeTab === 'personalizations' && (
                <div className="space-y-6">
                    {groupedPersonalizations.map(group => (
                        <div key={group.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{group.name}</h3>
                             <div className="divide-y dark:divide-gray-700">
                                {group.options.map(option => (
                                    <div key={option.id} className="flex items-center justify-between py-4">
                                        <span className="font-medium text-gray-800 dark:text-gray-100">{option.name}</span>
                                        <div className="flex items-center gap-x-4">
                                             <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{option.available ? 'Disponible' : 'Agotado'}</span>
                                            <ToggleSwitch
                                                checked={option.available}
                                                onChange={() => handleTogglePersonalizationOption(option.id, option.available)}
                                                id={`toggle-opt-${option.id}`}
                                                label={option.name}
                                            />
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ))}
                    {groupedPersonalizations.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">No se encontraron personalizaciones.</p>}
                </div>
            )}
        </div>
    );
};

// --- Settings Components, QR Modal, Share View and Main export remain...
// (Including all settings components as they were, no logic change there)
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

// ... Include all remaining settings components (SearchableDropdown, GeneralSettings, BranchSettingsView, ShippingSettingsView, PaymentSettingsView, HoursSettings, ZonesAndTablesSettings, PrintingSettingsView, ZoneEditor, SettingsModal, QRModal, ShareView) ...
// Re-adding necessary components for full functionality
const SearchableDropdown: React.FC<{ options: Currency[], selected: Currency, onSelect: (option: Currency) => void }> = ({ options, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: Currency) => {
        onSelect(option);
        setIsOpen(false);
        setSearchTerm('');
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm">
                <span className="block truncate">{selected.name}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <IconChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="p-2">
                         <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    {filteredOptions.map(option => (
                        <button
                            key={option.code}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className="w-full text-left cursor-default select-none relative py-2 pl-10 pr-4 text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <span className={`font-normal block truncate ${selected.code === option.code ? 'font-medium' : 'font-normal'}`}>{option.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const GeneralSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.company);

    useEffect(() => {
        setOriginalSettings(settings.company)
    }, [settings.company])

    const handleCancel = () => {
        setSettings(prev => ({...prev, company: originalSettings}));
    }

    return (
        <div className="space-y-6">
             <SettingsCard title="Datos de empresa" onSave={onSave} onCancel={handleCancel}>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de empresa</label>
                 <input type="text" value={settings.company.name} onChange={e => setSettings(p => ({...p, company: {...p.company, name: e.target.value}}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"/>

                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Divisa</label>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Escoge la divisa que tus clientes verán en el menú.</p>
                 <SearchableDropdown options={CURRENCIES} selected={settings.company.currency} onSelect={currency => setSettings(p => ({...p, company: {...p.company, currency}}))} />
            </SettingsCard>
        </div>
    );
};

const BranchSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.branch);
    
    useEffect(() => {
        setOriginalSettings(settings.branch)
    }, [settings.branch]);
    
    const handleCancel = () => {
        setSettings(prev => ({...prev, branch: originalSettings}));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverImageUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                setSettings(prev => {
                    const newSettings = {...prev, branch: {...prev.branch, [field]: imageUrl}};
                    // Auto-save on image upload
                    saveAppSettings(newSettings).then(() => {
                        alert("Imagen cargada y guardada.");
                    }).catch(() => {
                        alert("Error al guardar la imagen.");
                    });
                    return newSettings;
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("La geolocalización no es compatible con este navegador.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setSettings(p => ({ ...p, branch: {...p.branch, googleMapsLink: link} }));
                alert("Ubicación obtenida. No olvides guardar los cambios.");
            },
            () => {
                alert("No se pudo obtener la ubicación. Asegúrate de haber concedido los permisos.");
            }
        );
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";

    return (
        <div className="space-y-6">
            <SettingsCard title="Datos de sucursal" onSave={onSave} onCancel={handleCancel}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alias de sucursal</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visible para tus clientes, nombre corto o distintivo para identificar esta sucursal entre las demás.</p>
                <input 
                    type="text" 
                    value={settings.branch.alias} 
                    onChange={e => setSettings(p => ({...p, branch: {...p.branch, alias: e.target.value}}))} 
                    className={inputClasses}
                    placeholder="ANYVAL PARK - Suc."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Algunos ejemplos son: Centro, Las américas, Del valle.</p>

                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Dirección completa</label>
                <input 
                    type="text" 
                    value={settings.branch.fullAddress} 
                    onChange={e => setSettings(p => ({...p, branch: {...p.branch, fullAddress: e.target.value}}))} 
                    className={inputClasses}
                />

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Ubicación en Google Maps</label>
                {settings.branch.googleMapsLink ? (
                    <div className="flex items-center gap-2 mt-1">
                        <a href={settings.branch.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 text-sm underline truncate">{settings.branch.googleMapsLink}</a>
                        <button onClick={() => setSettings(p => ({...p, branch: {...p.branch, googleMapsLink: ''}}))} className="text-red-500"><IconTrash className="h-4 w-4"/></button>
                    </div>
                ) : (
                    <button type="button" onClick={handleGetLocation} className="mt-1 flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <IconLocationMarker className="h-5 w-5"/>
                        Agregar ubicación
                    </button>
                )}
            </SettingsCard>

            <SettingsCard title="Número de WhatsApp para pedidos" noActions>
                <p className="text-sm text-gray-500 dark:text-gray-400">El número al que llegarán las comandas de los pedidos a domicilio</p>
                <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-gray-800 dark:text-gray-200">{settings.branch.whatsappNumber}</span>
                    <button type="button" className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">Cambiar número</button>
                </div>
            </SettingsCard>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Logotipo de la tienda</span>
                    <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">
                        <IconUpload className="h-5 w-5"/>
                        Cargar imagen
                    </label>
                    <input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')}/>
                 </div>
                 {settings.branch.logoUrl && <img src={settings.branch.logoUrl} alt="Logo preview" className="w-20 h-20 rounded-full object-cover mt-4"/>}
            </div>

             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Portada de la tienda</span>
                    <label htmlFor="cover-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">
                        <IconUpload className="h-5 w-5"/>
                        Cargar imagen
                    </label>
                    <input id="cover-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImageUrl')}/>
                 </div>
                  {settings.branch.coverImageUrl && <img src={settings.branch.coverImageUrl} alt="Cover preview" className="w-full h-32 object-cover rounded-md mt-4"/>}
            </div>
        </div>
    );
};

const ShippingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    
    const [originalSettings, setOriginalSettings] = useState(settings.shipping);
    
    useEffect(() => {
        setOriginalSettings(settings.shipping)
    }, [settings.shipping])

    const handleCancel = () => {
        setSettings(prev => ({...prev, shipping: originalSettings}));
    };

    const inputClasses = "w-24 text-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";
    
    return (
        <div className="space-y-6">
            <SettingsCard title="Tipo de costo de envío" onSave={onSave} onCancel={handleCancel}>
                <select value={settings.shipping.costType} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, costType: e.target.value as ShippingCostType}}))} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                   {Object.values(ShippingCostType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El precio de envío no será calculado automáticamente.</p>
                
                <div className="mt-4 space-y-3">
                    <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <span className="ml-2 text-sm">Envío gratis si se alcanza una compra mínima</span>
                    </label>
                     <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <span className="ml-2 text-sm">Se requiere una compra mínima para habilitar envíos</span>
                    </label>
                </div>
            </SettingsCard>

             <SettingsCard title="Tiempo para pedidos a domicilio" onSave={onSave} onCancel={handleCancel}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Desde que el cliente hace su pedido.</p>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                         <input type="number" value={settings.shipping.deliveryTime.min} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, deliveryTime: {...p.shipping.deliveryTime, min: Number(e.target.value)}} }))} className={inputClasses}/>
                         <span>mins</span>
                    </div>
                     <span className="text-gray-500">Máximo</span>
                    <div className="flex items-center gap-2">
                         <input type="number" value={settings.shipping.deliveryTime.max} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, deliveryTime: {...p.shipping.deliveryTime, max: Number(e.target.value)}} }))} className={inputClasses}/>
                         <span>mins</span>
                    </div>
                </div>
                 <h4 className="font-bold mt-6">Tiempo para pedidos para recoger</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Desde que el cliente hace su pedido.</p>
                 <div className="flex items-center gap-2 mt-2">
                    <input type="number" value={settings.shipping.pickupTime.min} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, pickupTime: {min: Number(e.target.value)}}}))} className={inputClasses}/>
                    <span>mins</span>
                 </div>
             </SettingsCard>
        </div>
    );
};

const PaymentSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.payment);
    const availableMethods: PaymentMethod[] = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle', 'Punto de Venta', 'Pago con tarjeta'];

    useEffect(() => {
        setOriginalSettings(settings.payment)
    }, [settings.payment]);

    const handleCancel = () => {
        setSettings(prev => ({...prev, payment: originalSettings}));
    }

    const handleCheckboxChange = (group: 'deliveryMethods' | 'pickupMethods', method: PaymentMethod, checked: boolean) => {
        setSettings(prev => {
            const currentMethods = prev.payment[group];
            if (checked) {
                return {...prev, payment: {...prev.payment, [group]: [...currentMethods, method]}};
            } else {
                return {...prev, payment: {...prev.payment, [group]: currentMethods.filter(m => m !== method)}};
            }
        });
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-white placeholder-gray-400";

    return (
        <div className="space-y-6">
            <SettingsCard title="Métodos de pago para los clientes" onSave={onSave} onCancel={handleCancel}>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold">Envíos a domicilio</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Desactivar todos deshabilita los pedidos domicilios</p>
                        <div className="mt-3 space-y-2">
                            {availableMethods.map(method => (
                                <label key={method} className="flex items-center">
                                    <input type="checkbox" checked={settings.payment.deliveryMethods.includes(method)} onChange={(e) => handleCheckboxChange('deliveryMethods', method, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                    <span className="ml-2 text-sm">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold">Para recoger</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Desactivar todos deshabilita los pedidos para recoger</p>
                        <div className="mt-3 space-y-2">
                             {availableMethods.map(method => (
                                <label key={method} className="flex items-center">
                                    <input type="checkbox" checked={settings.payment.pickupMethods.includes(method)} onChange={(e) => handleCheckboxChange('pickupMethods', method, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                    <span className="ml-2 text-sm">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Configuración de Pago Móvil" description="Datos para que tus clientes realicen el pago." onSave={onSave} onCancel={handleCancel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banco</label>
                        <input type="text" value={settings.payment.pagoMovil?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. Banesco"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                        <input type="text" value={settings.payment.pagoMovil?.phone || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, phone: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. 0414-1234567"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cédula / RIF</label>
                        <input type="text" value={settings.payment.pagoMovil?.idNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, idNumber: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. V-12345678"/>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Configuración de Transferencia Bancaria" description="Datos de la cuenta bancaria." onSave={onSave} onCancel={handleCancel}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banco</label>
                        <input type="text" value={settings.payment.transfer?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. Mercantil"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Cuenta</label>
                        <input type="text" value={settings.payment.transfer?.accountNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountNumber: e.target.value} as any}}))} className={inputClasses} placeholder="0105..."/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titular</label>
                            <input type="text" value={settings.payment.transfer?.accountHolder || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountHolder: e.target.value} as any}}))} className={inputClasses} placeholder="Nombre del titular"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cédula / RIF</label>
                            <input type="text" value={settings.payment.transfer?.idNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, idNumber: e.target.value} as any}}))} className={inputClasses} placeholder="V-12345678"/>
                        </div>
                    </div>
                </div>
            </SettingsCard>

             <SettingsCard title="Campo de propinas" description="Permite a los clientes introducir propinas." onSave={onSave} onCancel={handleCancel}>
                <label className="flex items-center">
                    <input type="checkbox" checked={settings.payment.showTipField} onChange={e => setSettings(p => ({...p, payment: {...p.payment, showTipField: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                    <span className="ml-2 text-sm">Mostrar campo para agregar propina</span>
                </label>
            </SettingsCard>
        </div>
    );
};

const TimeInput: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
    <input 
        type="time" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
    />
);

const ShiftModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (shift: TimeRange) => void, day: string }> = ({ isOpen, onClose, onSave, day }) => {
    const [shift, setShift] = useState<TimeRange>({ start: '09:00', end: '17:00' });

    const handleSave = () => {
        onSave(shift);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Agrega un turno en {day}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Empieza:</label>
                            <TimeInput value={shift.start} onChange={val => setShift(s => ({...s, start: val}))} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Termina:</label>
                            <TimeInput value={shift.end} onChange={val => setShift(s => ({...s, end: val}))} />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-x-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Agregar turno</button>
                </div>
            </div>
        </div>
    );
};

const ScheduleModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (name: string) => void }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
            setName('');
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                 <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Agrega un horario</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Añade más horarios si ofreces productos en distintos horarios (ej. desayunos, comidas y cenas). También es útil para promociones o combos disponibles solo en ciertos días.</p>
                    <div className="mt-4">
                        <label className="text-sm font-medium">Nombre de horario</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-x-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Agregar horario</button>
                </div>
            </div>
        </div>
    );
};

const HoursSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [activeScheduleId, setActiveScheduleId] = useState(settings.schedules[0]?.id || '');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DaySchedule['day'] | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    const activeSchedule = useMemo(() => {
        return settings.schedules.find(s => s.id === activeScheduleId);
    }, [settings.schedules, activeScheduleId]);

    const hasAnyShifts = useMemo(() => {
        return activeSchedule?.days.some(d => d.shifts.length > 0);
    }, [activeSchedule]);

    const handleAddShift = (day: DaySchedule['day']) => {
        setSelectedDay(day);
        setIsShiftModalOpen(true);
    };
    
    const handleSaveShift = (shift: TimeRange) => {
        if (!selectedDay || !activeScheduleId) return;
        setSettings(prev => {
            const newSettings = {
                ...prev,
                schedules: prev.schedules.map(schedule => 
                    schedule.id === activeScheduleId
                    ? {
                        ...schedule,
                        days: schedule.days.map(day => 
                            day.day === selectedDay
                            ? {...day, shifts: [...day.shifts, shift]}
                            : day
                        )
                      }
                    : schedule
                )
            };
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
    };

    const handleRemoveShift = (dayName: DaySchedule['day'], shiftIndex: number) => {
         setSettings(prev => {
            const newSettings = {
                ...prev,
                schedules: prev.schedules.map(schedule => 
                    schedule.id === activeScheduleId
                    ? {
                        ...schedule,
                        days: schedule.days.map(day => 
                            day.day === dayName
                            ? {...day, shifts: day.shifts.filter((_, i) => i !== shiftIndex)}
                            : day
                        )
                      }
                    : schedule
                )
            };
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
    };
    
    const handleSaveSchedule = (name: string) => {
        const newSchedule: Schedule = {
            id: `schedule-${Date.now()}`,
            name,
            days: [
                { day: 'Lunes', shifts: [], isOpen: true },
                { day: 'Martes', shifts: [], isOpen: true },
                { day: 'Miércoles', shifts: [], isOpen: true },
                { day: 'Jueves', shifts: [], isOpen: true },
                { day: 'Viernes', shifts: [], isOpen: true },
                { day: 'Sábado', shifts: [], isOpen: true },
                { day: 'Domingo', shifts: [], isOpen: true },
            ]
        };
        setSettings(prev => {
            const newSettings = { ...prev, schedules: [...prev.schedules, newSchedule]};
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
        setActiveScheduleId(newSchedule.id);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <select value={activeScheduleId} onChange={e => setActiveScheduleId(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                    {settings.schedules.map(s => <option key={s.id} value={s.id}>Horario: {s.name}</option>)}
                </select>
                <button onClick={() => setIsScheduleModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 flex items-center gap-2"><IconPlus className="h-4 w-4"/> Nuevo horario</button>
            </div>

            {!hasAnyShifts && (
                 <div className="p-4 bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-700 dark:text-orange-200">
                    <p className="font-bold">El horario permanecerá abierto las 24 horas hasta que agregues un turno.</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <h3 className="font-bold">{activeSchedule?.name}</h3>
                    <button className="text-gray-500"><IconMoreVertical/></button>
                </div>
                <ul className="divide-y dark:divide-gray-700">
                    {activeSchedule?.days.map(day => (
                        <li key={day.day} className="p-4 flex justify-between items-center">
                            <span className="font-semibold w-24">{day.day}</span>
                            <div className="flex-1 flex flex-wrap gap-2 items-center">
                                {day.shifts.map((shift, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
                                        <span>{shift.start} - {shift.end}</span>
                                        <button onClick={() => handleRemoveShift(day.day, index)} className="text-gray-500 hover:text-red-500"><IconX className="h-3 w-3"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleAddShift(day.day)} className="text-green-600 font-semibold text-sm flex items-center gap-1"><IconPlus className="h-4 w-4"/> Nuevo turno</button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <ShiftModal 
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                onSave={handleSaveShift}
                day={selectedDay || ''}
            />
            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={handleSaveSchedule}
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
}> = ({ zones, onAddZone, onEditZoneName, onDeleteZone, onEditZoneLayout }) => {
    
    const ActionMenu: React.FC<{zone: Zone}> = ({zone}) => {
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
                <button onClick={() => setIsOpen(p => !p)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><IconMoreVertical/></button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <div className="p-1">
                             <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Acciones</p>
                            <button onClick={() => { onEditZoneLayout(zone); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"> <IconEdit className="h-4 w-4" /> Editar distribución</button>
                            <button onClick={() => { onDeleteZone(zone.id); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md flex items-center gap-x-3 text-sm text-blue-800 dark:text-blue-200 mb-6">
                <IconInfo className="h-5 w-5 flex-shrink-0" />
                <span>Encuentra el código QR de cada mesa en <a href="#" className="font-semibold underline hover:text-blue-600">Compartir</a>.</span>
            </div>

            <div className="flex justify-end">
                 <button onClick={onAddZone} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                    <IconPlus className="h-5 w-5" />
                    <span>Nueva zona</span>
                </button>
            </div>
            
             {zones.length === 0 ? (
                <div className="text-center py-10 px-6 border-2 border-dashed dark:border-gray-600 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Aún no tienes zonas creadas</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Empieza por agregar tu primera zona para organizar tus mesas.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                   <ul className="divide-y dark:divide-gray-700">
                        {zones.map(zone => (
                           <li key={zone.id} className="p-4 flex justify-between items-center">
                                <div className="flex-grow">
                                    <input type="text" defaultValue={zone.name} onBlur={(e) => onEditZoneName({ ...zone, name: e.target.value })} className="font-semibold bg-transparent border-none focus:ring-0 p-0 m-0 w-full" />
                                </div>
                                <div className="pr-2">
                                    <ActionMenu zone={zone}/>
                                </div>
                           </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const PrintingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.printing);
    
    useEffect(() => {
        setOriginalSettings(settings.printing)
    }, [settings.printing]);

    const handleCancel = () => {
        setSettings(prev => ({...prev, printing: originalSettings}));
    }

    const methods = [
        { id: PrintingMethod.Native, icon: <IconPrinter/>, description: "Impresión nativa y por defecto del navegador, sin configuración adicional.", tag: null },
        { id: PrintingMethod.Bluetooth, icon: <IconBluetooth/>, description: "Conexión inalámbrica mediante Bluetooth.", tag: "Impresión automática" },
        { id: PrintingMethod.USB, icon: <IconUSB/>, description: "Conexión mediante cable USB. Requiere instalar el driver. Solo disponible para computadoras o laptops.", tag: "Impresión automática" },
    ];
    
    return (
        <div className="space-y-6">
            <SettingsCard title="Método de impresión" onSave={onSave} onCancel={handleCancel}>
                <div className="space-y-3">
                    {methods.map(method => (
                        <button key={method.id} onClick={() => setSettings(p => ({...p, printing: { method: method.id } }))} className={`w-full text-left p-4 border-2 rounded-lg flex items-start gap-4 transition-all ${settings.printing.method === method.id ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                            <div className={`flex-shrink-0 ${settings.printing.method === method.id ? 'text-green-600' : 'text-gray-500'}`}>{method.icon}</div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold">{method.id}</h4>
                                    {method.tag && <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{method.tag}</span>}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{method.description}</p>
                            </div>
                            {settings.printing.method === method.id && <IconCheck className="h-6 w-6 text-green-500 flex-shrink-0"/>}
                        </button>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
};

const ZoneEditor: React.FC<{
    initialZone: Zone;
    onSave: (zone: Zone) => void;
    onExit: () => void;
}> = ({ initialZone, onSave, onExit }) => {
    // ... (Same ZoneEditor code)
    const [zone, setZone] = useState(initialZone);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const selectedTable = useMemo(() => zone.tables.find(t => t.id === selectedTableId), [zone.tables, selectedTableId]);

    const isCellOccupied = (row: number, col: number, tableIdToIgnore: string | null = null): boolean => {
        return zone.tables.some(table => {
            if (table.id === tableIdToIgnore) return false;
            return row >= table.row && row < table.row + table.height &&
                   col >= table.col && col < table.col + table.width;
        });
    };
    
    const handleTableUpdate = (updatedTable: Table) => {
        // Check for collisions before updating state
        for (let r = 0; r < updatedTable.height; r++) {
            for (let c = 0; c < updatedTable.width; c++) {
                if (isCellOccupied(updatedTable.row + r, updatedTable.col + c, updatedTable.id)) {
                    alert("La mesa no puede superponerse con otra existente.");
                    return; // Abort update
                }
            }
        }

        setZone(prevZone => ({
            ...prevZone,
            tables: prevZone.tables.map(t => t.id === updatedTable.id ? updatedTable : t),
        }));
    };
    
    const addTable = (row: number, col: number) => {
        if (isCellOccupied(row, col)) return;

        const newTable: Table = {
            id: crypto.randomUUID(), // Use standard UUID generator for Supabase compatibility
            zoneId: zone.id,
            name: (zone.tables.length + 1).toString(),
            row,
            col,
            width: 1,
            height: 1,
            shape: 'square',
            status: 'available',
        };

        setZone(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
        setSelectedTableId(newTable.id);
    };
    
    const deleteTable = (tableId: string) => {
         setZone(prev => ({
            ...prev,
            tables: prev.tables.filter(t => t.id !== tableId)
        }));
        setSelectedTableId(null);
    }
    
    const TableEditorSidebar: React.FC<{
        table: Table;
        onUpdate: (table: Table) => void;
        onDelete: (tableId: string) => void;
        onClose: () => void;
    }> = ({ table, onUpdate, onDelete, onClose }) => {
        if (!table) return null;
        return (
            <div className="absolute top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-lg z-20 flex flex-col p-4 border-r dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onClose} className="flex items-center text-sm font-semibold">
                       <IconArrowLeft className="h-4 w-4 mr-1"/> Mesa {table.name}
                    </button>
                </div>
                 <div className="space-y-4 flex-grow">
                     <div>
                        <label className="text-sm font-medium">Identificador</label>
                        <input type="text" value={table.name} onChange={e => onUpdate({...table, name: e.target.value})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Forma</label>
                        <select value={table.shape} onChange={e => onUpdate({...table, shape: e.target.value as 'square' | 'round'})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent dark:bg-gray-800">
                            <option value="square">Cuadrada</option>
                            <option value="round">Redonda</option>
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium">Ancho</label>
                            <input type="number" min="1" value={table.width} onChange={e => onUpdate({...table, width: Math.max(1, parseInt(e.target.value) || 1)})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent" />
                        </div>
                         <div>
                            <label className="text-sm font-medium">Altura</label>
                            <input type="number" min="1" value={table.height} onChange={e => onUpdate({...table, height: Math.max(1, parseInt(e.target.value) || 1)})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent"/>
                        </div>
                    </div>
                 </div>
                 <button onClick={() => onDelete(table.id)} className="w-full text-red-600 dark:text-red-400 py-2 text-sm font-semibold border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50">Borrar</button>
            </div>
        );
    }
    

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col">
            <header className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-x-4">
                    <button onClick={onExit} className="flex items-center text-red-600 font-semibold text-sm">
                        <IconLogoutAlt className="h-5 w-5 mr-1 transform rotate-180" />
                        Salir
                    </button>
                    <h2 className="text-xl font-bold">{zone.name}</h2>
                </div>
                <button onClick={() => onSave(zone)} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                    Guardar
                </button>
            </header>
            <div className="flex-1 flex overflow-hidden relative">
                {selectedTable && <TableEditorSidebar table={selectedTable} onUpdate={handleTableUpdate} onDelete={deleteTable} onClose={() => setSelectedTableId(null)}/>}
                
                <main className="flex-1 p-8 overflow-auto bg-gray-100 dark:bg-gray-900" onClick={(e) => { if(e.target === e.currentTarget) setSelectedTableId(null)}}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 w-full min-h-full">
                        <div
                            ref={gridRef}
                            className="grid"
                            style={{
                                gridTemplateColumns: `repeat(${zone.cols}, minmax(60px, 1fr))`,
                                gridTemplateRows: `repeat(${zone.rows}, minmax(60px, 1fr))`,
                                gap: '1rem'
                            }}
                        >
                           {/* Render tables using pure CSS Grid positioning */}
                            {zone.tables.map(table => (
                                <div
                                    key={table.id}
                                    onClick={() => setSelectedTableId(table.id)}
                                    className={`flex items-center justify-center font-bold text-lg text-gray-800 dark:text-gray-100 cursor-pointer border-2 transition-all duration-200
                                        ${table.shape === 'round' ? 'rounded-full' : 'rounded-lg'}
                                        ${selectedTableId === table.id ? 'bg-green-200 border-green-500 dark:bg-green-800 dark:border-green-400 ring-2 ring-green-500' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:border-emerald-400'}`
                                    }
                                    style={{
                                        gridRow: `${table.row} / span ${table.height}`,
                                        gridColumn: `${table.col} / span ${table.width}`,
                                    }}
                                >
                                    {table.name}
                                </div>
                            ))}
                            {/* Render placeholders only in unoccupied cells */}
                            {Array.from({ length: zone.rows * zone.cols }).map((_, index) => {
                                const row = Math.floor(index / zone.cols) + 1;
                                const col = (index % zone.cols) + 1;
                                if (isCellOccupied(row, col)) return null;
                                return (
                                    <div
                                        key={`cell-${row}-${col}`}
                                        onClick={() => addTable(row, col)}
                                        className="bg-gray-100 dark:bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-100 hover:text-green-600 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400"
                                        style={{ gridRow: row, gridColumn: col }}
                                    >
                                        <IconPlus className="h-6 w-6"/>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onEditZoneLayout: (zone: Zone) => void;
    initialPage?: SettingsPage;
}> = ({ isOpen, onClose, onEditZoneLayout, initialPage = 'general' }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [activePage, setActivePage] = useState<SettingsPage>(initialPage);
    const [zones, setZones] = useState<Zone[]>([]);

    useEffect(() => {
        if (isOpen) {
            setActivePage(initialPage);
            getAppSettings().then(setSettings);
            fetchData();
        }
    }, [isOpen, initialPage]);

    const handleSaveSettings = async () => {
        if (!settings) return;
        try {
            await saveAppSettings(settings);
            alert("¡Configuración guardada!");
        } catch (error) {
            alert("Error al guardar la configuración.");
            console.error(error);
        }
    };

    const fetchData = async () => {
        try {
            const data = await getZones();
            setZones(data);
        } catch (err) {
            console.error('Failed to load zones.', err);
        }
    };

    const handleAddZone = async () => {
        const name = prompt("Enter new zone name:");
        if (name) {
            await saveZone({ name, rows: 5, cols: 5 });
            fetchData();
        }
    };

    const handleEditZoneName = async (zone: Zone) => {
        if (zone.name.trim() === '') return;
        await saveZone({ id: zone.id, name: zone.name, rows: zone.rows, cols: zone.cols });
        fetchData();
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (window.confirm("Are you sure you want to delete this zone and all its tables?")) {
            await deleteZone(zoneId);
            fetchData();
        }
    };

    const handleEditLayout = (zone: Zone) => {
        onEditZoneLayout(zone);
        // Don't close modal here, let parent handle it to switch views smoothly
    };
    
    if (!isOpen || !settings) return null;

    const navItems: { id: SettingsPage; name: string; icon: React.ReactNode }[] = [
        { id: 'general', name: 'General', icon: <IconSettings /> },
        { id: 'store-data', name: 'Datos de la tienda', icon: <IconStore /> },
        { id: 'shipping-costs', name: 'Costos de envío', icon: <IconDelivery /> },
        { id: 'payment-methods', name: 'Métodos de pago', icon: <IconPayment /> },
        { id: 'hours', name: 'Horarios', icon: <IconClock /> },
        { id: 'zones-tables', name: 'Zonas y mesas', icon: <IconTableLayout /> },
        { id: 'printing', name: 'Impresión', icon: <IconPrinter /> },
    ];

    const renderPage = () => {
        switch (activePage) {
            case 'general': return <GeneralSettings onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            case 'store-data': return <BranchSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            case 'shipping-costs': return <ShippingSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            case 'payment-methods': return <PaymentSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            case 'hours': return <HoursSettings onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            case 'zones-tables': return <ZonesAndTablesSettings zones={zones} onAddZone={handleAddZone} onEditZoneName={handleEditZoneName} onDeleteZone={handleDeleteZone} onEditZoneLayout={handleEditLayout} />;
            case 'printing': return <PrintingSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings as React.Dispatch<React.SetStateAction<AppSettings>>} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-end">
            <div className="bg-white dark:bg-gray-900 h-full w-full max-w-5xl flex flex-col relative">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-x-4">
                        <h2 className="text-xl font-bold">Configuración</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><IconX /></button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-64 border-r dark:border-gray-700 p-4">
                        <nav className="space-y-1">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-md text-sm font-medium ${activePage === item.id ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    {item.icon}
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                        {renderPage()}
                    </main>
                </div>
            </div>
        </div>
    );
};

const QRModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
    filename: string;
}> = ({ isOpen, onClose, url, title, filename }) => {
    if (!isOpen) return null;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to download QR code:", error);
            alert("No se pudo descargar el código QR.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-sm text-center p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Escanea este código para abrir el menú.</p>
                <div className="flex justify-center">
                    <img src={qrUrl} alt={title} className="w-64 h-64 rounded-lg border-4 border-white dark:border-gray-700" />
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button onClick={handleDownload} className="w-full px-4 py-3 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                        Descargar QR
                    </button>
                    <button onClick={onClose} className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShareView: React.FC<{ onGoToTableSettings: () => void }> = ({ onGoToTableSettings }) => {
    const [activeTab, setActiveTab] = useState<'domicilio' | 'mesas' | 'multi-sucursal'>('domicilio');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrModalData, setQrModalData] = useState({ url: '', title: '', filename: '' });
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [appSettings, zoneData] = await Promise.all([
                    getAppSettings(),
                    getZones()
                ]);
                setSettings(appSettings);
                setZones(zoneData);
                if (zoneData.length === 0) {
                    console.warn("No zones found in database for ShareView.");
                }
            } catch (error) {
                console.error("Failed to load share data in AdminView:", error);
                alert("Error al cargar las zonas y mesas. Revisa la conexión.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Enlace copiado al portapapeles");
        });
    };
    
    const openQrModal = (url: string, title: string, filename: string) => {
        setQrModalData({ url, title, filename });
        setIsQrModalOpen(true);
    };

    if (isLoading || !settings) {
         return <div className="p-10 text-center">Cargando opciones de compartir...</div>;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const menuLink = `${baseUrl}#/menu`;

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Comparte tu menú digital</h2>
                <div className="flex items-center gap-4">
                    <input type="text" readOnly value={menuLink} className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-sm focus:ring-0"/>
                    <button onClick={() => copyToClipboard(menuLink)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition-colors">Copiar</button>
                    <button onClick={() => openQrModal(menuLink, "Código QR del Menú", "menu-qr.png")} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                        <IconQR className="h-5 w-5"/> QR
                    </button>
                    <a href={menuLink} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                        <IconExternalLink className="h-5 w-5"/> Abrir
                    </a>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('domicilio')} className={`${activeTab === 'domicilio' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Domicilios y Recoger</button>
                    <button onClick={() => setActiveTab('mesas')} className={`${activeTab === 'mesas' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Mesas (Dine-in)</button>
                    <button onClick={() => setActiveTab('multi-sucursal')} className={`${activeTab === 'multi-sucursal' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Multi-sucursal</button>
                </nav>
            </div>

            {activeTab === 'domicilio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center text-center hover:border-emerald-500 transition-colors cursor-pointer group" onClick={() => copyToClipboard(menuLink)}>
                         <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <IconDelivery className="h-8 w-8"/>
                         </div>
                         <h3 className="font-bold text-lg mb-2">Enlace para Domicilios</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Comparte este enlace en tus redes sociales (Instagram, Facebook) y perfil de WhatsApp Business.</p>
                         <span className="text-emerald-600 font-semibold text-sm">Click para copiar</span>
                    </div>
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center text-center hover:border-emerald-500 transition-colors cursor-pointer group" onClick={() => copyToClipboard(menuLink)}>
                         <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <IconStore className="h-8 w-8"/>
                         </div>
                         <h3 className="font-bold text-lg mb-2">Enlace para Recoger</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ideal para clientes que quieren ordenar antes de llegar a tu local.</p>
                         <span className="text-emerald-600 font-semibold text-sm">Click para copiar</span>
                    </div>
                </div>
            )}
            
            {activeTab === 'mesas' && (
                <div className="space-y-6">
                    {zones.length === 0 ? (
                         <div className="text-center py-10 px-6 border-2 border-dashed dark:border-gray-600 rounded-lg">
                            <IconTableLayout className="h-10 w-10 mx-auto text-gray-400 mb-3"/>
                            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">No tienes mesas configuradas</h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">Configura tus zonas y mesas primero para generar sus códigos QR.</p>
                            <button onClick={onGoToTableSettings} className="text-emerald-600 font-semibold hover:underline">Ir a configuración de mesas</button>
                        </div>
                    ) : (
                        zones.map(zone => (
                            <div key={zone.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                                <h3 className="font-bold text-lg mb-4 border-b dark:border-gray-700 pb-2">{zone.name}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {zone.tables.map(table => {
                                        const tableUrl = `${menuLink}?table=${table.name}&zone=${zone.name}`;
                                        return (
                                            <div key={table.id} className="border dark:border-gray-600 rounded-lg p-4 text-center hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-900/50">
                                                <p className="font-bold text-lg mb-2">{table.name}</p>
                                                <button 
                                                    onClick={() => openQrModal(tableUrl, `Mesa ${table.name} - ${zone.name}`, `qr-${zone.name}-${table.name}.png`)}
                                                    className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    Ver QR
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'multi-sucursal' && (
                 <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto h-16 w-16 text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <IconStore className="h-10 w-10" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Gestión Multi-sucursal</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Próximamente podrás gestionar múltiples sucursales y generar enlaces únicos para cada una.</p>
                </div>
            )}

            <QRModal 
                isOpen={isQrModalOpen} 
                onClose={() => setIsQrModalOpen(false)} 
                url={qrModalData.url} 
                title={qrModalData.title} 
                filename={qrModalData.filename}
            />
            
            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-fade-in-up">
                    <IconCheck className="h-5 w-5 text-emerald-400"/>
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // Placeholder for preview modal logic
    const [theme, toggleTheme] = useTheme();
    
    // State for Zone Editor Logic
    const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
    const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);

    const openTableSettings = () => {
        setIsSettingsOpen(true);
        // In a real app, pass initialPage='zones-tables' prop to SettingsModal
    };
    
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
            setIsSettingsOpen(true); // Return to settings
        } catch (error) {
            alert("Error al guardar la distribución: " + error);
        }
    };

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
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    title={PAGE_TITLES[currentPage]} 
                    onSettingsClick={() => setIsSettingsOpen(true)} 
                    onPreviewClick={() => setIsPreviewOpen(true)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
                <main className="flex-1 overflow-auto p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                </main>
            </div>
            
            {isZoneEditorOpen && zoneToEdit && (
                <ZoneEditor 
                    initialZone={zoneToEdit}
                    onSave={handleSaveZoneLayout}
                    onExit={() => {
                        setIsZoneEditorOpen(false);
                        setZoneToEdit(null);
                        setIsSettingsOpen(true);
                    }}
                />
            )}
            
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                onEditZoneLayout={handleEditZoneLayout}
            />
        </div>
    );
};

export default AdminView;
