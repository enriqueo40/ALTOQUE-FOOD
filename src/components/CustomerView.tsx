
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconDelivery } from '../constants';
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

// --- Sub-Components ---

// Fix: Typed ProductCard as React.FC to properly handle the 'key' prop used during list rendering.
const ProductCard: React.FC<{ product: Product; promotions: Promotion[]; onClick: () => void }> = ({ product, promotions, onClick }) => {
    const { price, promotion } = getDiscountedPrice(product, promotions);
    
    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all flex flex-row h-32 group relative"
        >
            <div className="w-32 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                />
                {promotion && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {promotion.discountType === DiscountType.Percentage ? `-${promotion.discountValue}%` : 'OFERTA'}
                    </div>
                )}
            </div>
            <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-tight">{product.description}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        {promotion && <span className="text-[10px] text-gray-400 line-through">${product.price.toFixed(2)}</span>}
                        <span className="font-black text-gray-900 dark:text-white text-sm">
                            <span className="text-[10px] text-gray-500 mr-1 font-normal">Desde</span>
                            ${price.toFixed(2)}
                        </span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-emerald-100 dark:border-emerald-800">
                        <IconPlus className="h-4 w-4"/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
            setAllPersonalizations(fetchedPersonalizations);
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

    const scrollToCategory = (id: string) => {
        setSelectedCategory(id);
        const element = categoryRefs.current[id];
        if (element) {
            const offset = 140; // Ajuste para el header fijo
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
                {/* Hero / Header Section */}
                <div className="relative">
                    <div className="h-48 w-full bg-emerald-600 overflow-hidden relative">
                        {settings?.branch.coverImageUrl ? (
                            <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover brightness-75" alt="Cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-800" />
                        )}
                        <div className="absolute top-4 right-4 flex gap-2">
                             <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white"><IconClock className="h-5 w-5"/></button>
                             <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white"><IconLocationMarker className="h-5 w-5"/></button>
                             <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white"><IconShare className="h-5 w-5"/></button>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 px-4 pb-4 shadow-sm relative">
                        {/* Logo Overlay */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full p-1 shadow-xl border-2 border-white dark:border-gray-700">
                                {settings?.branch.logoUrl ? (
                                    <img src={settings.branch.logoUrl} className="w-full h-full rounded-full object-cover" alt="Logo" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase">
                                        {settings?.company.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-12 text-center">
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                                {settings?.branch.alias || settings?.company.name}
                            </h1>
                            
                            {/* Order Type Toggle */}
                            <div className="mt-4 flex justify-center">
                                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full flex gap-1">
                                    <button 
                                        onClick={() => setOrderType(OrderType.Delivery)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === OrderType.Delivery ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        A domicilio
                                    </button>
                                    <button 
                                        onClick={() => setOrderType(OrderType.TakeAway)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === OrderType.TakeAway ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        Para recoger
                                    </button>
                                </div>
                            </div>

                            {/* Logistics Info */}
                            <div className="mt-4 flex justify-center gap-8 border-t dark:border-gray-700 pt-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Tiempo envío</p>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {orderType === OrderType.Delivery 
                                            ? `${settings?.shipping.deliveryTime.min} - ${settings?.shipping.deliveryTime.max} mins`
                                            : `${settings?.shipping.pickupTime.min} mins`
                                        }
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Costo envío</p>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {orderType === OrderType.Delivery 
                                            ? settings?.shipping.costType === ShippingCostType.Fixed ? `$${settings.shipping.fixedCost?.toFixed(2)}` : 'Por cotizar'
                                            : 'Gratis'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Navigation */}
                <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-md border-b dark:border-gray-700">
                    <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar scroll-smooth">
                        <button
                            onClick={() => scrollToCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                        >
                            Todo
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Content */}
                <div className="mt-4 px-4 space-y-10">
                    {/* Active Promotions Banner */}
                    {allPromotions.length > 0 && (
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-yellow-800 dark:text-yellow-400 text-sm uppercase">{allPromotions[0].name}</h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-500 font-bold">Haz clic para ver más detalles...</p>
                            </div>
                            <span className="text-3xl font-black text-yellow-500 opacity-50 italic">PROMO</span>
                        </div>
                    )}

                    {allCategories.map(category => {
                        const categoryProducts = allProducts.filter(p => p.categoryId === category.id && p.available);
                        if (categoryProducts.length === 0) return null;

                        return (
                            <div key={category.id} ref={el => categoryRefs.current[category.id] = el}>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter border-b-2 border-emerald-500 inline-block mb-6">
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryProducts.map(product => (
                                        <ProductCard 
                                            key={product.id} 
                                            product={product} 
                                            promotions={allPromotions} 
                                            onClick={() => setSelectedProduct(product)} 
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Floating Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t dark:border-gray-800 z-50">
                    <div className="max-w-2xl mx-auto">
                        {itemCount > 0 ? (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/30 flex justify-between items-center px-6 transform active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-800 px-2.5 py-1 rounded-lg text-xs font-black">{itemCount}</div>
                                    <span className="uppercase tracking-tighter">Ver mi pedido</span>
                                </div>
                                <span className="font-mono">${cartTotal.toFixed(2)}</span>
                            </button>
                        ) : (
                            <button className="w-full bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed">
                                Agrega productos para continuar
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Product Detail Modal stays similar but with updated branding */}
                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onAddToCart={addToCart} 
                        onClose={() => setSelectedProduct(null)}
                        personalizations={allPersonalizations.filter(p => selectedProduct.personalizationIds?.includes(p.id))}
                        promotions={allPromotions}
                    />
                )}
                
                <Chatbot />
            </div>
        );
    }

    // Default simplified views for Cart/Checkout
    return <div className="p-10 text-center">Vistas auxiliares en proceso de optimización estética.</div>;
}

// --- ProductDetailModal Re-implementation for brevity and integration ---
const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number, comments?: string, options?: PersonalizationOption[]) => void, 
    onClose: () => void,
    personalizations: Personalization[],
    promotions: Promotion[]
}> = ({product, onAddToCart, onClose, personalizations, promotions}) => {
    const [quantity, setQuantity] = useState(1);
    const [comments, setComments] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<{ [personalizationId: string]: PersonalizationOption[] }>({});

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const { price: basePrice } = getDiscountedPrice(product, promotions);

    const handleOptionToggle = (personalization: Personalization, option: PersonalizationOption) => {
        setSelectedOptions(prev => {
            const currentSelection = prev[personalization.id] || [];
            if (personalization.maxSelection === 1) return { ...prev, [personalization.id]: [option] };
            if (currentSelection.some(opt => opt.id === option.id)) {
                return { ...prev, [personalization.id]: currentSelection.filter(opt => opt.id !== option.id) };
            } else {
                if (personalization.maxSelection && currentSelection.length >= personalization.maxSelection) return prev;
                return { ...prev, [personalization.id]: [...currentSelection, option] };
            }
        });
    };

    const totalOptionsPrice = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, options) => acc + options.reduce((sum, opt) => sum + (opt.price || 0), 0), 0);
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;
    
    return (
        <div className={`fixed inset-0 z-[60] flex items-end justify-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[2.5rem] shadow-2xl max-h-[95vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="h-2 w-12 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-4 shrink-0" />
                
                <div className="flex-1 overflow-y-auto px-6 pb-32">
                    <img src={product.imageUrl} className="w-full h-56 object-cover rounded-3xl shadow-lg mb-6" alt={product.name} />
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{product.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{product.description}</p>
                    
                    <div className="mt-8 space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">{p.name}</h4>
                                    {p.minSelection && p.minSelection > 0 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Obligatorio</span>}
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = selectedOptions[p.id]?.some(o => o.id === opt.id);
                                        return (
                                            <div 
                                                key={opt.id} 
                                                onClick={() => handleOptionToggle(p, opt)}
                                                className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-100 dark:border-gray-800'}`}
                                            >
                                                <span className={`text-sm font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>{opt.name}</span>
                                                <span className="text-xs font-mono text-emerald-600">{opt.price > 0 ? `+$${opt.price.toFixed(2)}` : 'Gratis'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-900 border-t dark:border-gray-800 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-black text-xl w-8 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><IconPlus className="h-5 w-5"/></button>
                        </div>
                        <button 
                            onClick={() => { onAddToCart(product, quantity, comments, Object.values(selectedOptions).flat()); handleClose(); }}
                            className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20"
                        >
                            Añadir ${totalPrice.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
