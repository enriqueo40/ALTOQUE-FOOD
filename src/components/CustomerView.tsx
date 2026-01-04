
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer, Personalization, PersonalizationOption, OrderStatus, Order, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink, IconMinus, IconCheck, IconStore, IconDelivery, IconArrowLeft } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, getPersonalizations, saveOrder, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Lógica de Negocio ---
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

// --- Componentes UI ---
const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 flex items-center relative border-b border-gray-50">
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <IconX className="h-6 w-6" />
                    </button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800">{title}</h3>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- MODAL DETALLE PRODUCTO (PROFESIONAL) ---
const ProductDetailModal: React.FC<{
    product: Product;
    onClose: () => void;
    onAdd: (product: Product, quantity: number, options: PersonalizationOption[]) => void;
    allPersonalizations: Personalization[];
    promotions: Promotion[];
}> = ({ product, onClose, onAdd, allPersonalizations, promotions }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<PersonalizationOption[]>([]);
    
    const { price: basePrice } = getDiscountedPrice(product, promotions);
    
    const productPersonalizations = useMemo(() => {
        if (!product.personalizationIds) return [];
        return allPersonalizations.filter(p => product.personalizationIds?.includes(p.id));
    }, [product, allPersonalizations]);

    const handleOptionToggle = (option: PersonalizationOption, personalization: Personalization) => {
        if (personalization.maxSelection === 1) {
            setSelectedOptions(prev => [...prev.filter(opt => !personalization.options.some(o => o.id === opt.id)), option]);
        } else {
            const isSelected = selectedOptions.some(o => o.id === option.id);
            if (isSelected) {
                setSelectedOptions(prev => prev.filter(o => o.id !== option.id));
            } else {
                setSelectedOptions(prev => [...prev, option]);
            }
        }
    };

    const totalOptionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    const finalPrice = (basePrice + totalOptionsPrice) * quantity;

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 sm:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-full duration-500">
                <div className="relative h-64 sm:h-72">
                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                    <button onClick={onClose} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-all">
                        <IconX className="h-6 w-6"/>
                    </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed">{product.description}</p>
                    </div>

                    {productPersonalizations.map(pers => (
                        <div key={pers.id} className="space-y-3">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <h4 className="font-bold text-gray-800 text-sm">{pers.name}</h4>
                                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">
                                    {pers.maxSelection === 1 ? 'Obligatorio' : 'Opcional'}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {pers.options.map(opt => {
                                    const isSelected = selectedOptions.some(o => o.id === opt.id);
                                    return (
                                        <label key={opt.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type={pers.maxSelection === 1 ? 'radio' : 'checkbox'} 
                                                    className="hidden"
                                                    checked={isSelected}
                                                    onChange={() => handleOptionToggle(opt, pers)}
                                                />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                                    {isSelected && <IconCheck className="text-white h-3 w-3"/>}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{opt.name}</span>
                                            </div>
                                            {opt.price > 0 && <span className="text-xs font-bold text-green-600">+${opt.price}</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                    <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
                        <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-2 text-gray-500 hover:text-green-600"><IconMinus className="h-5 w-5"/></button>
                        <span className="w-8 text-center font-bold text-gray-800">{quantity}</span>
                        <button onClick={() => setQuantity(q => q+1)} className="p-2 text-gray-500 hover:text-green-600"><IconPlus className="h-5 w-5"/></button>
                    </div>
                    <button 
                        onClick={() => { onAdd(product, quantity, selectedOptions); onClose(); }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        Agregar <span className="opacity-60">|</span> ${finalPrice.toFixed(0)}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [activeModal, setActiveModal] = useState<'hours' | 'location' | 'none'>('none');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    
    // Data states
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);

    // Checkout form states
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [address, setAddress] = useState({ calle: '', numero: '', colonia: '', referencias: '' });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const loadData = useCallback(async () => {
        try {
            const [s, prm, prod, cat, pers] = await Promise.all([
                getAppSettings(), getPromotions(), getProducts(), getCategories(), getPersonalizations()
            ]);
            setSettings(s);
            setPromotions(prm);
            setProducts(prod);
            setCategories(cat);
            setPersonalizations(pers);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        subscribeToMenuUpdates(loadData);
        return () => unsubscribeFromChannel();
    }, [loadData]);

    const isOpen = useMemo(() => settings ? checkIfOpen(settings.schedules) : true, [settings]);

    const handlePlaceOrder = async () => {
        if (!customerName || !customerPhone || (orderType === OrderType.Delivery && !address.calle)) {
            alert("Por favor completa los datos obligatorios.");
            return;
        }

        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalWithShipping = cartTotal + shippingCost;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer: { name: customerName, phone: customerPhone, address: { ...address, googleMapsLink: '' } },
            items: cartItems,
            total: totalWithShipping,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            orderType: orderType,
            paymentStatus: 'pending'
        };

        try {
            await saveOrder(newOrder);
            // Formatear mensaje de WhatsApp
            const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name} ${i.selectedOptions?.map(o => `(+${o.name})`).join(' ')}`).join('%0A');
            const message = `*NUEVO PEDIDO - ${settings?.company.name}*%0A------------------%0A*Cliente:* ${customerName}%0A*Entrega:* ${orderType}%0A*Dirección:* ${address.calle} #${address.numero}, ${address.colonia}%0A------------------%0A*PEDIDO:*%0A${itemsText}%0A------------------%0A*TOTAL:* $${totalWithShipping.toFixed(2)}`;
            window.open(`https://wa.me/${settings?.branch.whatsappNumber.replace(/\D/g,'')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch (e) {
            alert("Error al procesar el pedido. Intente nuevamente.");
        }
    };

    const filteredProducts = useMemo(() => {
        const available = products.filter(p => p.available);
        return selectedCategory === 'all' ? available : available.filter(p => p.categoryId === selectedCategory);
    }, [products, selectedCategory]);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

    // --- Render: VISTA MENÚ ---
    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-white pb-32 font-sans selection:bg-green-100">
                {!isOpen && (
                    <div className="bg-red-500 text-white text-center py-2 text-[10px] font-black uppercase tracking-widest sticky top-0 z-[60] shadow-lg">
                        ⚠️ Local cerrado en este momento. Solo visualización.
                    </div>
                )}
                
                <div className="relative">
                    <div className="h-56 sm:h-72 w-full overflow-hidden rounded-b-[3rem] shadow-sm">
                        <img src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover" alt="Portada"/>
                    </div>
                    <div className="absolute top-5 right-5 flex gap-2">
                        <button onClick={() => setActiveModal('hours')} className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all"><IconClock className="h-5 w-5"/></button>
                        <button onClick={() => setActiveModal('location')} className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all"><IconLocationMarker className="h-5 w-5"/></button>
                        <button className="p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-gray-700 hover:bg-white transition-all"><IconShare className="h-5 w-5"/></button>
                    </div>
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <div className="w-24 h-24 rounded-full border-[5px] border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                            {settings?.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-4xl font-black text-green-500">{settings?.company.name.charAt(0)}</span>}
                        </div>
                    </div>
                </div>

                <div className="mt-14 text-center px-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{settings?.company.name}</h1>
                    <div className="inline-flex bg-gray-100 p-1 rounded-full mt-4 border border-gray-200/50">
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === OrderType.Delivery ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === OrderType.TakeAway ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Para recoger</button>
                    </div>
                    <div className="flex justify-center items-center gap-10 mt-6">
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tiempo envío</p>
                            <p className="text-sm font-bold text-gray-800">{settings?.shipping.deliveryTime.min}-{settings?.shipping.deliveryTime.max} mins</p>
                        </div>
                        <div className="w-[1px] h-8 bg-gray-200"></div>
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Costo envío</p>
                            <p className="text-sm font-bold text-gray-800">Desde ${settings?.shipping.fixedCost || '20'}</p>
                        </div>
                    </div>
                </div>

                {promotions.length > 0 && (
                    <div className="px-5 mt-8">
                        <div className="bg-[#FFFDE7] border-2 border-[#FFF9C4] rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm">
                            <div className="z-10">
                                <h3 className="font-bold text-gray-800">2×1 en Hamburguesas</h3>
                                <p className="text-xs text-gray-500">Haz clic para ver más detalles...</p>
                            </div>
                            <div className="z-10 text-3xl font-black text-[#FBC02D]">2×1</div>
                        </div>
                    </div>
                )}

                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 mt-6">
                    <div className="flex overflow-x-auto px-5 py-4 gap-3 no-scrollbar">
                        <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-500 border border-gray-200'}`}>Todo</button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-500 border border-gray-200'}`}>{cat.name}</button>
                        ))}
                    </div>
                </div>

                <div className="px-5 py-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-5">Nuestra Carta</h2>
                    <div className="grid grid-cols-1 gap-5">
                        {filteredProducts.map(product => {
                            const { price } = getDiscountedPrice(product, promotions);
                            return (
                                <div key={product.id} onClick={() => setDetailProduct(product)} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                                        <p className="text-gray-900 font-bold text-lg mt-4">${price.toFixed(0)}</p>
                                    </div>
                                    <div className="w-28 h-28 rounded-2xl overflow-hidden relative shrink-0 bg-gray-50">
                                        <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                        <div className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow-lg text-green-600 border border-gray-50"><IconPlus className="h-6 w-6"/></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {itemCount > 0 && (
                    <div className="fixed bottom-6 left-5 right-5 z-50 max-w-md mx-auto">
                        <button onClick={() => setView('checkout')} disabled={!isOpen} className={`w-full ${isOpen ? 'bg-[#81C784] hover:bg-green-500' : 'bg-gray-400'} text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center transition-all active:scale-95`}>
                            {isOpen ? 'Finalizar mi pedido' : 'Cerrado'} • ${cartTotal.toFixed(0)}
                        </button>
                    </div>
                )}

                <ReferenceModal title="Horario" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                    <div className="space-y-4">
                        {settings?.schedules[0].days.map(d => (
                            <div key={d.day} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                <span className="font-bold text-gray-800">{d.day}</span>
                                <span className="text-gray-500">{d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start}-${s.end}`).join(', ') : 'Todo el día') : 'Cerrado'}</span>
                            </div>
                        ))}
                    </div>
                </ReferenceModal>

                <ReferenceModal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                    <div className="text-center space-y-4">
                        <p className="text-gray-600 text-sm leading-relaxed">{settings?.branch.fullAddress || 'Calle Principal #123'}</p>
                        <a href={settings?.branch.googleMapsLink} target="_blank" className="flex items-center justify-center gap-2 w-full bg-[#4CAF50] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-green-600 transition-all">Ver en Google Maps <IconExternalLink className="h-4 w-4"/></a>
                    </div>
                </ReferenceModal>

                {detailProduct && (
                    <ProductDetailModal 
                        product={detailProduct} 
                        onClose={() => setDetailProduct(null)} 
                        onAdd={(p, q, opt) => addToCart(p, q, '', opt)}
                        allPersonalizations={personalizations}
                        promotions={promotions}
                    />
                )}
                <Chatbot />
            </div>
        );
    }

    // --- Render: VISTA CHECKOUT ---
    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <header className="bg-white p-6 shadow-sm flex items-center gap-4">
                    <button onClick={() => setView('menu')} className="p-2 bg-gray-100 rounded-full"><IconArrowLeft className="h-6 w-6"/></button>
                    <h1 className="text-xl font-bold">Finalizar Pedido</h1>
                </header>
                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-3">Tus Datos</h3>
                        <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nombre completo" className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 border-none"/>
                        <input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="Teléfono / WhatsApp" className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 border-none"/>
                    </div>

                    {orderType === OrderType.Delivery && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-right duration-300">
                            <h3 className="font-bold text-gray-800 border-b pb-3 flex items-center gap-2"><IconDelivery className="h-5 w-5"/> Datos de Envío</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={address.calle} onChange={e=>setAddress({...address, calle: e.target.value})} placeholder="Calle" className="w-full p-4 bg-gray-50 rounded-2xl border-none"/>
                                <input value={address.numero} onChange={e=>setAddress({...address, numero: e.target.value})} placeholder="No." className="w-full p-4 bg-gray-50 rounded-2xl border-none"/>
                            </div>
                            <input value={address.colonia} onChange={e=>setAddress({...address, colonia: e.target.value})} placeholder="Colonia / Sector" className="w-full p-4 bg-gray-50 rounded-2xl border-none"/>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-3">Resumen</h3>
                        <div className="space-y-3">
                            {cartItems.map(item => (
                                <div key={item.cartItemId} className="flex justify-between text-sm">
                                    <span className="text-gray-600 font-medium">{item.quantity}x {item.name}</span>
                                    <span className="font-bold">${(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t space-y-2">
                            <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>${cartTotal.toFixed(0)}</span></div>
                            {shippingCost > 0 && <div className="flex justify-between text-gray-500 text-sm"><span>Envío</span><span>+${shippingCost}</span></div>}
                            <div className="flex justify-between text-xl font-bold text-gray-900 mt-2"><span>Total</span><span>${(cartTotal + shippingCost).toFixed(0)}</span></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white border-t">
                    <button onClick={handlePlaceOrder} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold shadow-xl transition-all">Confirmar Pedido</button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-8 animate-bounce"><IconCheck className="h-12 w-12"/></div>
                <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">¡Pedido Enviado!</h1>
                <p className="opacity-80 mb-10 max-w-xs font-medium">Hemos recibido tu orden y te hemos redirigido a WhatsApp. El restaurante te contactará pronto.</p>
                <button onClick={() => { setView('menu'); clearCart(); }} className="bg-white text-green-600 px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-gray-50 transition-all">Regresar al Menú</button>
            </div>
        );
    }

    return null;
}
