
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule, DaySchedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconInfo } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Helper Functions ---

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const applicablePromo = promotions.find(p => {
        const now = new Date();
        let startTime = 0;
        if (p.startDate) {
            const [y, m, d] = p.startDate.split('-').map(Number);
            const startDate = new Date(y, m - 1, d);
            startDate.setHours(0, 0, 0, 0);
            startTime = startDate.getTime();
        }
        let endTime = Infinity;
        if (p.endDate) {
            const [y, m, d] = p.endDate.split('-').map(Number);
            const endDate = new Date(y, m - 1, d);
            endDate.setHours(23, 59, 59, 999);
            endTime = endDate.getTime();
        }
        const nowTime = now.getTime();
        if (nowTime < startTime) return false;
        if (nowTime > endTime) return false;
        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds.includes(product.id);
    });
    if (!applicablePromo) return { price: product.price, promotion: null };
    let discount = 0;
    if (applicablePromo.discountType === DiscountType.Percentage) {
        discount = product.price * (applicablePromo.discountValue / 100);
    } else {
        discount = applicablePromo.discountValue;
    }
    return { price: Math.max(0, product.price - discount), promotion: applicablePromo };
};

const checkIfOpen = (schedules: Schedule[]) => {
    if (!schedules || schedules.length === 0) return true;
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = days[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Check general schedule
    const general = schedules.find(s => s.id === 'general') || schedules[0];
    const today = general.days.find(d => d.day === currentDayName);

    if (!today || !today.isOpen) return false;
    if (today.shifts.length === 0) return true; // Open 24h if no shifts defined but isOpen

    return today.shifts.some(shift => {
        const [hStart, mStart] = shift.start.split(':').map(Number);
        const [hEnd, mEnd] = shift.end.split(':').map(Number);
        const start = hStart * 60 + mStart;
        const end = hEnd * 60 + mEnd;
        return currentTime >= start && currentTime <= end;
    });
};

// --- Sub-Components ---

const StoreInfoModal: React.FC<{ settings: AppSettings; onClose: () => void }> = ({ settings, onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">Información</h3>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><IconX/></button>
            </div>
            <div className="p-6 space-y-6">
                <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Ubicación</h4>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><IconLocationMarker className="h-5 w-5"/></div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{settings.branch.fullAddress || 'Dirección no disponible'}</p>
                            {settings.branch.googleMapsLink && (
                                <a href={settings.branch.googleMapsLink} target="_blank" className="text-sm text-emerald-600 font-bold hover:underline">Ver en el mapa</a>
                            )}
                        </div>
                    </div>
                </section>
                <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Horarios de atención</h4>
                    <div className="space-y-2">
                        {settings.schedules[0].days.map(d => (
                            <div key={d.day} className="flex justify-between text-sm">
                                <span className={`font-medium ${new Date().toLocaleDateString('es-ES', {weekday: 'long'}).toLowerCase() === d.day.toLowerCase() ? 'text-emerald-600 font-bold' : 'text-gray-500'}`}>{d.day}</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                    {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : '24 Horas') : 'Cerrado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    </div>
);

// --- Main View Component ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const fetchMenuData = useCallback(async () => {
        try {
            const [appSettings, fetchedPromotions, fetchedPersonalizations, fetchedProducts, fetchedCategories] = await Promise.all([
                getAppSettings(),
                getPromotions(),
                getPersonalizations(),
                getProducts(),
                getCategories()
            ]);
            setSettings(appSettings);
            setAllPromotions(fetchedPromotions);
            setAllProducts(fetchedProducts);
            setAllCategories(fetchedCategories);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenuData();
        subscribeToMenuUpdates(fetchMenuData);
        return () => { unsubscribeFromChannel(); };
    }, [fetchMenuData]);

    const filteredProducts = useMemo(() => {
        const available = allProducts.filter(p => p.available);
        if (selectedCategory === 'all') return available;
        return available.filter(p => p.categoryId === selectedCategory);
    }, [allProducts, selectedCategory]);

    const isOpen = useMemo(() => settings ? checkIfOpen(settings.schedules) : false, [settings]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
                {/* 1. Profesional Header (Cover & Logo) */}
                <div className="relative">
                    <div className="h-48 sm:h-64 w-full relative overflow-hidden">
                        <img 
                            src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                            className="w-full h-full object-cover" 
                            alt="Cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        
                        {/* Top Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => setShowInfo(true)} className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"><IconInfo className="h-5 w-5"/></button>
                            <button className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"><IconShare className="h-5 w-5"/></button>
                        </div>
                    </div>

                    {/* Logo & Store Header */}
                    <div className="relative px-4 -mt-12 text-center">
                        <div className="inline-block relative">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-xl overflow-hidden mx-auto">
                                {settings?.branch.logoUrl ? (
                                    <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-emerald-500">{settings?.company.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 shadow-sm ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                        
                        <div className="mt-4">
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">{settings?.company.name}</h1>
                            <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5"><IconStore className="h-4 w-4 text-emerald-500"/> A domicilio</div>
                                <div className="flex items-center gap-1.5"><IconClock className="h-4 w-4 text-emerald-500"/> 25 - 45 mins</div>
                                <div className="flex items-center gap-1.5"><IconTag className="h-4 w-4 text-emerald-500"/> Envío ${settings?.shipping.fixedCost || '0'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Promo Banner Style (Yellow Reference) */}
                {allPromotions.length > 0 && (
                    <div className="px-4 mt-6">
                        <div className="bg-yellow-100 border border-yellow-200 p-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-sm">
                            <div className="bg-yellow-400 p-2 rounded-xl text-yellow-900 font-black text-lg">2x1</div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-yellow-900 uppercase">Oferta en Hamburguesas</p>
                                <p className="text-xs text-yellow-800 font-medium">Haz clic para ver más detalles...</p>
                            </div>
                            <IconChevronDown className="h-5 w-5 text-yellow-600 -rotate-90"/>
                        </div>
                    </div>
                )}

                {/* 3. Category Nav (Sticky & Fluid) */}
                <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b dark:border-gray-800 mt-6 shadow-sm">
                    <div className="flex overflow-x-auto px-4 py-4 gap-3 no-scrollbar">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-6 py-2.5 rounded-full text-sm font-black whitespace-nowrap transition-all duration-300 ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                        >
                            TODO EL MENÚ
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-2.5 rounded-full text-sm font-black whitespace-nowrap transition-all duration-300 ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                            >
                                {cat.name.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Product Grid (Professional Cards) */}
                <div className="px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product, idx) => {
                        const { price, promotion } = getDiscountedPrice(product, allPromotions);
                        return (
                            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-xl border dark:border-gray-800 overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group active:scale-95">
                                <div className="h-48 relative overflow-hidden">
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        loading={idx < 4 ? "eager" : "lazy"}
                                    />
                                    {promotion && (
                                        <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20">
                                            {promotion.discountType === DiscountType.Percentage ? `-${promotion.discountValue}%` : 'OFERTA'}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-2 group-hover:text-emerald-500 transition-colors">{product.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-5 pt-4 border-t dark:border-gray-700">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Desde</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-2xl tracking-tighter">${price.toFixed(2)}</span>
                                                {promotion && <span className="text-sm text-gray-400 line-through font-bold">${product.price.toFixed(2)}</span>}
                                            </div>
                                        </div>
                                        <button className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all group-hover:rotate-90">
                                            <IconPlus className="h-6 w-6"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Floating Bottom Bar (Professional) */}
                {itemCount > 0 && (
                    <div className="fixed bottom-6 left-6 right-6 z-50 max-w-xl mx-auto">
                        <button 
                            onClick={() => setView('cart')} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-[2rem] font-black shadow-2xl flex justify-between items-center px-8 transition-all active:scale-95 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">{itemCount}</div>
                                <span className="tracking-tighter uppercase">Ver mi pedido</span>
                            </div>
                            <span className="text-xl font-black tracking-tighter group-hover:translate-x-1 transition-transform">${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                
                {/* Modals */}
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                             <img src={selectedProduct.imageUrl} className="w-full h-72 object-cover" />
                             <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition-colors"><IconX className="h-6 w-6"/></button>
                             <div className="p-8">
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">{selectedProduct.name}</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all uppercase tracking-tighter"
                                >
                                    Agregar al Pedido
                                </button>
                             </div>
                        </div>
                    </div>
                )}

                {showInfo && settings && <StoreInfoModal settings={settings} onClose={() => setShowInfo(false)} />}
                <Chatbot />
            </div>
        );
    }

    return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest">Vista en construcción</div>;
}
