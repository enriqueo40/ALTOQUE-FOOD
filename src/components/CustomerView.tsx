
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Helpers ---
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

// --- Modal Estilo Referencia (Imágenes 2 y 3) ---
const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 flex items-center relative border-b border-gray-50">
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <IconX className="h-6 w-6" />
                    </button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800">{title}</h3>
                </div>
                <div className="p-6">
                    {children}
                    <button 
                        onClick={onClose} 
                        className="w-full mt-4 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
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
    const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

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

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-white pb-24 font-sans selection:bg-green-100">
            {/* 1. Header & Cover (Siguiendo Imagen 1) */}
            <div className="relative">
                <div className="h-56 sm:h-72 w-full overflow-hidden rounded-b-[2.5rem] shadow-sm">
                    <img 
                        src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                        className="w-full h-full object-cover" 
                        alt="Portada"
                    />
                </div>
                
                {/* Botones Superiores Derecha (Imagen 1) */}
                <div className="absolute top-5 right-5 flex gap-2">
                    <button onClick={() => setActiveModal('hours')} className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all">
                        <IconClock className="h-5 w-5"/>
                    </button>
                    <button onClick={() => setActiveModal('location')} className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all">
                        <IconLocationMarker className="h-5 w-5"/>
                    </button>
                    <button className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all">
                        <IconShare className="h-5 w-5"/>
                    </button>
                </div>

                {/* Logo Circular Central (Imagen 1) */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                    <div className="w-24 h-24 rounded-full border-[5px] border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                        {settings?.branch.logoUrl ? (
                            <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <span className="text-4xl font-black text-green-500">{settings?.company.name.charAt(0)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Info del Local & Selector (Imagen 1) */}
            <div className="mt-14 text-center px-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{settings?.company.name || 'Menú de Ejemplo'}</h1>
                
                {/* Selector A Domicilio / Para Recoger */}
                <div className="inline-flex bg-gray-100 p-1 rounded-full mt-4 border border-gray-200/50">
                    <button 
                        onClick={() => setOrderType('delivery')}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === 'delivery' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        A domicilio
                    </button>
                    <button 
                        onClick={() => setOrderType('pickup')}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === 'pickup' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        Para recoger
                    </button>
                </div>

                {/* Stats de envío */}
                <div className="flex justify-center items-center gap-10 mt-6">
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tiempo envío</p>
                        <p className="text-sm font-bold text-gray-800">{settings?.shipping.deliveryTime.min} - {settings?.shipping.deliveryTime.max} mins</p>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-200"></div>
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Costo envío</p>
                        <p className="text-sm font-bold text-gray-800">Desde ${settings?.shipping.fixedCost || '20'}</p>
                    </div>
                </div>
            </div>

            {/* 3. Banner Promocional 2x1 (Imagen 1) */}
            {promotions.length > 0 && (
                <div className="px-5 mt-8">
                    <div className="bg-[#FFFDE7] border-2 border-[#FFF9C4] rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm">
                        <div className="z-10">
                            <h3 className="font-bold text-gray-800">2×1 en Hamburguesas</h3>
                            <p className="text-xs text-gray-500">Haz clic para ver más detalles...</p>
                        </div>
                        <div className="absolute right-[-10px] top-0 h-full flex items-center opacity-10 rotate-12">
                            <span className="text-6xl font-black text-yellow-600">2×1</span>
                        </div>
                        <div className="z-10 text-3xl font-black text-[#FBC02D]">2×1</div>
                    </div>
                </div>
            )}

            {/* 4. Categorías Horizontal */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 mt-6">
                <div className="flex overflow-x-auto px-5 py-4 gap-3 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Todo
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. Lista de Productos (Imagen 1) */}
            <div className="px-5 py-6">
                <h2 className="text-xl font-bold text-gray-900 mb-5">Combos</h2>
                <div className="grid grid-cols-1 gap-5">
                    {filteredProducts.map(product => {
                        const { price, promotion } = getDiscountedPrice(product, promotions);
                        return (
                            <div 
                                key={product.id} 
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                                        {product.description}
                                    </p>
                                    <div className="mt-4">
                                        <p className="text-gray-900 font-bold text-lg">${price.toFixed(0)}</p>
                                    </div>
                                </div>
                                <div className="w-28 h-28 rounded-2xl overflow-hidden relative shrink-0 bg-gray-50">
                                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                    {/* Botón "+" sobre la imagen */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }}
                                        className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow-lg text-green-600 border border-gray-50"
                                    >
                                        <IconPlus className="h-6 w-6"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Botón Carrito Flotante (Siguiendo Referencia Imagen 1) */}
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-5 right-5 z-50 max-w-md mx-auto">
                    <button 
                        onClick={() => setView('cart')}
                        className="w-full bg-[#81C784] hover:bg-green-500 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center transition-all active:scale-95"
                    >
                        Agrega productos para continuar
                    </button>
                </div>
            )}

            {/* MODAL HORARIO (Imagen 3) */}
            <ReferenceModal title="Horario" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {settings?.schedules[0].days.map(d => (
                        <div key={d.day} className="flex flex-col border-b border-gray-50 pb-2">
                            <span className="font-bold text-gray-800 text-sm">{d.day}</span>
                            <span className="text-gray-400 text-xs">
                                {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : 'Abierto todo el día') : 'Cerrado'}
                            </span>
                        </div>
                    ))}
                </div>
            </ReferenceModal>

            {/* MODAL UBICACIÓN (Imagen 2) */}
            <ReferenceModal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                <div className="text-center">
                    <p className="text-gray-600 text-sm leading-relaxed mb-8">
                        {settings?.branch.fullAddress || 'Calle 44 #398, Los Pinos, Mérida, Yucatán (Frente a la escuela secundaria ESFER)'}
                    </p>
                    <a 
                        href={settings?.branch.googleMapsLink || '#'} 
                        target="_blank" 
                        className="flex items-center justify-center gap-2 w-full bg-[#4CAF50] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-green-600 transition-all mb-4"
                    >
                        Ver la ubicación en el mapa <IconExternalLink className="h-4 w-4"/>
                    </a>
                </div>
            </ReferenceModal>

            <Chatbot />
        </div>
    );
}
