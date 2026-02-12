
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod as AppPaymentMethod } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES, getCurrencySymbol } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder, subscribeToMenuUpdates } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff, IconToggleOn, FadeInImage } from '../constants';

const IconEye: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className={className} />;

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'analytics' | 'messages' | 'availability' | 'share' | 'tutorials';

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

// --- Modal de Personalización Mejorado ---
const PersonalizationModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (p: any) => void, personalization: Personalization | null, products: Product[]}> = ({isOpen, onClose, onSave, personalization, products}) => {
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [options, setOptions] = useState([{name: '', price: 0}]);
    const [allowRepetition, setAllowRepetition] = useState(false);
    const [minSelection, setMinSelection] = useState(0);
    const [maxSelection, setMaxSelection] = useState<number | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'config' | 'products'>('config');

    const inputClasses = "w-full p-2.5 border rounded-lg bg-[#212b36] border-[#374151] text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder-gray-500 text-sm transition-all";
    const labelClasses = "block text-sm font-semibold text-gray-300 mb-1";
    const helperClasses = "text-[11px] text-gray-500 mb-3 block";

    useEffect(() => {
        if(isOpen) {
            setName(personalization?.name || '');
            setLabel(personalization?.label || '');
            setOptions(personalization?.options?.length ? personalization.options : [{name: '', price: 0}]);
            setAllowRepetition(personalization?.allowRepetition || false);
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1c2431] dark:bg-[#1c2431] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-800">
                
                {/* IZQUIERDA: FORMULARIO */}
                <div className="w-2/3 flex flex-col border-r border-gray-800">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1c2431]">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                             {personalization ? 'Editar' : 'Agregar'} una personalización
                        </h3>
                         <div className="flex bg-[#0f172a] rounded-lg p-1">
                            <button onClick={() => setActiveTab('config')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'config' ? 'bg-[#212b36] text-white shadow-sm' : 'text-gray-500'}`}>Configuración</button>
                            <button onClick={() => setActiveTab('products')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'products' ? 'bg-[#212b36] text-white shadow-sm' : 'text-gray-500'}`}>Productos ({selectedProductIds.length})</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'config' ? (
                            <form id="pers-form" onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                                <div>
                                    <label className={labelClasses}>Nombre de personalización</label>
                                    <span className={helperClasses}>Instrucciones para el cliente (Ej: Elige tu sabor).</span>
                                    <input className={inputClasses} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: ¿Qué sabor prefieres?" required />
                                </div>

                                <div>
                                    <label className={labelClasses}>Etiqueta distintiva</label>
                                    <span className={helperClasses}>Uso interno, no es visible para tus clientes.</span>
                                    <input className={inputClasses} value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Sabores Helados" />
                                </div>

                                <div>
                                    <label className={labelClasses}>Opciones</label>
                                    <span className={helperClasses}>Ingredientes, extras, aderezos, etc.</span>
                                    <div className="space-y-3">
                                        {options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 items-center group">
                                                <div className="w-6 text-gray-600 text-xs font-bold">{idx + 1}.</div>
                                                <input className={`${inputClasses} flex-1`} placeholder="Nombre" value={opt.name} onChange={e => {
                                                    const newOpts = [...options]; newOpts[idx].name = e.target.value; setOptions(newOpts);
                                                }} required />
                                                <div className="relative w-32">
                                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                                    <input className={`${inputClasses} pl-7`} type="number" placeholder="0" value={opt.price} onChange={e => {
                                                        const newOpts = [...options]; newOpts[idx].price = parseFloat(e.target.value); setOptions(newOpts);
                                                    }} required />
                                                </div>
                                                <button type="button" onClick={() => { if(options.length > 1) setOptions(options.filter((_, i) => i !== idx)) }} className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><IconTrash className="h-4 w-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setOptions([...options, {name: '', price: 0}])} className="mt-4 text-emerald-500 text-sm font-bold flex items-center gap-1 hover:text-emerald-400 transition-colors">
                                        <IconPlus className="h-4 w-4"/> Agregar otro opción
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-gray-800">
                                    <label className={labelClasses}>Permitir repetición de opciones</label>
                                    <div className="flex bg-[#0f172a] w-fit rounded-lg p-1 border border-gray-700 mt-2">
                                        <button type="button" onClick={() => setAllowRepetition(false)} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${!allowRepetition ? 'bg-[#212b36] text-white' : 'text-gray-500'}`}>No</button>
                                        <button type="button" onClick={() => setAllowRepetition(true)} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${allowRepetition ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>Sí</button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClasses}>Cantidad que se podrá seleccionar</label>
                                    <div className="flex gap-4 mt-3">
                                        <div className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl p-3 flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mínimo</span>
                                            <input type="number" min="0" value={minSelection} onChange={e => setMinSelection(parseInt(e.target.value) || 0)} className="bg-transparent text-white w-16 text-right outline-none font-bold" />
                                        </div>
                                        <div className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl p-3 flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Máximo</span>
                                            <input type="number" min="1" value={maxSelection || ''} onChange={e => setMaxSelection(e.target.value ? parseInt(e.target.value) : null)} placeholder="Sin límite" className="bg-transparent text-white w-20 text-right outline-none font-bold placeholder-gray-700" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-gray-400 mb-6 bg-blue-900/10 p-3 rounded-lg border border-blue-900/20">Selecciona los productos que ofrecerán estas opciones de personalización:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {products.map(p => (
                                        <div key={p.id} onClick={() => toggleProduct(p.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${selectedProductIds.includes(p.id) ? 'bg-emerald-900/20 border-emerald-500' : 'bg-[#212b36] border-gray-800 hover:border-gray-600'}`}>
                                            <div className="flex items-center gap-3">
                                                <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                                                <span className="text-sm font-bold text-gray-200">{p.name}</span>
                                            </div>
                                            {selectedProductIds.includes(p.id) && <IconCheck className="h-5 w-5 text-emerald-500"/>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#1c2431]">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:bg-[#212b36] font-bold text-sm transition-all">Cancelar</button>
                        <button onClick={handleSubmit} className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all">
                             {personalization ? 'Guardar cambios' : 'Agregar personalización'}
                        </button>
                    </div>
                </div>

                {/* DERECHA: VISTA PREVIA */}
                <div className="w-1/3 bg-[#0f172a] p-8 flex flex-col border-l border-gray-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    <h4 className="text-white font-bold mb-2 text-lg">Vista previa</h4>
                    <p className="text-gray-500 text-xs mb-10 leading-relaxed font-medium">La vista previa aparecerá aquí a medida que completes el formulario.</p>
                    
                    <div className="bg-[#1c2431] rounded-2xl p-6 border border-gray-800 shadow-2xl relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h5 className="font-bold text-white text-md uppercase tracking-tight">{name || 'Instrucción'}</h5>
                                <p className="text-[10px] text-emerald-500 font-black tracking-[0.2em] mt-1">
                                    {minSelection > 0 ? 'OBLIGATORIO' : 'OPCIONAL'}
                                </p>
                            </div>
                            <div className="bg-gray-800 px-2 py-0.5 rounded text-[9px] text-gray-400 font-bold uppercase">
                                {maxSelection === 1 ? 'Elige 1' : `Máx ${maxSelection || '∞'}`}
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            {options.map((opt, i) => (
                                <div key={i} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 border-2 rounded-full border-gray-700 flex items-center justify-center transition-all ${i === 0 ? 'border-emerald-500' : ''}`}>
                                             {i === 0 && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>}
                                        </div>
                                        <span className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{opt.name || `Opción ${i+1}`}</span>
                                    </div>
                                    {opt.price > 0 && <span className="text-xs font-black text-emerald-500">+${opt.price}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-auto text-center">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Simulación visual para el cliente</p>
                    </div>
                </div>
            </div>
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
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="px-4 py-2 border dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 font-bold text-sm transition-all">Nueva Categoría</button>
                <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all">Nuevo Producto</button>
            </div>
            
            {categories.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">
                        <div className="flex items-center gap-3">
                            <IconGripVertical className="text-gray-400"/>
                            <h3 className="font-black text-lg dark:text-white uppercase tracking-tight">{cat.name}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"><IconEdit className="h-5 w-5"/></button>
                            <button onClick={() => { if(confirm('¿Eliminar categoría?')) deleteCategory(cat.id).then(refreshData); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
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
                        {products.filter(p => p.categoryId === cat.id).length === 0 && <p className="text-center text-gray-500 py-4 text-sm font-medium">No hay productos en esta categoría.</p>}
                    </div>
                </div>
            ))}

            <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={(p) => saveProduct(p).then(refreshData)} product={editingProduct} categories={categories} />
            <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={(c) => saveCategory(c).then(refreshData)} category={editingCategory} />
        </div>
    );
};

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
                personalizationIds: product?.personalizationIds || []
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

    const inputClasses = "mt-1 block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all";

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tight">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Nombre</label>
                        <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClasses} required />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descripción</label>
                            <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1 hover:text-emerald-400 transition-colors">
                                <IconSparkles className="h-3 w-3"/> {isGenerating ? 'IA PENSANDO...' : 'REDACTAR CON IA'}
                            </button>
                        </div>
                        <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClasses} rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Precio</label>
                            <input type="number" value={formData.price || 0} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className={inputClasses} required step="0.01"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Categoría</label>
                            <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className={inputClasses}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">URL Imagen</label>
                        <input type="text" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className={inputClasses} />
                    </div>
                    
                    <div className="border-t dark:border-gray-700 pt-5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Asignar Personalizaciones</label>
                        <div className="max-h-40 overflow-y-auto border dark:border-gray-700 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                            {personalizations.length === 0 && <p className="text-xs text-gray-500 italic p-2">No tienes personalizaciones creadas.</p>}
                            {personalizations.map(p => (
                                <label key={p.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white dark:hover:bg-gray-800 p-2 rounded-lg transition-all">
                                    <input 
                                        type="checkbox" 
                                        checked={(formData.personalizationIds || []).includes(p.id)} 
                                        onChange={() => togglePersonalization(p.id)}
                                        className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-700"
                                    />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{p.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                        <input type="checkbox" checked={formData.available} onChange={e => setFormData({...formData, available: e.target.checked})} className="w-5 h-5 rounded text-emerald-600" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Producto Disponible para Venta</span>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl font-bold text-sm transition-all hover:bg-gray-200">Cancelar</button>
                        <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-700">Guardar Producto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CategoryModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (cat: any) => void; category: Category | null }> = ({ isOpen, onClose, onSave, category }) => {
    const [name, setName] = useState('');
    useEffect(() => { if (isOpen) setName(category?.name || ''); }, [isOpen, category]);
    const inputClasses = "mt-1 block w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm";
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <form onSubmit={(e) => { e.preventDefault(); onSave({ id: category?.id, name }); onClose(); }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tight">{category ? 'Editar' : 'Nueva'} Categoría</h2>
                <div className="mb-8">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Nombre</label>
                    <input className={inputClasses} placeholder="Ej: Postres, Bebidas..." value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl font-bold text-sm transition-all">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg transition-all hover:bg-emerald-700">Guardar</button>
                </div>
            </form>
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
            <div className="flex justify-end mb-6">
                <button onClick={() => { setEditingP(null); setIsModalOpen(true); }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <IconPlus className="h-4 w-4"/> Nueva Personalización
                </button>
            </div>
            <div className="grid gap-4">
                {personalizations.map(p => (
                    <div key={p.id} className="p-5 border dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                <IconMenu className="h-6 w-6"/>
                            </div>
                            <div>
                                <span className="font-black dark:text-white block uppercase tracking-tight">{p.name}</span>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded font-black">{p.options.length} OPCIONES</span>
                                    <span className="text-[10px] text-emerald-500 font-black">• EN {p.productIds?.length || 0} PRODUCTOS</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingP(p); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"><IconEdit className="h-5 w-5"/></button>
                            <button onClick={() => { if(confirm('¿Borrar esta personalización?')) deletePersonalization(p.id).then(refresh); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
                        </div>
                    </div>
                ))}
                {personalizations.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No hay personalizaciones creadas</p>
                    </div>
                )}
            </div>
            <PersonalizationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(p) => savePersonalization(p).then(refresh)} personalization={editingP} products={products} />
        </div>
    );
};

const Dashboard: React.FC<{ currencySymbol: string }> = ({ currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    useEffect(() => { getActiveOrders().then(setOrders); }, []);
    const total = orders.reduce((s, o) => s + o.total, 0);
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Ventas Hoy</h3>
                <p className="text-4xl font-black dark:text-white mt-2">{currencySymbol}{total.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Pedidos</h3>
                <p className="text-4xl font-black dark:text-white mt-2">{orders.length}</p>
            </div>
        </div>
    );
};

// ... Resto de AdminView se mantiene igual para brevedad ...
const OrderManagement: React.FC<{ onSettingsClick: () => void; currencySymbol: string }> = ({ currencySymbol }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    useEffect(() => { getActiveOrders().then(setOrders); subscribeToNewOrders((o) => setOrders(prev => [o, ...prev])); return () => unsubscribeFromChannel(); }, []);
    return (
        <div className="h-full space-y-4">
            {orders.map(o => (
                <div key={o.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 flex justify-between items-center group hover:border-emerald-500/50 transition-all">
                    <div>
                         <div className="flex items-center gap-3">
                            <span className="font-black dark:text-white text-lg">#{o.id.slice(0,4)} — {o.customer.name}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">{o.status}</span>
                         </div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{o.orderType} • {new Date(o.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <span className="font-black text-2xl text-emerald-500">{currencySymbol}{o.total.toFixed(2)}</span>
                </div>
            ))}
        </div>
    );
};

const MenuManagement: React.FC = () => {
    const [tab, setTab] = useState('products');
    return (
        <div>
            <div className="flex gap-8 mb-8 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setTab('products')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all ${tab === 'products' ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>Productos</button>
                <button onClick={() => setTab('personalizations')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all ${tab === 'personalizations' ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>Personalizaciones</button>
                <button onClick={() => setTab('promotions')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all ${tab === 'promotions' ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>Promociones</button>
            </div>
            {tab === 'products' && <ProductsView />}
            {tab === 'personalizations' && <PersonalizationsView />}
            {tab === 'promotions' && <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">Promociones próximamente</div>}
        </div>
    );
};

const AdminView: React.FC = () => {
    const [page, setPage] = useState<AdminViewPage>('dashboard');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();

    useEffect(() => { getAppSettings().then(setSettings); }, []);
    const currencySymbol = getCurrencySymbol(settings);

    if (!settings) return null;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar currentPage={page} setCurrentPage={setPage} whatsappNumber={settings.branch.whatsappNumber} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header title={PAGE_TITLES[page]} onSettingsClick={() => setIsSettingsOpen(true)} onPreviewClick={() => {}} theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-1 overflow-auto p-10 bg-gray-50/50 dark:bg-transparent">
                    <div className="max-w-6xl mx-auto">
                        {page === 'dashboard' && <Dashboard currencySymbol={currencySymbol} />}
                        {page === 'products' && <MenuManagement />}
                        {page === 'orders' && <OrderManagement onSettingsClick={() => setIsSettingsOpen(true)} currencySymbol={currencySymbol} />}
                        {page === 'availability' && <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">Disponibilidad próximamente</div>}
                        {page === 'share' && <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">Compartir próximamente</div>}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminView;
