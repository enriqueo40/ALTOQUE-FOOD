
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
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    const sessionTotal = useMemo(() => {
        if (!isTableSession) return 0;
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems, isTableSession]);
    
    const [paysWith, setPaysWith] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // --- Sincronización con LocalStorage (SOLO PARA SESIÓN DE MESA) ---
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
        }
    }, [sessionItems, isTableSession]);

    useEffect(() => {
        if (tableInfo) {
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            setOrderType(OrderType.DineIn);
        } else {
            localStorage.removeItem('altoque_table_info');
            if (orderType === OrderType.DineIn) {
                setOrderType(OrderType.Delivery);
            }
        }
    }, [tableInfo]);

    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [customerName, isTableSession]);

    // --- Inicialización y Carga de Datos ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms, pers] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions(), getPersonalizations()
                ]);
                setSettings(s); setAllProducts(p); setAllCategories(c); setAllPromotions(proms); setAllPersonalizations(pers);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone) {
            const newInfo = { table, zone };
            setTableInfo(newInfo);
        }

        return () => unsubscribeFromChannel();
    }, []);

    // --- Lógica Central de Pedidos ---
    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => {
        if (!settings) return;

        const orderId = `#${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');

        try {
            if (isTableSession) {
                if (isFinalClosing) {
                    const msg = [ `💰 *SOLICITUD DE CIERRE DE CUENTA*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, `💵 *TOTAL A PAGAR: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}`, paymentProof ? `✅ Comprobante adjunto` : '', `_Cliente solicita la cuenta para retirarse._` ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    setSessionItems([]); setTableInfo(null); setCustomerName('');
                    localStorage.removeItem('altoque_consumed_items'); localStorage.removeItem('altoque_table_info'); localStorage.removeItem('altoque_customer_name');
                    clearCart(); setView('confirmation');
                } else {
                    const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, tableId: `${tableInfo?.zone} - ${tableInfo?.table}`, paymentStatus: 'pending' };
                    await saveOrder(newOrderData);
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(customer.name);
                    const msg = [ `🔥 *NUEVA RONDA A COCINA*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `🪑 MESA: ${tableInfo.table} (${tableInfo.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`, `💰 Ronda Actual: $${cartTotal.toFixed(2)}`, (sessionItems.length > 0) ? `📈 *Total Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : '', ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    clearCart(); setView('confirmation');
                }
            } else {
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, paymentStatus: 'pending', generalComments: paysWith ? `Cliente pagará con $${paysWith}` : undefined };
                await saveOrder(newOrderData);
                let msg: string;
                if (orderType === OrderType.Delivery) {
                    msg = [ `*${orderId}*`, `*Nombre:* ${customer.name}`, `*Celular:* ${customer.phone}`, `---`, `📍 *Dirección*`, `· *Calle:* ${customer.address.calle}`, `· *Número:* ${customer.address.numero}`, `· *Colonia:* ${customer.address.colonia}`, customer.address.referencias ? `· *Referencias:* ${customer.address.referencias}` : '', customer.address.googleMapsLink ? `· *Ubicación:* ${customer.address.googleMapsLink}` : '', `---`, `💵 *Resumen*`, `· *Productos:* $${cartTotal.toFixed(2)}`, `· *Envío:* 🎈 Por definir 🎈`, `· *Total:* $${cartTotal.toFixed(2)} + envío en ${paymentMethod}`, paysWith ? `· *Cliente pagará con $${paysWith}*` : '' ].filter(Boolean).join('\n');
                } else { // TakeAway
                    msg = [ `🥡 *NUEVO PEDIDO PARA RECOGER*`, `*${orderId}*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `👤 Cliente: ${customer.name}`, `📱 Contacto: ${customer.phone}`,`--------------------------------`, itemsStr, `--------------------------------`, `💰 *Total Pedido: $${cartTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}` ].filter(Boolean).join('\n');
                }
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart(); setView('confirmation');
            }
        } catch (e) {
            alert("Error al procesar el pedido. Intente de nuevo.");
        }
    };


    if (isLoading || !settings) return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        </div>
    );
    
    const headerTitle = view === 'cart' ? (isTableSession ? 'MI RONDA' : 'MI PEDIDO')
                      : view === 'account' ? 'MI CUENTA'
                      : 'CONFIRMAR PEDIDO';
    const confirmationTitle = isFinalClosing ? '¡HASTA PRONTO!' : isTableSession ? '¡A COCINA!' : '¡PEDIDO ENVIADO!';
    const confirmationText = isFinalClosing 
        ? 'Hemos enviado tu solicitud de cierre. Un mesero pasará a confirmar el pago.' 
        : isTableSession 
        ? 'Tu ronda ha sido enviada a cocina. Puedes seguir pidiendo más cosas.'
        : `Tu pedido ha sido enviado. Recibirás una confirmación por WhatsApp.`;
    const confirmationButtonText = isFinalClosing ? 'NUEVO PEDIDO' : 'SEGUIR PIDIENDO';

    return (
        <div className="bg-slate-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-slate-900 min-h-screen relative shadow-2xl border-x border-slate-800 flex flex-col">
                
                {view !== 'menu' && ( <Header title={headerTitle} onBack={() => view === 'checkout' ? (isFinalClosing ? setView('account') : setView('cart')) : setView('menu')} /> )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="pt-8 pb-6 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-slate-800 rounded-full p-1 shadow-2xl mb-6 border-2 border-slate-700 overflow-hidden">
                                    {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-black text-emerald-400 text-3xl bg-slate-700">{settings.company.name.slice(0,2)}</div>}
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
                                                                <button onClick={(e) => { e.stopPropagation(); addToCart(p, 1); }} className="absolute -bottom-2 -right-2 bg-emerald-500 p-2.5 rounded-full shadow-lg border-2 border-slate-900 active:scale-90 transition-transform">
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
                    
                    {view === 'confirmation' && ( <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]"> <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner"><IconCheck className="w-12 h-12 text-emerald-500"/></div> <div className="space-y-4"> <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{confirmationTitle}</h2> <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">{confirmationText}</p> </div> <button onClick={() => { setIsFinalClosing(false); setView('menu'); }} className="w-full max-w-xs bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors border border-slate-700 uppercase tracking-widest text-xs">{confirmationButtonText}</button> </div> )}
                    {view === 'cart' && ( <div className="p-5 animate-fade-in"> <PairingAI items={cartItems} allProducts={allProducts} isTableSession={isTableSession}/> <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">{isTableSession ? 'Tu Ronda Actual' : 'Resumen de tu Pedido'}</h2> <div className="space-y-4"> {cartItems.map(i => ( <div key={i.cartItemId} className="flex gap-4 bg-slate-800/40 p-4 rounded-3xl border border-slate-800/60"> <img src={i.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg" /> <div className="flex-1 flex flex-col justify-center"> <div className="flex justify-between items-start mb-2"> <span className="font-bold text-sm text-gray-100">{i.name}</span> <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span> </div> <div className="flex items-center justify-between"> <div className="flex items-center bg-slate-900 rounded-xl px-2 py-1 border border-slate-800"> <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-1.5 text-gray-400 hover:text-white"><IconMinus className="h-4 w-4"/></button> <span className="w-8 text-center text-xs font-black">{i.quantity}</span> <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-1.5 text-gray-400 hover:text-white"><IconPlus className="h-4 w-4"/></button> </div> <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500/40 hover:text-rose-500 p-2"><IconTrash className="h-5 w-5"/></button> </div> </div> </div> ))} </div> <div className="mt-8 pt-6 border-t border-slate-800"> <div className="flex justify-between font-black text-xl mb-6"> <span className="text-gray-500 text-[10px] tracking-[0.2em] uppercase self-center">{isTableSession ? 'TOTAL RONDA' : 'TOTAL'}</span> <span className="text-emerald-400 text-3xl">${cartTotal.toFixed(2)}</span> </div> <button disabled={cartItems.length === 0} onClick={() => { setIsFinalClosing(false); setView('checkout'); }} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-sm"> {isTableSession ? 'ENVIAR A COCINA' : 'IR A PAGAR'} </button> </div> </div> )}
                    {view === 'account' && isTableSession && ( <div className="p-6 animate-fade-in"> <div className="bg-slate-800/30 p-7 rounded-[2.5rem] border border-slate-800 mb-6 shadow-xl"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3"> <IconReceipt className="h-4 w-4"/> TU CUENTA ACUMULADA </h3> <div className="space-y-4"> {sessionItems.map((item, idx) => ( <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-700/50 pb-3 last:border-0"> <div className="flex gap-4"> <span className="font-black text-gray-500 bg-slate-800 h-6 w-6 flex items-center justify-center rounded-lg text-[10px]">{item.quantity}</span> <span className="font-bold text-gray-300">{item.name}</span> </div> <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span> </div> ))} {sessionItems.length === 0 && <p className="text-center text-gray-500 py-4 italic">Aún no has pedido nada.</p>} </div> <div className="mt-6 pt-6 border-t border-slate-700/50 flex justify-between items-center"> <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">TOTAL A PAGAR</span> <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> </div> </div> <button onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full bg-white text-gray-900 py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"> <IconCheck className="h-5 w-5"/> PEDIR LA CUENTA / PAGAR </button> </div> )}
                    {view === 'checkout' && ( <form id="address-form" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const customer: Customer = { name: fd.get('name') as string, phone: fd.get('phone') as string, address: { calle: fd.get('calle') as string, numero: fd.get('numero') as string, colonia: fd.get('colonia') as string, referencias: fd.get('referencias') as string, googleMapsLink: fd.get('googleMapsLink') as string || undefined }}; handleOrderAction(customer, (fd.get('payment') as PaymentMethod) || 'Efectivo', 0); }} className="p-6 space-y-6 animate-fade-in"> <input type="hidden" name="googleMapsLink" /> <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">TUS DATOS</h3> <input name="name" type="text" className="w-full bg-slate-800 rounded p-3" placeholder="Nombre" required /> <input name="phone" type="tel" className="w-full bg-slate-800 rounded p-3" placeholder="WhatsApp" required /> </div> {orderType === OrderType.Delivery && ( <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">DIRECCIÓN</h3> <input name="calle" className="w-full bg-slate-800 rounded p-3" placeholder="Calle / Avenida" required /> <input name="numero" className="w-full bg-slate-800 rounded p-3" placeholder="Nro Casa/Apto" required /> <input name="colonia" className="w-full bg-slate-800 rounded p-3" placeholder="Colonia / Sector" required /> <textarea name="referencias" className="w-full bg-slate-800 rounded p-3" placeholder="Referencias"></textarea> <button type="button" onClick={() => {}} disabled={isGettingLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-lg font-bold disabled:opacity-50"><IconLocationMarker className="h-5 w-5"/> {isGettingLocation ? 'Obteniendo...' : 'Usar ubicación actual'}</button> </div> )} <div className="space-y-4 p-6 bg-slate-800/30 rounded-xl"> <h3 className="font-bold">PAGO</h3> {(orderType === OrderType.Delivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods).map(m => ( <label key={m} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"> <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" /> <span>{m}</span> </label> ))} <input type="text" name="paysWith" onChange={e => setPaysWith(e.target.value)} className="w-full bg-slate-800 rounded p-3 mt-2" placeholder="¿Pagas con? (Para cambio)" /> </div> <div className="pt-4"> <div className="flex justify-between font-bold text-2xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button type="submit" className="w-full bg-emerald-600 py-4 rounded-lg font-bold flex items-center justify-center gap-3"><IconWhatsapp className="h-5 w-5" /> ENVIAR</button> </div> </form> )}
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
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 p-3">
                        <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl shadow-emerald-900/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-800 w-7 h-7 flex items-center justify-center rounded-lg font-bold text-sm">{itemCount}</div>
                                <span className="uppercase text-sm font-black">VER PEDIDO</span>
                            </div>
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
