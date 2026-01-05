
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer, Personalization, PersonalizationOption, OrderStatus, Order, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink, IconMinus, IconCheck, IconStore, IconDelivery, IconArrowLeft, IconSearch, IconMap, IconInfo } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, getPersonalizations, saveOrder, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Lógica de Apertura Refinada ---
const checkIfOpen = (schedules: Schedule[]) => {
    if (!schedules || schedules.length === 0) return true;
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = days[now.getDay()];
    
    // Buscamos el horario general o el primero disponible
    const schedule = schedules.find(s => s.id === 'general') || schedules[0];
    const today = schedule.days.find(d => d.day === currentDayName);

    if (!today || !today.isOpen) return false;
    
    // Si está marcado como abierto pero no tiene turnos específicos, asumimos 24h
    if (!today.shifts || today.shifts.length === 0) return true;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return today.shifts.some(shift => {
        const [hStart, mStart] = shift.start.split(':').map(Number);
        const [hEnd, mEnd] = shift.end.split(':').map(Number);
        const start = hStart * 60 + mStart;
        const end = hEnd * 60 + mEnd;
        
        // Manejo de turnos que cruzan la medianoche (ej: 20:00 - 02:00)
        if (end < start) {
            return currentTime >= start || currentTime <= end;
        }
        return currentTime >= start && currentTime <= end;
    });
};

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const promo = promotions.find(p => p.appliesTo === PromotionAppliesTo.AllProducts || p.productIds.includes(product.id));
    if (!promo) return { price: product.price, promotion: null };
    let discount = promo.discountType === DiscountType.Percentage ? product.price * (promo.discountValue / 100) : promo.discountValue;
    return { price: Math.max(0, product.price - discount), promotion: promo };
};

// --- Sub-componentes Visuales ---

const StatusBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors duration-500 ${isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
        {isOpen ? 'Abierto ahora' : 'Cerrado'}
    </div>
);

const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-6 flex items-center relative border-b border-gray-50 bg-gray-50/30">
                    <button onClick={onClose} className="p-2 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <IconX className="h-5 w-5" />
                    </button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                </div>
                <div className="p-8">
                    {children}
                    <button 
                        onClick={onClose} 
                        className="w-full mt-8 py-4.5 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Entendido
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

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-[#5EC278] border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans selection:bg-green-100 overflow-x-hidden">
            {/* 1. PORTADA Y BOTONES PREMIUM */}
            <div className="relative">
                <div className="h-[24rem] w-full overflow-hidden rounded-b-[4rem] shadow-2xl relative">
                    <img 
                        src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                        className="w-full h-full object-cover brightness-[0.85]" 
                        alt="Portada"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
                </div>
                
                {/* Botones Flotantes en Portada */}
                <div className="absolute top-8 right-6 flex flex-col gap-3 z-20">
                    <button onClick={() => setActiveModal('hours')} className="p-3.5 bg-white/90 backdrop-blur-md shadow-2xl rounded-full text-gray-900 hover:scale-110 hover:bg-white transition-all active:scale-95 border border-white/50">
                        <IconInfo className="h-6 w-6"/>
                    </button>
                    <button onClick={() => setActiveModal('location')} className="p-3.5 bg-white/90 backdrop-blur-md shadow-2xl rounded-full text-gray-900 hover:scale-110 hover:bg-white transition-all active:scale-95 border border-white/50">
                        <IconMap className="h-6 w-6"/>
                    </button>
                    <button className="p-3.5 bg-white/90 backdrop-blur-md shadow-2xl rounded-full text-gray-900 hover:scale-110 hover:bg-white transition-all active:scale-95 border border-white/50">
                        <IconShare className="h-6 w-6"/>
                    </button>
                </div>

                {/* Logo Central con Sombra Suave */}
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
                    <div className="w-32 h-32 rounded-full border-[8px] border-white bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex items-center justify-center">
                        {settings?.branch.logoUrl ? (
                            <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <span className="text-6xl font-black text-[#5EC278]">{settings?.company.name.charAt(0)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. CABECERA: TÍTULO, ESTADO Y UBICACIÓN */}
            <div className="mt-20 text-center px-6">
                <div className="flex flex-col items-center gap-3">
                    <StatusBadge isOpen={isOpenNow} />
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{settings?.company.name || 'ALTOQUE FOOD'}</h1>
                    
                    {/* Ubicación Premium Directa */}
                    <div 
                        className="flex items-center justify-center gap-1.5 text-gray-500 hover:text-[#5EC278] transition-colors cursor-pointer group"
                        onClick={() => setActiveModal('location')}
                    >
                        <IconMap className="h-4 w-4 shrink-0" />
                        <span className="text-[13px] font-bold leading-tight max-w-[280px] truncate border-b border-transparent group-hover:border-[#5EC278]">
                            {settings?.branch.fullAddress || 'Haz clic para ver nuestra ubicación'}
                        </span>
                    </div>
                </div>
                
                {/* Selector de Tipo de Pedido Refinado */}
                <div className="flex justify-center mt-8">
                    <div className="inline-flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/30 backdrop-blur-sm">
                        <button 
                            onClick={() => setOrderType(OrderType.Delivery)}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-[14px] font-black transition-all duration-500 ${orderType === OrderType.Delivery ? 'bg-white text-[#5EC278] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <IconDelivery className="h-4 w-4" /> Domicilio
                        </button>
                        <button 
                            onClick={() => setOrderType(OrderType.TakeAway)}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-[14px] font-black transition-all duration-500 ${orderType === OrderType.TakeAway ? 'bg-white text-[#5EC278] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <IconStore className="h-4 w-4" /> Recoger
                        </button>
                    </div>
                </div>

                {/* Stats de Negocio */}
                <div className="flex justify-center items-center gap-10 mt-10 px-4">
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Entrega</p>
                        <div className="flex items-center gap-1.5">
                            <IconClock className="h-4 w-4 text-[#5EC278]" />
                            <p className="text-[16px] font-black text-gray-800">{settings?.shipping.deliveryTime.min}-{settings?.shipping.deliveryTime.max}m</p>
                        </div>
                    </div>
                    <div className="w-[1.5px] h-12 bg-gray-100 rounded-full"></div>
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Costo Envío</p>
                        <div className="flex items-center gap-1.5">
                            <IconDelivery className="h-4 w-4 text-[#5EC278]" />
                            <p className="text-[16px] font-black text-gray-800">${settings?.shipping.fixedCost || '0'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. BANNER PROMOCIONAL TIPO "IMAGEN 2" */}
            {promotions.length > 0 && (
                <div className="px-6 mt-12">
                    <div className="bg-gradient-to-br from-[#FFFDE7] to-[#FFF9C4] border border-[#FBC02D]/20 rounded-[2.5rem] p-6 flex items-center justify-between relative overflow-hidden shadow-[0_15px_30px_-5px_rgba(251,192,45,0.15)] group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#FBC02D] text-white text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter">Oferta Top</span>
                                <h3 className="font-black text-gray-900 text-xl tracking-tight">{promotions[0].name}</h3>
                            </div>
                            <p className="text-xs text-yellow-800/60 font-bold uppercase tracking-widest">¡Solo por tiempo limitado!</p>
                        </div>
                        <div className="z-10 flex flex-col items-end">
                            <span className="text-[3.2rem] font-black text-[#FBC02D] leading-none tracking-tighter group-hover:scale-110 transition-transform">
                                {promotions[0].discountValue}{promotions[0].discountType === DiscountType.Percentage ? '%' : '$'}
                            </span>
                            <span className="text-[10px] font-black text-yellow-700/50 uppercase tracking-widest -mt-1">Desc.</span>
                        </div>
                        {/* Decoración de fondo */}
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>
                    </div>
                </div>
            )}

            {/* 4. SELECTOR DE CATEGORÍAS (STICKY) */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-gray-100 mt-10">
                <div className="flex overflow-x-auto px-6 py-5 gap-3 no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-8 py-3 rounded-[1.25rem] text-[14px] font-black transition-all duration-300 whitespace-nowrap border ${selectedCategory === 'all' ? 'bg-[#5EC278] text-white border-[#5EC278] shadow-xl shadow-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 shadow-sm'}`}
                    >
                        Todo el menú
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-8 py-3 rounded-[1.25rem] text-[14px] font-black transition-all duration-300 whitespace-nowrap border ${selectedCategory === cat.id ? 'bg-[#5EC278] text-white border-[#5EC278] shadow-xl shadow-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 shadow-sm'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. GRID DE PRODUCTOS (REFINADO) */}
            <div className="px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Nuestros Favoritos</h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredProducts.length} items</span>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                    {filteredProducts.map(product => {
                        const { price, promotion } = getDiscountedPrice(product, promotions);
                        return (
                            <div 
                                key={product.id} 
                                className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-6 flex items-center gap-6 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 relative overflow-hidden"
                            >
                                <div className="flex-1 min-w-0 z-10">
                                    <h3 className="font-black text-gray-900 text-xl tracking-tight mb-2 group-hover:text-[#5EC278] transition-colors">{product.name}</h3>
                                    <p className="text-[13px] text-gray-400 font-medium line-clamp-2 leading-relaxed mb-5">
                                        {product.description || 'Delicioso platillo preparado al momento con los mejores ingredientes.'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#F8FDF9] px-4 py-1.5 rounded-2xl border border-green-50 shadow-sm transition-transform group-hover:scale-105">
                                            <span className="text-[#5EC278] font-black text-xl">${price.toFixed(0)}</span>
                                        </div>
                                        {promotion && (
                                            <span className="text-gray-300 text-sm line-through font-bold decoration-rose-400/40 opacity-70">
                                                ${product.price.toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-[8.5rem] h-[8.5rem] rounded-[2rem] overflow-hidden relative shrink-0 shadow-lg border border-gray-50 transform group-hover:rotate-2 transition-all duration-500">
                                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                    {/* Botón de Acción Directa Premium */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }}
                                        className="absolute bottom-2 right-2 bg-[#5EC278] p-3 rounded-2xl shadow-xl text-white hover:scale-110 active:scale-90 transition-all border-2 border-white"
                                    >
                                        <IconPlus className="h-6 w-6"/>
                                    </button>
                                </div>
                                
                                {/* Decoración de fondo de la tarjeta */}
                                <div className="absolute right-0 top-0 w-24 h-24 bg-green-50/20 blur-3xl rounded-full -z-0"></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BARRA DE CARRITO FLOTANTE (ESTILO MODERNO) */}
            {itemCount > 0 && (
                <div className="fixed bottom-10 left-6 right-6 z-50 max-w-lg mx-auto">
                    <button 
                        onClick={() => setView('cart')}
                        className="w-full bg-gray-900 hover:bg-black text-white py-5.5 rounded-[2.25rem] font-black text-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between px-10 transition-all active:scale-[0.96] animate-in slide-in-from-bottom-12 duration-500 group"
                    >
                        <div className="flex items-center gap-4">
                             <div className="bg-[#5EC278] px-3 py-1 rounded-xl text-xs font-black group-hover:scale-110 transition-transform">
                                {itemCount}
                             </div>
                             <span className="tracking-tight uppercase text-sm font-black">Mi Orden</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-gray-400 text-sm font-bold tracking-widest">TOTAL</span>
                             <span className="font-black text-2xl tracking-tighter text-[#5EC278]">${cartTotal.toFixed(0)}</span>
                        </div>
                    </button>
                </div>
            )}

            {/* MODAL HORARIO DETALLADO */}
            <ReferenceModal title="Nuestros Horarios" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {settings?.schedules[0].days.map(d => (
                        <div key={d.day} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                            <div>
                                <span className="font-black text-gray-900 text-sm tracking-tight">{d.day}</span>
                                <div className="mt-0.5">
                                    <span className={`text-[12px] uppercase font-black tracking-widest ${d.isOpen ? 'text-[#5EC278]' : 'text-rose-500'}`}>
                                        {d.isOpen ? 'Servicio Activo' : 'Cerrado'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                {d.isOpen ? (
                                    d.shifts.length > 0 ? (
                                        d.shifts.map((s, idx) => (
                                            <div key={idx} className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 mt-1">
                                                <span className="text-[13px] font-black text-gray-700 tracking-tighter">{s.start} — {s.end}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-[13px] font-black text-gray-500 tracking-tighter">24 Horas</span>
                                    )
                                ) : (
                                    <IconX className="h-5 w-5 text-rose-200 ml-auto" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ReferenceModal>

            {/* MODAL UBICACIÓN DETALLADA */}
            <ReferenceModal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-50 text-[#5EC278] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
                        <IconMap className="h-8 w-8"/>
                    </div>
                    <p className="text-gray-800 text-[16px] font-black tracking-tight leading-relaxed mb-10 px-4">
                        {settings?.branch.fullAddress || 'Nuestra sucursal se encuentra lista para recibirte con el mejor servicio.'}
                    </p>
                    <a 
                        href={settings?.branch.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.branch.fullAddress || '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-[#5EC278] text-white py-5 rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-600 hover:shadow-green-200 transition-all mb-4 text-sm uppercase tracking-widest active:scale-95"
                    >
                        Abrir en Google Maps <IconExternalLink className="h-5 w-5"/>
                    </a>
                </div>
            </ReferenceModal>

            <Chatbot />
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            `}</style>
        </div>
    );
}
