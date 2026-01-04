
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule, DaySchedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconInfo, IconExternalLink } from '../constants';
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

    const schedule = schedules.find(s => s.id === 'general') || schedules[0];
    const today = schedule.days.find(d => d.day === currentDayName);

    if (!today || !today.isOpen) return false;
    if (!today.shifts || today.shifts.length === 0) return true; 

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-xl font-black uppercase tracking-tighter">Información del Local</h3>
                <button onClick={onClose} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:scale-110 transition-transform"><IconX/></button>
            </div>
            <div className="p-8 space-y-8">
                <section>
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-[0.2em]">Ubicación</h4>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><IconLocationMarker className="h-6 w-6"/></div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-tight mb-2">{settings.branch.fullAddress || 'Consultar dirección con el local'}</p>
                            {settings.branch.googleMapsLink && (
                                <a href={settings.branch.googleMapsLink} target="_blank" className="text-sm text-emerald-600 font-black hover:underline flex items-center gap-1">
                                    VER EN MAPA <IconExternalLink className="h-3 w-3"/>
                                </a>
                            )}
                        </div>
                    </div>
                </section>
                <section>
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-[0.2em]">Horarios</h4>
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl">
                        {settings.schedules[0].days.map(d => {
                            const isToday = new Date().toLocaleDateString('es-ES', {weekday: 'long'}).toLowerCase() === d.day.toLowerCase();
                            return (
                                <div key={d.day} className={`flex justify-between text-sm ${isToday ? 'scale-105' : ''}`}>
                                    <span className={`font-bold ${isToday ? 'text-emerald-600' : 'text-gray-500'}`}>{d.day}</span>
                                    <span className={`font-medium ${isToday ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : 'Abierto 24h') : 'Cerrado'}
                                    </span>
                                </div>
                            );
                        })}
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
                {/* 1. Header con Portada y Logo Superpuesto */}
                <div className="relative">
                    <div className="h-56 sm:h-80 w-full relative overflow-hidden">
                        <img 
                            src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'} 
                            className="w-full h-full object-cover" 
                            alt="Cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                        
                        <div className="absolute top-6 right-6 flex gap-3">
                            <button onClick={() => setShowInfo(true)} className="p-3 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition-all border border-white/20 shadow-lg"><IconInfo className="h-5 w-5"/></button>
                            <button className="p-3 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition-all border border-white/20 shadow-lg"><IconShare className="h-5 w-5"/></button>
                        </div>
                    </div>

                    {/* 2. Sección de Datos de Tienda (Muy Visibles) */}
                    <div className="relative px-6 -mt-20 text-center">
                        <div className="inline-block relative">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden mx-auto">
                                {settings?.branch.logoUrl ? (
                                    <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-emerald-500">{settings?.company.name.charAt(0)}</div>
                                )}
                            </div>
                            {/* Burbuja de Abierto/Cerrado */}
                            <div className={`absolute bottom-3 right-3 px-4 py-1.5 rounded-full border-2 border-white dark:border-gray-900 shadow-xl flex items-center gap-2 transition-transform hover:scale-105 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
                                <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                                <span className="text-[11px] font-black text-white uppercase tracking-tighter">{isOpen ? 'ABIERTO' : 'CERRADO'}</span>
                            </div>
                        </div>
                        
                        <div className="mt-8">
                            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-3">{settings?.company.name}</h1>
                            
                            {/* Dirección Principal */}
                            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                                <IconLocationMarker className="h-4 w-4 text-emerald-500"/>
                                <p className="text-xs sm:text-sm font-black uppercase tracking-[0.15em]">{settings?.branch.fullAddress || 'Ubicación no configurada'}</p>
                            </div>

                            {/* Badges de Información de Envío */}
                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                                <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-800 text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    <IconStore className="h-4 w-4 text-emerald-500"/> A domicilio
                                </div>
                                <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-800 text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    <IconClock className="h-4 w-4 text-emerald-500"/> {settings?.shipping.deliveryTime.min}-{settings?.shipping.deliveryTime.max} min
                                </div>
                                <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-800 text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    <IconTag className="h-4 w-4 text-emerald-500"/> Envío ${settings?.shipping.fixedCost || '0'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Banner de Promociones (Estilo Referencia Amarilla) */}
                {allPromotions.length > 0 && (
                    <div className="px-6 mt-12">
                        <div className="bg-yellow-50 border-2 border-yellow-200 p-5 rounded-[2.5rem] flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="bg-yellow-400 p-4 rounded-3xl text-yellow-950 font-black text-2xl shadow-sm animate-bounce">2x1</div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em] mb-1">Oferta Exclusiva</p>
                                    <p className="text-lg font-black text-yellow-900 leading-tight">En toda la línea de Hamburguesas</p>
                                </div>
                            </div>
                            <button onClick={() => setShowInfo(true)} className="p-3 bg-yellow-400/20 rounded-full text-yellow-700 hover:scale-110 transition-transform">
                                <IconChevronDown className="h-6 w-6 -rotate-90"/>
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. Navegación de Categorías Sticky */}
                <div className="sticky top-0 z-40 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-3xl border-b dark:border-gray-800 mt-12 shadow-sm">
                    <div className="flex overflow-x-auto px-6 py-6 gap-4 no-scrollbar">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-10 py-3.5 rounded-2xl text-[12px] font-black whitespace-nowrap transition-all duration-500 ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/40 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 border dark:border-gray-800'}`}
                        >
                            TODO EL MENÚ
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-10 py-3.5 rounded-2xl text-[12px] font-black whitespace-nowrap transition-all duration-500 ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/40 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 border dark:border-gray-800'}`}
                            >
                                {cat.name.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. Cuadrícula de Productos Premium */}
                <div className="px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredProducts.map((product, idx) => {
                        const { price, promotion } = getDiscountedPrice(product, allPromotions);
                        return (
                            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm hover:shadow-2xl border dark:border-gray-800 overflow-hidden cursor-pointer transition-all duration-700 flex flex-col group active:scale-[0.97]">
                                <div className="h-64 relative overflow-hidden">
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                                        loading={idx < 4 ? "eager" : "lazy"}
                                    />
                                    {promotion && (
                                        <div className="absolute top-6 left-6 bg-emerald-500 text-white text-[11px] font-black px-5 py-2.5 rounded-full shadow-2xl border border-white/20">
                                            {promotion.discountType === DiscountType.Percentage ? `-${promotion.discountValue}%` : 'OFERTA'}
                                        </div>
                                    )}
                                </div>
                                <div className="p-10 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="font-black text-gray-900 dark:text-white text-2xl leading-tight mb-4 group-hover:text-emerald-600 transition-colors tracking-tighter">{product.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-10 pt-8 border-t dark:border-gray-700">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Precio Online</span>
                                            <div className="flex items-baseline gap-3">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-4xl tracking-tighter">${price.toFixed(2)}</span>
                                                {promotion && <span className="text-sm text-gray-400 line-through font-bold">${product.price.toFixed(2)}</span>}
                                            </div>
                                        </div>
                                        <button className="bg-emerald-500 hover:bg-emerald-600 text-white p-5 rounded-[2rem] shadow-2xl shadow-emerald-500/30 transition-all group-hover:rotate-90 active:scale-90">
                                            <IconPlus className="h-7 w-7"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer Barra de Pedido */}
                {itemCount > 0 && (
                    <div className="fixed bottom-10 left-6 right-6 z-50 max-w-xl mx-auto">
                        <button 
                            onClick={() => setView('cart')} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-7 rounded-[3rem] font-black shadow-2xl flex justify-between items-center px-12 transition-all active:scale-95 group border-[6px] border-white/10"
                        >
                            <div className="flex items-center gap-6">
                                <div className="bg-white text-emerald-600 h-10 w-10 flex items-center justify-center rounded-full text-lg font-black shadow-inner">{itemCount}</div>
                                <span className="tracking-tighter uppercase text-sm">Ver mi Carrito</span>
                            </div>
                            <span className="text-3xl font-black tracking-tighter group-hover:translate-x-2 transition-transform">${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                
                {showInfo && settings && <StoreInfoModal settings={settings} onClose={() => setShowInfo(false)} />}
                <Chatbot />
            </div>
        );
    }

    return <div className="flex items-center justify-center h-screen font-black text-gray-300 uppercase tracking-[0.3em] bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">Cargando Menú Digital...</div>
    </div>;
}
