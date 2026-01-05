
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer, Personalization, PersonalizationOption, OrderStatus, Order, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink, IconMinus, IconCheck, IconStore, IconDelivery, IconArrowLeft, IconSearch } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, getPersonalizations, saveOrder, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Lógica de Apertura ---
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

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const promo = promotions.find(p => p.appliesTo === PromotionAppliesTo.AllProducts || p.productIds.includes(product.id));
    if (!promo) return { price: product.price, promotion: null };
    let discount = promo.discountType === DiscountType.Percentage ? product.price * (promo.discountValue / 100) : promo.discountValue;
    return { price: Math.max(0, product.price - discount), promotion: promo };
};

// --- Modales Estilo Referencia ---
const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 flex items-center relative border-b border-gray-50">
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <IconX className="h-6 w-6" />
                    </button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800">{title}</h3>
                </div>
                <div className="p-8">
                    {children}
                    <button 
                        onClick={onClose} 
                        className="w-full mt-6 py-4 border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [activeModal, setActiveModal] = useState<'hours' | 'location' | 'none'>('none');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);

    const { cartItems, addToCart, cartTotal, itemCount } = useCart();

    const loadData = useCallback(async () => {
        try {
            const [s, prm, prod, cat] = await Promise.all([
                getAppSettings(), getPromotions(), getProducts(), getCategories()
            ]);
            setSettings(s);
            setPromotions(prm);
            setProducts(prod);
            setCategories(cat);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        subscribeToMenuUpdates(loadData);
        return () => unsubscribeFromChannel();
    }, [loadData]);

    const filteredProducts = useMemo(() => {
        const available = products.filter(p => p.available);
        return selectedCategory === 'all' ? available : available.filter(p => p.categoryId === selectedCategory);
    }, [products, selectedCategory]);

    const isOpenNow = useMemo(() => settings ? checkIfOpen(settings.schedules) : true, [settings]);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans selection:bg-green-100">
            {/* 1. PORTADA Y BOTONES FLOTANTES (IMAGEN 1) */}
            <div className="relative">
                <div className="h-[22rem] w-full overflow-hidden rounded-b-[3.5rem] shadow-md">
                    <img 
                        src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                        className="w-full h-full object-cover" 
                        alt="Portada"
                    />
                </div>
                
                {/* Botones Acceso Rápido */}
                <div className="absolute top-6 right-6 flex gap-2.5 z-20">
                    <button onClick={() => setActiveModal('hours')} className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 transition-transform active:scale-95">
                        <IconClock className="h-5 w-5"/>
                    </button>
                    <button onClick={() => setActiveModal('location')} className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 transition-transform active:scale-95">
                        <IconLocationMarker className="h-5 w-5"/>
                    </button>
                    <button className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 transition-transform active:scale-95">
                        <IconShare className="h-5 w-5"/>
                    </button>
                </div>

                {/* Logo Central */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10">
                    <div className="w-28 h-28 rounded-full border-[6px] border-white bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                        {settings?.branch.logoUrl ? (
                            <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <span className="text-5xl font-black text-[#5EC278]">{settings?.company.name.charAt(0)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. INFO LOCAL Y SELECTOR (IMAGEN 1) */}
            <div className="mt-16 text-center px-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{settings?.company.name || 'Menú de Ejemplo'}</h1>
                
                {/* Selector A domicilio / Para recoger */}
                <div className="inline-flex bg-gray-100 p-1.5 rounded-full mt-5 border border-gray-200/40">
                    <button 
                        onClick={() => setOrderType(OrderType.Delivery)}
                        className={`px-7 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${orderType === OrderType.Delivery ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        A domicilio
                    </button>
                    <button 
                        onClick={() => setOrderType(OrderType.TakeAway)}
                        className={`px-7 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${orderType === OrderType.TakeAway ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        Para recoger
                    </button>
                </div>

                {/* Stats */}
                <div className="flex justify-center items-center gap-12 mt-8">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">Tiempo envío</p>
                        <p className="text-[15px] font-bold text-gray-800">{settings?.shipping.deliveryTime.min} - {settings?.shipping.deliveryTime.max} mins</p>
                    </div>
                    <div className="w-[1px] h-10 bg-gray-200"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">Costo envío</p>
                        <p className="text-[15px] font-bold text-gray-800">Desde ${settings?.shipping.fixedCost || '20'}</p>
                    </div>
                </div>
            </div>

            {/* 3. BANNER 2X1 AMARILLO (IMAGEN 1) */}
            {promotions.length > 0 && (
                <div className="px-6 mt-10">
                    <div className="bg-[#FFFDE7] border-2 border-[#FFF9C4]/80 rounded-[1.75rem] p-5 flex items-center justify-between relative overflow-hidden shadow-sm active:scale-[0.99] transition-transform cursor-pointer group">
                        <div className="z-10 flex flex-col gap-0.5">
                            <h3 className="font-bold text-gray-800 text-lg">2×1 en Hamburguesas</h3>
                            <p className="text-xs text-gray-500 font-medium">Haz clic para ver más detalles...</p>
                        </div>
                        {/* Texto 2x1 gigante de fondo */}
                        <div className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 select-none opacity-[0.08] pointer-events-none rotate-12">
                             <span className="text-[7rem] font-black text-yellow-600">2×1</span>
                        </div>
                        {/* Texto 2x1 destacado a la derecha */}
                        <div className="z-10 text-[2.75rem] font-black text-[#FBC02D] leading-none drop-shadow-sm group-hover:scale-110 transition-transform">
                            2×1
                        </div>
                    </div>
                </div>
            )}

            {/* 4. CATEGORÍAS HORIZONTAL */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 mt-8">
                <div className="flex overflow-x-auto px-6 py-4 gap-3 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-7 py-2.5 rounded-2xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#5EC278] text-white shadow-lg shadow-green-100' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Todo
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-7 py-2.5 rounded-2xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-[#5EC278] text-white shadow-lg shadow-green-100' : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. LISTA DE PRODUCTOS (ESTILO CARTA IMAGEN 1) */}
            <div className="px-6 py-8">
                <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Combos</h2>
                <div className="grid grid-cols-1 gap-6">
                    {filteredProducts.map(product => {
                        const { price, promotion } = getDiscountedPrice(product, promotions);
                        return (
                            <div 
                                key={product.id} 
                                className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-5 hover:shadow-lg transition-all active:scale-[0.98] relative"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight truncate mb-1">{product.name}</h3>
                                    <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                        {product.description}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-900 font-bold text-xl">${price.toFixed(0)}</span>
                                        {promotion && <span className="text-gray-300 text-xs line-through decoration-red-400/30">${product.price.toFixed(0)}</span>}
                                    </div>
                                </div>
                                <div className="w-[7.5rem] h-[7.5rem] rounded-[1.75rem] overflow-hidden relative shrink-0 bg-gray-50 shadow-sm border border-gray-100">
                                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                    {/* Botón PLUS flotante sobre la imagen (IMAGEN 1) */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }}
                                        className="absolute bottom-1.5 right-1.5 bg-white p-2 rounded-full shadow-xl text-[#5EC278] hover:scale-110 active:scale-90 transition-transform border border-gray-50"
                                    >
                                        <IconPlus className="h-7 w-7"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOTÓN "VER PEDIDO" FLOTANTE (IMAGEN 1) */}
            {itemCount > 0 && (
                <div className="fixed bottom-8 left-6 right-6 z-50 max-w-lg mx-auto">
                    <button 
                        onClick={() => setView('cart')}
                        className="w-full bg-[#5EC278] hover:bg-green-600 text-white py-5 rounded-[1.75rem] font-black text-lg shadow-2xl shadow-green-200/50 flex items-center justify-between px-8 transition-all active:scale-[0.97] animate-in slide-in-from-bottom-8"
                    >
                        <div className="flex items-center gap-3">
                             <div className="bg-white/20 px-2.5 py-0.5 rounded-lg text-sm">{itemCount}</div>
                             <span>Ver pedido</span>
                        </div>
                        <span className="opacity-80 font-bold">${cartTotal.toFixed(0)}</span>
                    </button>
                </div>
            )}

            {/* MODAL HORARIO (IMAGEN 3) */}
            <ReferenceModal title="Horario" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {settings?.schedules[0].days.map(d => (
                        <div key={d.day} className="flex flex-col gap-1 border-b border-gray-50 pb-3 last:border-0">
                            <span className="font-bold text-gray-800 text-[15px]">{d.day}</span>
                            <span className={`text-[13px] ${d.isOpen ? 'text-gray-400 font-medium' : 'text-red-400 font-bold uppercase'}`}>
                                {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : 'Abierto todo el día') : 'Cerrado'}
                            </span>
                        </div>
                    ))}
                </div>
            </ReferenceModal>

            {/* MODAL UBICACIÓN (IMAGEN 2) */}
            <ReferenceModal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                <div className="text-center">
                    <p className="text-gray-700 text-[15px] font-medium leading-relaxed mb-10 px-2">
                        {settings?.branch.fullAddress || 'Calle 44 #398, Los Pinos, Mérida, Yucatán (Frente a la escuela secundaria ESFER)'}
                    </p>
                    <a 
                        href={settings?.branch.googleMapsLink || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 w-full bg-[#5EC278] text-white py-4.5 rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-600 transition-all mb-4 text-sm"
                    >
                        Ver la ubicación en el mapa <IconExternalLink className="h-4.5 w-4.5"/>
                    </a>
                </div>
            </ReferenceModal>

            <Chatbot />
        </div>
    );
}
