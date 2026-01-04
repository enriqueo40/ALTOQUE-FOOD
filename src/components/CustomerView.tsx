
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconTag, IconExternalLink, IconStore } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Helper: Lógica de Apertura ---
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

// --- Modales Reutilizables ---
const Modal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-white relative">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX className="h-6 w-6" /></button>
                    <h3 className="text-xl font-bold text-gray-800 absolute left-1/2 -translate-x-1/2">{title}</h3>
                </div>
                <div className="p-6">{children}</div>
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

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* 1. Header & Cover (Imagen 1) */}
            <div className="relative">
                <div className="h-64 sm:h-80 w-full overflow-hidden rounded-b-[3rem] shadow-lg">
                    <img 
                        src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                        className="w-full h-full object-cover" 
                        alt="Portada"
                    />
                </div>
                
                {/* Botones Flotantes (Superior Derecha) */}
                <div className="absolute top-6 right-6 flex gap-3">
                    <button onClick={() => setActiveModal('hours')} className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-gray-700 hover:bg-white transition-all"><IconClock className="h-5 w-5"/></button>
                    <button onClick={() => setActiveModal('location')} className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-gray-700 hover:bg-white transition-all"><IconLocationMarker className="h-5 w-5"/></button>
                    <button className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-gray-700 hover:bg-white transition-all"><IconShare className="h-5 w-5"/></button>
                </div>

                {/* Logo Central (Imagen 1) */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                        {settings?.branch.logoUrl ? (
                            <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <span className="text-4xl font-black text-green-500">{settings?.company.name.charAt(0)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Store Info & Selector (Imagen 1) */}
            <div className="mt-16 text-center px-6">
                <h1 className="text-2xl font-bold text-gray-800">{settings?.company.name || 'Cargando...'}</h1>
                
                {/* Order Type Toggle */}
                <div className="inline-flex bg-gray-200/50 p-1 rounded-full mt-4 border border-gray-200">
                    <button 
                        onClick={() => setOrderType('delivery')}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${orderType === 'delivery' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        A domicilio
                    </button>
                    <button 
                        onClick={() => setOrderType('pickup')}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${orderType === 'pickup' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        Para recoger
                    </button>
                </div>

                {/* Delivery Stats */}
                <div className="flex justify-center gap-8 mt-6">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tiempo envío</p>
                        <p className="text-sm font-bold text-gray-700">{settings?.shipping.deliveryTime.min} - {settings?.shipping.deliveryTime.max} mins</p>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Costo envío</p>
                        <p className="text-sm font-bold text-gray-700">Desde ${settings?.shipping.fixedCost || '20'}</p>
                    </div>
                </div>
            </div>

            {/* 3. Banner Promocional (Imagen 1 - Amarillo) */}
            {promotions.length > 0 && (
                <div className="px-6 mt-8">
                    <div className="bg-[#FFFDE7] border-2 border-[#FFF9C4] rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group cursor-pointer shadow-sm">
                        <div className="z-10">
                            <h3 className="font-bold text-gray-800">2×1 en Hamburguesas</h3>
                            <p className="text-xs text-gray-500">Haz clic para ver más detalles...</p>
                        </div>
                        <div className="absolute right-0 top-0 h-full flex items-center bg-[#FDD835]/10 px-4">
                            <span className="text-4xl font-black text-[#FBC02D] opacity-40">2×1</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Categorías Horizontal */}
            <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md border-b border-gray-200 mt-8">
                <div className="flex overflow-x-auto px-6 py-4 gap-3 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Todo
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-green-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. Grilla de Productos (Imagen 1 - Estilo Carta) */}
            <div className="px-6 py-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Combos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProducts.map(product => {
                        const { price, promotion } = getDiscountedPrice(product, promotions);
                        return (
                            <div 
                                key={product.id} 
                                className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4 flex gap-4 hover:shadow-md transition-all relative overflow-hidden"
                            >
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{product.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-gray-400 text-xs line-through">{promotion ? `$${product.price.toFixed(0)}` : ''}</p>
                                        <p className="text-lg font-bold text-gray-800">${price.toFixed(0)}</p>
                                    </div>
                                </div>
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden relative bg-gray-100 shrink-0">
                                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                    <button 
                                        onClick={() => addToCart(product, 1)}
                                        className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-lg text-green-600 hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <IconPlus className="h-6 w-6"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Barra de Carrito Flotante */}
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-6 right-6 z-50 max-w-lg mx-auto">
                    <button 
                        onClick={() => setView('cart')}
                        className="w-full bg-green-500/90 backdrop-blur hover:bg-green-600 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 border-green-700"
                    >
                        Agrega productos para continuar
                    </button>
                </div>
            )}

            {/* MODAL: HORARIO (Imagen 3) */}
            <Modal title="Horario" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                <div className="space-y-4">
                    {settings?.schedules[0].days.map(d => (
                        <div key={d.day} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-800">{d.day}</span>
                            <span className="text-gray-500">
                                {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start} - ${s.end}`).join(', ') : 'Abierto todo el día') : 'Cerrado'}
                            </span>
                        </div>
                    ))}
                    <button onClick={() => setActiveModal('none')} className="w-full mt-6 py-3 border rounded-xl font-bold text-gray-700 hover:bg-gray-50">Cerrar</button>
                </div>
            </Modal>

            {/* MODAL: UBICACIÓN (Imagen 2) */}
            <Modal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                <div className="text-center space-y-6">
                    <p className="text-gray-600 font-medium leading-relaxed">
                        {settings?.branch.fullAddress || 'Calle 44 #398, Los Pinos, Mérida, Yucatán (Frente a la escuela secundaria ESFER)'}
                    </p>
                    <a 
                        href={settings?.branch.googleMapsLink || '#'} 
                        target="_blank" 
                        className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-4 rounded-xl font-bold shadow-md hover:bg-green-600 transition-colors"
                    >
                        Ver la ubicación en el mapa <IconExternalLink className="h-4 w-4"/>
                    </a>
                    <button onClick={() => setActiveModal('none')} className="w-full py-3 border rounded-xl font-bold text-gray-700 hover:bg-gray-50">Cerrar</button>
                </div>
            </Modal>

            <Chatbot />
        </div>
    );
}
