
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
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form States
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState({ colonia: '', calle: '', numero: '', referencias: '' });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
    const [generalComments, setGeneralComments] = useState('');

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
            const offset = 140; 
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

    const filteredProducts = useMemo(() => {
        return allProducts.filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProducts, searchTerm]);

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) { alert("Completa tus datos básicos."); return; }
        if (orderType === OrderType.Delivery && (!customerAddress.calle || !customerAddress.colonia)) { alert("Completa tu dirección."); return; }
        if (!selectedPaymentMethod) { alert("Selecciona método de pago."); return; }

        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost || 0) : 0;
        const finalTotal = cartTotal + shippingCost;

        const customer: Customer = {
            name: customerName,
            phone: customerPhone,
            address: orderType === OrderType.Delivery ? customerAddress : { colonia: '', calle: '', numero: '', referencias: '' }
        };

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments,
            orderType: orderType,
            paymentStatus: 'pending'
        };

        try {
            await saveOrder(newOrder);
            const message = encodeURIComponent(`NUEVO PEDIDO WEB\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error al guardar pedido."); }
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

                            {/* Logistics Info Bar */}
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

                {/* Sticky Navigation & Search */}
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
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4"/>
                            <input 
                                type="text"
                                placeholder="Busca tu producto favorito..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-xl pl-10 py-2 text-sm focus:ring-emerald-500 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Menu Content */}
                <div className="mt-4 px-4 space-y-10">
                    {allPromotions.length > 0 && searchTerm === '' && (
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-yellow-800 dark:text-yellow-400 text-sm uppercase">{allPromotions[0].name}</h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-500 font-bold">¡Haz clic en los productos para aplicar!</p>
                            </div>
                            <span className="text-3xl font-black text-yellow-500 opacity-50 italic">OFERTA</span>
                        </div>
                    )}

                    {allCategories.map(category => {
                        const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
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

    if (view === 'cart') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
                <header className="bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center gap-3 sticky top-0 z-30">
                    <button onClick={() => setView('menu')} className="p-2 hover:bg-gray-100 rounded-full"><IconArrowLeft className="h-6 w-6 text-gray-900 dark:text-white"/></button>
                    <h1 className="font-black text-xl uppercase tracking-tighter">Mi Carrito</h1>
                </header>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {cartItems.map((item, idx) => (
                        <div key={item.cartItemId} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 flex gap-4 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                            <img src={item.imageUrl} className="w-20 h-20 rounded-xl object-cover" alt={item.name} />
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-sm dark:text-white uppercase tracking-tight">{item.name}</h4>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500"><IconTrash className="h-5 w-5"/></button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-emerald-600">${(item.price * item.quantity).toFixed(2)}</span>
                                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="p-1"><IconMinus className="h-4 w-4"/></button>
                                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="p-1"><IconPlus className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-t-3xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Total del carrito</span>
                        <span className="text-2xl font-black text-emerald-600">${cartTotal.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all">
                        FINALIZAR PEDIDO
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost || 0) : 0;
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
                <header className="bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center gap-3 sticky top-0 z-30">
                    <button onClick={() => setView('cart')} className="p-2 hover:bg-gray-100 rounded-full"><IconArrowLeft className="h-6 w-6 text-gray-900 dark:text-white"/></button>
                    <h1 className="font-black text-xl uppercase tracking-tighter">Checkout</h1>
                </header>
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-black mb-4 uppercase text-xs tracking-widest text-gray-400">Tipo de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center gap-2 transition-all ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>
                                <IconDelivery className="h-7 w-7"/> DOMICILIO
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center gap-2 transition-all ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>
                                <IconStore className="h-7 w-7"/> RECOGER
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="font-black uppercase text-xs tracking-widest text-gray-400">Tus Datos</h3>
                        <input type="text" placeholder="Nombre completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                        <input type="tel" placeholder="WhatsApp / Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                        {orderType === OrderType.Delivery && (
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <input type="text" placeholder="Calle y Número" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                                <input type="text" placeholder="Colonia / Sector" value={customerAddress.colonia} onChange={e => setCustomerAddress({...customerAddress, colonia: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                            </div>
                        )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-black mb-4 uppercase text-xs tracking-widest text-gray-400">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(m => (
                                <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`p-3 text-xs font-black rounded-xl border-2 transition-all ${selectedPaymentMethod === m ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-50 dark:border-gray-700 text-gray-500'}`}>
                                    {m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-t-3xl shadow-lg">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                            <span>Subtotal</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        {shippingCost > 0 && (
                            <div className="flex justify-between text-emerald-600 font-bold uppercase text-[10px] tracking-widest">
                                <span>Envío</span>
                                <span>+${shippingCost.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-2xl font-black pt-2 border-t dark:border-gray-700">
                            <span className="text-gray-900 dark:text-white">TOTAL</span>
                            <span className="text-emerald-600">${(cartTotal + shippingCost).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={handlePlaceOrder} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        <IconWhatsapp className="h-6 w-6"/> CONFIRMAR POR WHATSAPP
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                    <IconCheck className="h-12 w-12 text-emerald-600" />
                </div>
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">¡Pedido Enviado!</h1>
                <p className="text-emerald-50 mb-10 font-bold">Te hemos redirigido a WhatsApp para procesar tu orden. El restaurante te contactará en breve.</p>
                <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-colors uppercase tracking-widest text-sm">
                    Hacer otro pedido
                </button>
            </div>
        )
    }

    return null;
}

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

                    <div className="mt-8">
                         <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-3">Notas adicionales</h4>
                         <textarea 
                            value={comments} 
                            onChange={e => setComments(e.target.value)}
                            placeholder="Ej. Sin cebolla, extra salsa..."
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm resize-none h-24"
                         />
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
