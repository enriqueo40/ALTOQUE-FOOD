
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod as AppPaymentMethod } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES, getCurrencySymbol } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff, IconToggleOn, FadeInImage } from '../constants';

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
                Ventas: {whatsappNumber}
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
                personalizationIds: []
            });
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
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const refreshData = async () => {
        const [p, c] = await Promise.all([getProducts(true), getCategories(true)]);
        setProducts(p);
        setCategories(c);
    };

    useEffect(() => { refreshData(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-4">
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="px-4 py-2 border rounded hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">Nueva Categoría</button>
                <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Nuevo Producto</button>
            </div>
            
            {categories.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                        <h3 className="font-bold text-lg dark:text-white">{cat.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="text-gray-500 hover:text-emerald-600"><IconEdit/></button>
                            <button onClick={() => { if(confirm('¿Eliminar categoría?')) deleteCategory(cat.id).then(refreshData); }} className="text-gray-500 hover:text-red-600"><IconTrash/></button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {products.filter(p => p.categoryId === cat.id).map(p => (
                            <ProductListItem 
                                key={p.id} 
                                product={p} 
                                onEdit={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                onDelete={() => { if(confirm('¿Eliminar producto?')) deleteProduct(p.id).then(refreshData); }}
                                onDuplicate={() => { const { id, ...rest } = p; saveProduct({...rest, name: `${rest.name} (Copia)`}).then(refreshData); }}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={(p) => saveProduct(p).then(refreshData)} product={editingProduct} categories={categories} />
            <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={(c) => saveCategory(c).then(refreshData)} category={editingCategory} />
        </div>
    );
};

const PersonalizationModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (p: any) => void, personalization: Personalization | null, products: Product[]}> = ({isOpen, onClose, onSave, personalization, products}) => {
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [allowRepetition, setAllowRepetition] = useState(false);
    const [options, setOptions] = useState([{name: '', price: 0}]);
    const [minSelection, setMinSelection] = useState(0);
    const [maxSelection, setMaxSelection] = useState<number | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'config' | 'products'>('config');

    const inputClasses = "w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-[#2d3748] border-[#4a5568] text-white";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";

    useEffect(() => {
        if(isOpen) {
            setName(personalization?.name || '');
            setLabel(personalization?.label || '');
            setAllowRepetition(personalization?.allowRepetition || false);
            setOptions(personalization?.options || [{name: '', price: 0}]);
            setMinSelection(personalization?.minSelection || 0);
            setMaxSelection(personalization?.maxSelection ?? 1);
            setSelectedProductIds(personalization?.productIds || []);
            setActiveTab('config');
        }
    }, [isOpen, personalization]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: personalization?.id, name, label, options, allowRepetition, minSelection, maxSelection, productIds: selectedProductIds });
        onClose();
    }

    const toggleProduct = (pId: string) => {
        setSelectedProductIds(prev => prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1a202c] dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-lg shadow-2xl flex overflow-hidden border border-gray-700">
                <div className="w-2/3 flex flex-col border-r border-gray-700">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">{personalization ? 'Editar' : 'Agregar'} Personalización</h3>
                        <div className="flex gap-2">
                             <button onClick={() => setActiveTab('config')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'config' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Configuración</button>
                             <button onClick={() => setActiveTab('products')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'products' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Productos ({selectedProductIds.length})</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'config' ? (
                            <form className="space-y-6">
                                <div><label className={labelClasses}>Nombre</label><input className={inputClasses} value={name} onChange={e => setName(e.target.value)} required /></div>
                                <div><label className={labelClasses}>Etiqueta (Interna)</label><input className={inputClasses} value={label} onChange={e => setLabel(e.target.value)} /></div>
                                <div>
                                    <label className={labelClasses}>Opciones</label>
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 items-center mb-2">
                                            <input className={inputClasses} value={opt.name} onChange={e => { const n = [...options]; n[idx].name = e.target.value; setOptions(n); }} placeholder="Nombre" />
                                            <input className={`w-24 ${inputClasses}`} type="number" value={opt.price} onChange={e => { const n = [...options]; n[idx].price = parseFloat(e.target.value); setOptions(n); }} placeholder="Price" />
                                            <button type="button" onClick={() => { if(options.length>1) setOptions(options.filter((_,i)=>i!==idx)) }} className="text-red-500"><IconTrash/></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setOptions([...options, {name:'', price:0}])} className="text-emerald-500 text-sm font-bold flex items-center gap-1"><IconPlus className="h-4 w-4"/> Agregar opción</button>
                                </div>
                                <div className="flex gap-4">
                                    <div><label className={labelClasses}>Mínimo</label><input type="number" className={inputClasses} value={minSelection} onChange={e => setMinSelection(parseInt(e.target.value))}/></div>
                                    <div><label className={labelClasses}>Máximo</label><input type="number" className={inputClasses} value={maxSelection || ''} onChange={e => setMaxSelection(e.target.value ? parseInt(e.target.value) : null)} placeholder="Sin limite"/></div>
                                </div>
                            </form>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {products.map(p => (
                                    <div key={p.id} onClick={() => toggleProduct(p.id)} className={`p-3 rounded border cursor-pointer flex justify-between ${selectedProductIds.includes(p.id) ? 'bg-emerald-900/30 border-emerald-500' : 'bg-[#2d3748] border-gray-600'}`}>
                                        <span className="text-gray-200">{p.name}</span>
                                        {selectedProductIds.includes(p.id) && <IconCheck className="text-emerald-500"/>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-[#1a202c]">
                        <button onClick={onClose} className="px-6 py-2.5 rounded border border-gray-600 text-gray-300">Cancelar</button>
                        <button onClick={handleSubmit} className="px-6 py-2.5 rounded bg-emerald-600 text-white font-bold">Guardar</button>
                    </div>
                </div>
                <div className="w-1/3 bg-[#171923] p-8 border-l border-gray-800"><h4 className="text-white font-bold mb-4">Vista Previa</h4><div className="bg-[#2d3748] rounded p-4 border border-gray-700"><h5 className="font-bold text-white">{name || 'Titulo'}</h5>{options.map((o,i) => <div key={i} className="text-gray-400 text-sm mt-2 flex justify-between"><span>{o.name || `Opción ${i+1}`}</span><span>+${o.price}</span></div>)}</div></div>
            </div>
        </div>
    );
};

const PersonalizationsView: React.FC = () => {
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingP, setEditingP] = useState<Personalization | null>(null);

    const refresh = async () => {
        const [pers, prods] = await Promise.all([getPersonalizations(true), getProducts(true)]);
        setPersonalizations(pers);
        setProducts(prods);
    };
    useEffect(() => { refresh(); }, []);

    return (
        <div>
            <div className="flex justify-end mb-4"><button onClick={() => { setEditingP(null); setIsModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Nueva Personalización</button></div>
            <div className="grid gap-3">
                {personalizations.map(p => (
                    <div key={p.id} className="p-4 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 flex justify-between items-center">
                        <div>
                            <span className="font-bold dark:text-white block">{p.name}</span>
                            <span className="text-xs text-gray-500">{p.options.length} opciones • En {p.productIds?.length || 0} productos</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingP(p); setIsModalOpen(true); }} className="text-gray-500"><IconEdit/></button>
                            <button onClick={() => { if(confirm('¿Borrar?')) deletePersonalization(p.id).then(refresh); }} className="text-red-500"><IconTrash/></button>
                        </div>
                    </div>
                ))}
            </div>
            <PersonalizationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(p) => savePersonalization(p).then(refresh)} personalization={editingP} products={products} />
        </div>
    );
};

const PromotionsView: React.FC = () => <div className="text-center p-10 dark:text-gray-400">Promociones (Próximamente)</div>;

const MenuManagement: React.FC = () => {
    const [tab, setTab] = useState('products');
    return (
        <div>
            <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setTab('products')} className={`pb-3 font-medium text-sm ${tab === 'products' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Productos</button>
                <button onClick={() => setTab('personalizations')} className={`pb-3 font-medium text-sm ${tab === 'personalizations' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Personalizaciones</button>
                <button onClick={() => setTab('promotions')} className={`pb-3 font-medium text-sm ${tab === 'promotions' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>Promociones</button>
            </div>
            {tab === 'products' && <ProductsView />}
            {tab === 'personalizations' && <PersonalizationsView />}
            {tab === 'promotions' && <PromotionsView />}
        </div>
    );
};

const Dashboard: React.FC<{ currencySymbol: string }> = ({ currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    useEffect(() => { getActiveOrders().then(setOrders); }, []);
    const total = orders.reduce((s, o) => s + o.total, 0);
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700">
                <h3 className="text-gray-500 text-sm font-bold uppercase">Ventas Hoy</h3>
                <p className="text-3xl font-bold dark:text-white mt-2">{currencySymbol}{total.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700">
                <h3 className="text-gray-500 text-sm font-bold uppercase">Pedidos</h3>
                <p className="text-3xl font-bold dark:text-white mt-2">{orders.length}</p>
            </div>
        </div>
    );
};

const OrderManagement: React.FC<{ onSettingsClick: () => void; currencySymbol: string }> = ({ currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    useEffect(() => { getActiveOrders().then(setOrders); subscribeToNewOrders((o) => setOrders(prev => [o, ...prev])); return () => unsubscribeFromChannel(); }, []);
    return (
        <div className="h-full overflow-y-auto">
            {orders.map(o => (
                <div key={o.id} className="bg-white dark:bg-gray-800 p-4 mb-3 rounded shadow border dark:border-gray-700">
                    <div className="flex justify-between">
                        <span className="font-bold dark:text-white">#{o.id.slice(0,4)} - {o.customer.name}</span>
                        <span className="font-bold text-emerald-600">{currencySymbol}{o.total.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{o.status} • {o.orderType}</div>
                </div>
            ))}
        </div>
    );
};

const Analytics: React.FC = () => {
    const [q, setQ] = useState('');
    const [res, setRes] = useState('');
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="font-bold text-xl mb-4 dark:text-white">Analítica IA</h2>
            <div className="flex gap-2"><input className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white" value={q} onChange={e => setQ(e.target.value)} /><button onClick={() => getAdvancedInsights(q, []).then(setRes)} className="bg-emerald-600 text-white px-4 rounded">Go</button></div>
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded whitespace-pre-wrap dark:text-gray-300">{res}</div>
        </div>
    );
};

const AvailabilityView: React.FC = () => <div className="text-center p-10 dark:text-gray-400">Disponibilidad (Próximamente)</div>;
const ShareView: React.FC<{ onGoToTableSettings: () => void }> = () => <div className="text-center p-10 dark:text-gray-400">Compartir (Próximamente)</div>;
const ZoneEditor: React.FC<any> = ({ onExit }) => <div className="fixed inset-0 bg-white z-50 p-10"><button onClick={onExit}>Exit</button>Zone Editor Placeholder</div>;
const SettingsModal: React.FC<any> = ({ isOpen, onClose }) => isOpen ? <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center"><div className="bg-white p-10 rounded">Settings <button onClick={onClose}>Close</button></div></div> : null;

const AdminView: React.FC = () => {
    const [page, setPage] = useState<AdminViewPage>('dashboard');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();

    useEffect(() => { getAppSettings().then(setSettings); }, []);
    
    const currencySymbol = getCurrencySymbol(settings);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar currentPage={page} setCurrentPage={setPage} whatsappNumber={settings?.branch?.whatsappNumber || ''} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header title={PAGE_TITLES[page]} onSettingsClick={() => setIsSettingsOpen(true)} onPreviewClick={() => {}} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900/50">
                    <div className="max-w-7xl mx-auto">
                        {page === 'dashboard' && <Dashboard currencySymbol={currencySymbol} />}
                        {page === 'products' && <MenuManagement />}
                        {page === 'orders' && <OrderManagement onSettingsClick={() => setIsSettingsOpen(true)} currencySymbol={currencySymbol} />}
                        {page === 'analytics' && <Analytics />}
                        {page === 'availability' && <AvailabilityView />}
                        {page === 'share' && <ShareView onGoToTableSettings={() => setIsSettingsOpen(true)} />}
                        {page === 'messages' && <div className="text-center p-10">Mensajes (Próximamente)</div>}
                        {page === 'tutorials' && <div className="text-center p-10">Tutoriales (Próximamente)</div>}
                    </div>
                </main>
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onEditZoneLayout={() => {}} />
        </div>
    );
};

export default AdminView;
