
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, Schedule, ShippingCostType, DaySchedule, Address } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles, IconClock, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Helpers de Horario ---
const getStoreStatus = (schedules: Schedule[]): { isOpen: boolean; message: string } => {
    if (!schedules || schedules.length === 0) {
        return { isOpen: true, message: 'Abierto' };
    }
    const mainSchedule = schedules[0];
    const now = new Date();
    const dayOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const todaySchedule = mainSchedule.days.find(d => d.day === dayOfWeek);

    if (!todaySchedule || !todaySchedule.isOpen) return { isOpen: false, message: 'Cerrado Ahora' };
    if (todaySchedule.shifts.length === 0) return { isOpen: true, message: 'Abierto Ahora' };

    for (const shift of todaySchedule.shifts) {
        if (currentTime >= shift.start && currentTime < shift.end) return { isOpen: true, message: `Abierto Ahora` };
    }

    return { isOpen: false, message: 'Cerrado Ahora' };
};


// --- Sub-componentes ---

const ScheduleModal: React.FC<{ isOpen: boolean; onClose: () => void; schedules: Schedule[] }> = ({ isOpen, onClose, schedules }) => {
    if (!isOpen || !schedules || schedules.length === 0) return null;
    
    const mainSchedule = schedules[0];
    const daysOrder: DaySchedule['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const sortedDays = mainSchedule.days.sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><IconClock className="h-5 w-5 text-emerald-400"/> Nuestros Horarios</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><IconX/></button>
                </div>
                <div className="space-y-3">
                    {sortedDays.map(day => (
                        <div key={day.day} className="flex justify-between items-center text-sm border-b border-gray-800 pb-3 last:border-0">
                            <span className="font-semibold text-gray-300">{day.day}</span>
                            <div className="text-right">
                                {!day.isOpen || day.shifts.length === 0 ? (
                                    <span className="text-rose-400 font-medium">Cerrado</span>
                                ) : (
                                    day.shifts.map((shift, index) => (
                                        <span key={index} className="block text-gray-400 font-mono">{shift.start} - {shift.end}</span>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur-md z-30 border-b border-slate-800 shadow-sm">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-slate-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const PairingAI: React.FC<{ items: CartItem[], allProducts: Product[], isTableSession: boolean }> = ({ items, allProducts, isTableSession }) => {
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const consumedItemsRaw = isTableSession ? localStorage.getItem('altoque_consumed_items') : null;
        const hasConsumedItems = consumedItemsRaw && JSON.parse(consumedItemsRaw).length > 0;

        if (items.length > 0 || hasConsumedItems) {
            setLoading(true);
            getPairingSuggestion(items, allProducts).then(res => {
                if (isMounted) {
                    setSuggestion(res);
                    setLoading(false);
                }
            });
        } else {
            setSuggestion("");
        }
        return () => { isMounted = false; };
    }, [items, allProducts, isTableSession]);

    if (!suggestion && !loading) return null;

    return (
        <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl flex items-start gap-3 animate-fade-in shadow-lg shadow-indigo-500/10">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">MARIDAJE (IA)</p>
                {loading ? (
                    <div className="h-3 w-32 bg-slate-700 rounded animate-pulse mt-1"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug font-medium">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

// --- Helper de Precio ---
const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.appliesTo === 'all_products') return true;
        return p.productIds.includes(product.id);
    });

    if (activePromotions.length === 0) return { price: product.price };

    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;

    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === 'percentage') {
            currentPrice = product.price * (1 - promo.discountValue / 100);
        } else {
            currentPrice = Math.max(0, product.price - promo.discountValue);
        }
        if (currentPrice < bestPrice) {
            bestPrice = currentPrice;
            bestPromo = promo;
        }
    });

    return { price: bestPrice, promotion: bestPromo };
};

// --- Vista Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- ESTADO PERSISTENTE DE MESA ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [orderType, setOrderType] = useState<OrderType>(() => {
        return localStorage.getItem('altoque_table_info') ? OrderType.DineIn : OrderType.Delivery;
    });

    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        if (!localStorage.getItem('altoque_table_info')) return [];
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => {
        if (!localStorage.getItem('altoque_table_info')) return '';
        return localStorage.getItem('altoque_customer_name') || ''
    });

    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    const sessionTotal = useMemo(() => {
        if (!isTableSession) return 0;
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems, isTableSession]);
    
    const [paysWith, setPaysWith] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    useEffect(() => {
        if (isTableSession) localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
    }, [sessionItems, isTableSession]);

    useEffect(() => {
        if (tableInfo) {
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            setOrderType(OrderType.DineIn);
        } else {
            localStorage.removeItem('altoque_table_info');
            if (orderType === OrderType.DineIn) setOrderType(OrderType.Delivery);
        }
    }, [tableInfo]);

    useEffect(() => {
        if (isTableSession) localStorage.setItem('altoque_customer_name', customerName);
    }, [customerName, isTableSession]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms] = await Promise.all([ getAppSettings(), getProducts(), getCategories(), getPromotions() ]);
                setSettings(s); setAllProducts(p); setAllCategories(c); setAllPromotions(proms);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone) setTableInfo({ table, zone });

        return () => unsubscribeFromChannel();
    }, []);
    
    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert("La geolocalización no es compatible.");
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const link = `https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}`;
                const form = document.getElementById('address-form') as HTMLFormElement;
                if (form) (form.elements.namedItem('googleMapsLink') as HTMLInputElement).value = link;
                alert("Ubicación capturada.");
                setIsGettingLocation(false);
            },
            () => {
                alert("No se pudo obtener la ubicación.");
                setIsGettingLocation(false);
            }
        );
    };

    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod) => {
        if (!settings) return;
        
        const orderId = `#${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');

        try {
            if (isTableSession) {
                 if (isFinalClosing) {
                    const msg = [ `💰 *CIERRE DE CUENTA*`, `📍 *${settings.company.name}*`, `--------------------------------`, `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, `💵 *TOTAL: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}` ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    setSessionItems([]); setTableInfo(null); setCustomerName('');
                    localStorage.clear();
                    clearCart(); setView('confirmation');
                 } else {
                    const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, tableId: `${tableInfo?.zone} - ${tableInfo?.table}`, paymentStatus: 'pending' };
                    await saveOrder(newOrderData);
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(customer.name);
                    const msg = [ `🔥 *NUEVA RONDA*`, `📍 *${settings.company.name}*`, `--------------------------------`, `🪑 MESA: ${tableInfo.table} (${tableInfo.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`, `💰 Ronda: $${cartTotal.toFixed(2)}`, (sessionItems.length > 0) ? `📈 *Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : '', ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    clearCart(); setView('confirmation');
                 }
            } else {
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, paymentStatus: 'pending', generalComments: paysWith ? `Paga con $${paysWith}` : undefined };
                await saveOrder(newOrderData);
                let msg: string;
                if(orderType === OrderType.Delivery) {
                     msg = [ `*${orderId}*`, `*Nombre:* ${customer.name}`, `*Celular:* ${customer.phone}`, `---`, `📍 *Dirección*`, `· *Calle:* ${customer.address.calle}`, `· *Número:* ${customer.address.numero}`, `· *Colonia:* ${customer.address.colonia}`, customer.address.referencias && `· *Ref:* ${customer.address.referencias}`, customer.address.googleMapsLink && `· *Ubicación:* ${customer.address.googleMapsLink}`, `---`, `💵 *Resumen*`, `· *Productos:* $${cartTotal.toFixed(2)}`, `· *Envío:* 🎈 Por definir 🎈`, `· *Total:* $${cartTotal.toFixed(2)} + envío en ${paymentMethod}`, paysWith && `· *Paga con $${paysWith}*` ].filter(Boolean).join('\n');
                } else {
                     msg = [ `🥡 *PEDIDO PARA RECOGER*`, `*${orderId}*`, `📍 *${settings.company.name}*`, `--------------------------------`, `👤 Cliente: ${customer.name}`, `📱 Contacto: ${customer.phone}`,`--------------------------------`, itemsStr, `--------------------------------`, `💰 *Total: $${cartTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}` ].filter(Boolean).join('\n');
                }
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart(); setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar el pedido.");
        }
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
    );
    
    const headerTitle = view === 'cart' ? 'MI PEDIDO' : 'CONFIRMAR';
    const confirmationTitle = '¡PEDIDO ENVIADO!';
    const confirmationText = `Tu pedido ha sido enviado. Recibirás confirmación por WhatsApp.`;

    return (
        <div className="bg-slate-900 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-slate-900 min-h-screen relative shadow-2xl border-x border-slate-800 flex flex-col">
                
                {view !== 'menu' && ( <Header title={headerTitle} onBack={() => setView(view === 'checkout' ? 'cart' : 'menu')} /> )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="pt-8 pb-6 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center font-black text-emerald-400 text-3xl mb-6 shadow-lg">
                                    {settings.company.name.slice(0, 2)}
                                </div>
                                {!isTableSession ? (
                                    <div className="w-full max-w-xs bg-slate-800 rounded-full p-1 flex relative border border-slate-700">
                                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-slate-400'}`}>DOMICILIO</button>
                                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-slate-400'}`}>RECOGER</button>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                                        <IconTableLayout className="h-5 w-5"/>
                                        Estás en la mesa {tableInfo.table} ({tableInfo.zone})
                                    </div>
                                )}
                            </div>
                            <div className="px-4 pb-4 space-y-6">
                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                {cat.name}
                                            </h3>
                                            <div className="space-y-3">
                                                {products.map(p => {
                                                    const { price: displayPrice, promotion } = getDiscountedPrice(p, allPromotions);
                                                    return (
                                                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-slate-800 p-3 rounded-2xl flex gap-4 cursor-pointer transition-transform active:scale-95 border border-transparent hover:border-emerald-500/30">
                                                            <div className="relative shrink-0">
                                                                <img src={p.imageUrl} className="w-24 h-24 rounded-lg object-cover" />
                                                                {promotion && (
                                                                    <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                                                                        OFERTA
                                                                    </div>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); addToCart(p, 1); }} 
                                                                    className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full shadow-lg border-2 border-slate-900 active:scale-90 transition-transform">
                                                                    <IconPlus className="h-4 w-4 text-white"/>
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center py-1">
                                                                <h4 className="font-bold text-white leading-tight">{p.name}</h4>
                                                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{p.description}</p>
                                                                <div className="flex items-baseline gap-2 mt-auto pt-1">
                                                                    <span className="font-bold text-lg text-emerald-400">${displayPrice.toFixed(2)}</span>
                                                                    {promotion && <span className="text-sm text-gray-500 line-through">${p.price.toFixed(2)}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {view === 'confirmation' && ( <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in"><div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20"><IconCheck className="w-12 h-12 text-emerald-500"/></div><div className="space-y-4"><h2 className="text-4xl font-black text-white">{confirmationTitle}</h2><p className="text-gray-500 text-sm">{confirmationText}</p></div><button onClick={() => setView('menu')} className="w-full max-w-xs bg-slate-800 text-white py-4 rounded-xl font-bold">HACER OTRO PEDIDO</button></div> )}
                    {view === 'cart' && ( <div className="p-5 animate-fade-in"> <PairingAI items={cartItems} allProducts={allProducts} isTableSession={isTableSession}/> <h2 className="text-xl font-black text-white mb-6">Resumen de tu Pedido</h2> <div className="space-y-4"> {cartItems.map(i => ( <div key={i.cartItemId} className="flex gap-4"> <img src={i.imageUrl} className="w-20 h-20 rounded-xl object-cover" /> <div className="flex-1"> <div className="flex justify-between"> <span className="font-bold">{i.name}</span> <span>${(i.price * i.quantity).toFixed(2)}</span> </div> <div className="flex items-center justify-between mt-2"> <div className="flex items-center bg-slate-800 rounded-lg"> <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-2"><IconMinus className="h-4 w-4"/></button> <span className="w-8 text-center text-sm font-bold">{i.quantity}</span> <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-2"><IconPlus className="h-4 w-4"/></button> </div> <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500"><IconTrash/></button> </div> </div> </div> ))} </div> <div className="mt-8 pt-6 border-t border-slate-800"> <div className="flex justify-between font-bold text-xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button disabled={cartItems.length === 0} onClick={() => setView('checkout')} className="w-full bg-emerald-600 py-4 rounded-lg font-bold disabled:opacity-50">IR A PAGAR</button> </div> </div> )}
                    {view === 'checkout' && ( <form id="address-form" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const customer: Customer = { name: fd.get('name') as string, phone: fd.get('phone') as string, address: { calle: fd.get('calle') as string, numero: fd.get('numero') as string, colonia: fd.get('colonia') as string, referencias: fd.get('referencias') as string, googleMapsLink: fd.get('googleMapsLink') as string || undefined }}; handleOrderAction(customer, (fd.get('payment') as PaymentMethod) || 'Efectivo'); }} className="p-6 space-y-6 animate-fade-in"> <input type="hidden" name="googleMapsLink" /> <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">TUS DATOS</h3> <input name="name" type="text" className="w-full bg-slate-800 rounded p-3" placeholder="Nombre" required /> <input name="phone" type="tel" className="w-full bg-slate-800 rounded p-3" placeholder="WhatsApp" required /> </div> {orderType === OrderType.Delivery && ( <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">DIRECCIÓN</h3> <input name="calle" className="w-full bg-slate-800 rounded p-3" placeholder="Calle / Avenida" required /> <input name="numero" className="w-full bg-slate-800 rounded p-3" placeholder="Nro Casa/Apto" required /> <input name="colonia" className="w-full bg-slate-800 rounded p-3" placeholder="Colonia / Sector" required /> <textarea name="referencias" className="w-full bg-slate-800 rounded p-3" placeholder="Referencias"></textarea> <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-lg font-bold disabled:opacity-50"><IconLocationMarker className="h-5 w-5"/> {isGettingLocation ? 'Obteniendo...' : 'Usar ubicación actual'}</button> </div> )} <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">PAGO</h3> {(orderType === OrderType.Delivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods).map(m => ( <label key={m} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"> <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" /> <span>{m}</span> </label> ))} <input type="text" name="paysWith" onChange={e => setPaysWith(e.target.value)} className="w-full bg-slate-800 rounded p-3 mt-2" placeholder="¿Pagas con? (Para cambio)" /> </div> <div className="pt-4"> <div className="flex justify-between font-bold text-2xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button type="submit" className="w-full bg-emerald-600 py-4 rounded-lg font-bold flex items-center justify-center gap-3"><IconWhatsapp className="h-5 w-5" /> ENVIAR</button> </div> </form> )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-slate-800 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-slate-700">
                            <div className="h-64 relative"><img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /><button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white"><IconX/></button></div>
                            <div className="p-8">
                                <h2 className="text-3xl font-black mb-2 text-white">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-8">{selectedProduct.description}</p>
                                <button onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }} className="w-full bg-emerald-600 py-5 rounded-xl font-black text-white flex justify-between px-6 items-center">
                                    <span>AÑADIR</span>
                                    <span>${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'menu' && itemCount > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
                        <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl shadow-emerald-900/50">
                            <div className="flex items-center gap-3"><div className="bg-emerald-800 px-3 py-1 rounded-lg font-bold">{itemCount}</div><span className="uppercase text-sm font-black">VER PEDIDO</span></div>
                            <span className="font-black text-xl">${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                <Chatbot />
            </div>
             <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
