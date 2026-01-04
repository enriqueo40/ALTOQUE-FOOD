
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconInfo, IconExternalLink } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Lógica de Negocio: Horarios y Precios ---

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

// --- Sub-Componentes Premium ---

const StoreInfoModal: React.FC<{ settings: AppSettings; onClose: () => void }> = ({ settings, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-xl font-black uppercase tracking-tight">Información de la Tienda</h3>
                <button onClick={onClose} className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:scale-110 transition-transform"><IconX/></button>
            </div>
            <div className="p-8 space-y-10">
                <section>
                    <h4 className="text-[11px] font-black text-emerald-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> UBICACIÓN
                    </h4>
                    <div className="flex items-start gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl shrink-0"><IconLocationMarker className="h-8 w-8"/></div>
                        <div className="flex-1">
                            <p className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-3">{settings.branch.fullAddress || 'Dirección por configurar'}</p>
                            {settings.branch.googleMapsLink && (
                                <a href={settings.branch.googleMapsLink} target="_blank" className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 uppercase border-b-2 border-emerald-500/30 hover:border-emerald-500 transition-all pb-1">
                                    VER EN GOOGLE MAPS <IconExternalLink className="h-3 w-3"/>
                                </a>
                            )}
                        </div>
                    </div>
                </section>
                <section>
                    <h4 className="text-[11px] font-black text-emerald-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> HORARIOS SEMANALES
                    </h4>
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border dark:border-gray-700">
                        {settings.schedules[0].days.map(d => {
                            const isToday = new Date().toLocaleDateString('es-ES', {weekday: 'long'}).toLowerCase() === d.day.toLowerCase();
                            return (
                                <div key={d.day} className={`flex justify-between text-sm py-1 ${isToday ? 'scale-105' : ''}`}>
                                    <span className={`font-bold ${isToday ? 'text-emerald-500' : 'text-gray-400'}`}>{d.day}</span>
                                    <span className={`font-black ${isToday ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-200'}`}>
                                        {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : '24 Horas') : 'Cerrado'}
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

// --- Componente Principal ---

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
        } catch (e) {
            console.error("Error fetching menu:", e);
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
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
                
                {/* 1. Alerta de Local Cerrado (Banner Superior) */}
                {!isOpen && (
                    <div className="bg-red-600 text-white text-center py-3 px-4 font-black uppercase text-[10px] tracking-[0.2em] sticky top-0 z-[60] shadow-xl">
                        ⚠️ Actualmente estamos cerrados. No se aceptan pedidos.
                    </div>
                )}

                {/* 2. Hero Section con Portada Premium */}
                <div className="relative">
                    <div className="h-64 sm:h-96 w-full relative overflow-hidden">
                        <img 
                            src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'} 
                            className="w-full h-full object-cover" 
                            alt="Cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        
                        <div className="absolute top-6 right-6 flex gap-3 z-10">
                            <button onClick={() => setShowInfo(true)} className="p-4 bg-white/10 backdrop-blur-2xl rounded-full text-white hover:bg-emerald-500 transition-all border border-white/20 shadow-2xl group">
                                <IconInfo className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            </button>
                            <button className="p-4 bg-white/10 backdrop-blur-2xl rounded-full text-white hover:bg-white/30 transition-all border border-white/20 shadow-2xl">
                                <IconShare className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* 3. Datos de la Tienda (Superpuestos) */}
                    <div className="relative px-6 -mt-24 text-center">
                        <div className="inline-block relative">
                            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[3rem] border-[8px] border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden mx-auto">
                                {settings?.branch.logoUrl ? (
                                    <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl font-black text-emerald-500">{settings?.company.name.charAt(0)}</div>
                                )}
                            </div>
                            {/* Indicador Abierto/Cerrado Flotante */}
                            <div className={`absolute -bottom-2 -right-2 px-6 py-2 rounded-full border-4 border-white dark:border-gray-900 shadow-2xl flex items-center gap-3 transition-all ${isOpen ? 'bg-emerald-500 scale-110' : 'bg-red-500'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full bg-white ${isOpen ? 'animate-ping' : ''}`}></div>
                                <span className="text-[11px] font-black text-white uppercase tracking-[0.1em]">{isOpen ? 'Abierto Ahora' : 'Cerrado'}</span>
                            </div>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{settings?.company.name}</h1>
                            
                            {/* Dirección Destacada */}
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setShowInfo(true)}>
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <IconLocationMarker className="h-5 w-5"/>
                                    <p className="text-sm sm:text-base font-black uppercase tracking-[0.1em]">{settings?.branch.fullAddress || 'Ubicación no disponible'}</p>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Toca para ver horarios y mapa</p>
                            </div>

                            {/* Info de Entrega en Capsulas */}
                            <div className="flex flex-wrap justify-center gap-3 mt-8">
                                <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-800 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    <IconClock className="h-5 w-5 text-emerald-500"/> {settings?.shipping.deliveryTime.min}-{settings?.shipping.deliveryTime.max} MIN
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-800 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    <IconTag className="h-5 w-5 text-emerald-500"/> ENVÍO ${settings?.shipping.fixedCost || '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Barra de Categorías Sticky Premium */}
                <div className="sticky top-0 sm:top-0 z-40 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-3xl border-b dark:border-gray-800 mt-16 shadow-xl">
                    <div className="flex overflow-x-auto px-6 py-8 gap-5 no-scrollbar max-w-5xl mx-auto">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-10 py-4 rounded-[1.5rem] text-[12px] font-black whitespace-nowrap transition-all duration-500 border-2 ${selectedCategory === 'all' ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/40 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            TODO EL MENÚ
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-10 py-4 rounded-[1.5rem] text-[12px] font-black whitespace-nowrap transition-all duration-500 border-2 ${selectedCategory === cat.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-600/40 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                            >
                                {cat.name.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. Cuadrícula de Productos "Alta Gama" */}
                <div className="px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {filteredProducts.map((product, idx) => {
                        const { price, promotion } = getDiscountedPrice(product, allPromotions);
                        return (
                            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] border dark:border-gray-800 overflow-hidden cursor-pointer transition-all duration-700 flex flex-col group active:scale-[0.96]">
                                <div className="h-72 relative overflow-hidden">
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]"
                                        loading={idx < 4 ? "eager" : "lazy"}
                                    />
                                    {promotion && (
                                        <div className="absolute top-8 left-8 bg-emerald-500 text-white text-[11px] font-black px-6 py-2.5 rounded-full shadow-2xl border border-white/20 animate-bounce">
                                            {promotion.discountType === DiscountType.Percentage ? `OFERTA -${promotion.discountValue}%` : 'OFERTA ESPECIAL'}
                                        </div>
                                    )}
                                </div>
                                <div className="p-10 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="font-black text-gray-900 dark:text-white text-2xl leading-none mb-4 group-hover:text-emerald-500 transition-colors tracking-tighter uppercase">{product.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-12 pt-10 border-t dark:border-gray-700/50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Precio Online</span>
                                            <div className="flex items-baseline gap-3">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-4xl tracking-tighter">${price.toFixed(2)}</span>
                                                {promotion && <span className="text-sm text-gray-400 line-through font-bold">${product.price.toFixed(2)}</span>}
                                            </div>
                                        </div>
                                        <button className="bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl shadow-emerald-600/20 transition-all group-hover:rotate-90 active:scale-75">
                                            <IconPlus className="h-8 w-8"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* 6. Carrito Flotante "Floating Action" */}
                {itemCount > 0 && (
                    <div className="fixed bottom-12 left-6 right-6 z-50 max-w-lg mx-auto">
                        <button 
                            onClick={() => setView('cart')} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-8 rounded-[3rem] font-black shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex justify-between items-center px-14 transition-all active:scale-95 group border-[8px] border-white/10"
                        >
                            <div className="flex items-center gap-6">
                                <div className="bg-white text-emerald-600 h-12 w-12 flex items-center justify-center rounded-[1.5rem] text-xl font-black shadow-inner">{itemCount}</div>
                                <span className="tracking-widest uppercase text-xs font-black">Finalizar mi pedido</span>
                            </div>
                            <span className="text-3xl font-black tracking-tighter group-hover:translate-x-3 transition-transform">${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                
                {showInfo && settings && <StoreInfoModal settings={settings} onClose={() => setShowInfo(false)} />}
                <Chatbot />
            </div>
        );
    }

    return null;
}
