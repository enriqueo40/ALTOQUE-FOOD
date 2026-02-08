
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, Schedule, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles, IconClock, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur-md z-30 border-b border-gray-800 shadow-sm">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const PairingAI: React.FC<{ items: CartItem[], allProducts: Product[] }> = ({ items, allProducts }) => {
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        // The service will read from localStorage for table sessions, so this works for both cases
        if (items.length > 0) {
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
    }, [items, allProducts]);

    if (!suggestion && !loading) return null;

    return (
        <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl flex items-start gap-3 animate-fade-in shadow-lg shadow-indigo-500/10">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">MARIDAJE (IA)</p>
                {loading ? (
                    <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-1"></div>
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
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems]);

    // --- Sincronización con LocalStorage ---
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

    // --- Inicialización y Carga de Datos ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms] = await Promise.all([getAppSettings(), getProducts(), getCategories(), getPromotions()]);
                setSettings(s); setAllProducts(p); setAllCategories(c); setAllPromotions(proms);
            } finally { setIsLoading(false); }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone && !tableInfo) {
            setTableInfo({ table, zone });
        }

        return () => unsubscribeFromChannel();
    }, []);

    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert("La geolocalización no es compatible.");
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const link = `https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}`;
                const form = document.getElementById('checkout-form') as HTMLFormElement;
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

    // --- Lógica Central de Pedidos (BIFURCADA) ---
    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0, paymentProof?: string | null) => {
        if (!settings) return;

        try {
            if (isTableSession) {
                // --- FLUJO DE PEDIDOS EN MESA ---
                if (isFinalClosing) {
                    const msg = [ `💰 *SOLICITUD DE CIERRE DE CUENTA*`, `📍 *${settings.company.name}*`, `--------------------------------`, `🪑 Mesa: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${customer.name || customerName}`, `--------------------------------`, `💵 *TOTAL: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}`, tipAmount > 0 ? `⭐ Propina: $${tipAmount.toFixed(2)}` : '' ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    setView('confirmation');
                } else {
                    const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, tableId: `${tableInfo!.zone} - ${tableInfo!.table}`, paymentStatus: 'pending' };
                    await saveOrder(newOrderData);
                    setSessionItems(prev => [...prev, ...cartItems]);
                    if (customer.name) setCustomerName(customer.name);
                    const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                    const msg = [ `🔥 *NUEVA RONDA*`, `📍 *${settings.company.name}*`, `--------------------------------`, `🪑 MESA: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`, `💰 Ronda: $${cartTotal.toFixed(2)}`, (sessionItems.length > 0) ? `📈 *Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : '', ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    clearCart();
                    setView('confirmation');
                }
            } else {
                // --- FLUJO DE DELIVERY Y RECOGER (LÓGICA ORIGINAL RESTAURADA) ---
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, paymentStatus: 'pending', generalComments: tipAmount > 0 ? `Paga con $${tipAmount}` : undefined };
                await saveOrder(newOrderData);
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                let msg: string;
                if (orderType === OrderType.Delivery) {
                     msg = [ `*PEDIDO A DOMICILIO*`, `*Nombre:* ${customer.name}`, `*Celular:* ${customer.phone}`, `---`, `📍 *Dirección*`, `· *Calle:* ${customer.address.calle}`, `· *Número:* ${customer.address.numero}`, `· *Colonia:* ${customer.address.colonia}`, customer.address.referencias && `· *Ref:* ${customer.address.referencias}`, customer.address.googleMapsLink && `· *Ubicación:* ${customer.address.googleMapsLink}`, `---`, `💵 *Resumen*`, itemsStr, `---`, `· *Total:* $${cartTotal.toFixed(2)} en ${paymentMethod}`, tipAmount > 0 && `· *Paga con $${tipAmount}*` ].filter(Boolean).join('\n');
                } else {
                     msg = [ `🥡 *PEDIDO PARA RECOGER*`, `📍 *${settings.company.name}*`, `--------------------------------`, `👤 Cliente: ${customer.name}`, `📱 Contacto: ${customer.phone}`,`--------------------------------`, itemsStr, `--------------------------------`, `💰 *Total: $${cartTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}` ].filter(Boolean).join('\n');
                }
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
                setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar el pedido.");
        }
    };
    
    const handleStartNewSession = () => {
        setSessionItems([]); setTableInfo(null); setCustomerName('');
        localStorage.removeItem('altoque_consumed_items');
        localStorage.removeItem('altoque_table_info');
        localStorage.removeItem('altoque_customer_name');
        clearCart(); setIsFinalClosing(false); setView('menu');
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div><p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Cargando menú...</p></div>
    );

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                {view !== 'menu' && ( <Header title={isTableSession ? (view === 'cart' ? 'MI RONDA' : view === 'account' ? 'MI CUENTA' : (isFinalClosing ? 'CERRAR MESA' : 'CONFIRMAR RONDA')) : (view === 'cart' ? 'MI PEDIDO' : 'CONFIRMAR')} onBack={() => { if (view === 'checkout') { isFinalClosing ? setView('account') : setView('cart'); } else { setView('menu'); }}} /> )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && ( <div className="animate-fade-in"> <div className="relative pb-6 border-b border-gray-800"> <div className="h-44 w-full overflow-hidden relative"> {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />} <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div> </div> <div className="px-6 -mt-12 flex flex-col items-center text-center relative z-10"> <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-4 border-gray-900 overflow-hidden"> {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl bg-gray-700">{settings.company.name.slice(0,2)}</div>} </div> {isTableSession ? ( <div className="mb-4 flex flex-col items-center gap-2"> <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2"> <IconTableLayout className="h-4 w-4"/> MESA {tableInfo.table} • {tableInfo.zone} </div> </div> ) : ( <div className="w-full max-w-xs mt-4 bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700"> <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div> <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>DOMICILIO</button> <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>RECOGER</button> </div> )} </div> </div> <div className="p-4 space-y-8 mt-4"> {allCategories.map(cat => { const products = allProducts.filter(p => p.categoryId === cat.id && p.available); if (products.length === 0) return null; return ( <div key={cat.id}> <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">{cat.name}</h3> <div className="grid gap-4"> {products.map(p => ( <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-gray-800/30 p-4 rounded-3xl border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-800/50 group"> <div className="relative shrink-0"> <img src={p.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl" /> <div onClick={(e) => { e.stopPropagation(); addToCart(p, 1);}} className="absolute -bottom-2 -right-2 bg-emerald-600 p-1.5 rounded-xl shadow-lg border-2 border-gray-900 active:scale-90 transition-transform"> <IconPlus className="h-4 w-4 text-white"/> </div> </div> <div className="flex-1 flex flex-col justify-center"> <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-tight">{p.name}</h4> <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.description}</p> <span className="font-black text-emerald-400 text-lg mt-auto">${getDiscountedPrice(p, allPromotions).price.toFixed(2)}</span> </div> </div> ))} </div> </div> ); })} </div> </div> )}
                    
                    {view === 'confirmation' && ( isTableSession ? ( <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]"> <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20"><IconCheck className="w-12 h-12 text-emerald-500"/></div> <div className="space-y-4"> <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{isFinalClosing ? '¡HASTA PRONTO!' : '¡A COCINA!'}</h2> <p className="text-gray-500 text-sm">{isFinalClosing ? 'Hemos enviado tu solicitud. Un mesero pasará a confirmar el pago.' : 'Tu ronda ha sido enviada. Puedes seguir pidiendo.'}</p> </div> <button onClick={isFinalClosing ? handleStartNewSession : () => setView('menu')} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs">{isFinalClosing ? 'INICIAR NUEVO PEDIDO' : 'SEGUIR PIDIENDO'}</button> </div> ) : ( <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]"> <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20"><IconCheck className="w-12 h-12 text-emerald-500"/></div> <div className="space-y-4"> <h2 className="text-4xl font-black text-white uppercase tracking-tighter">¡PEDIDO ENVIADO!</h2> <p className="text-gray-500 text-sm">Recibirás un mensaje de confirmación por WhatsApp en breve.</p> </div> <button onClick={() => setView('menu')} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs">HACER OTRO PEDIDO</button> </div> ) )}
                    
                    {view === 'cart' && ( <div className="p-5 animate-fade-in"> <PairingAI items={cartItems} allProducts={allProducts} /> <h2 className="text-xl font-black text-white mb-6 uppercase">{isTableSession ? 'Tu Ronda Actual' : 'Resumen del Pedido'}</h2> <div className="space-y-4"> {cartItems.map(i => ( <div key={i.cartItemId} className="flex gap-4"> <img src={i.imageUrl} className="w-20 h-20 rounded-xl object-cover" /> <div className="flex-1"> <div className="flex justify-between"> <span className="font-bold">{i.name}</span> <span>${(i.price * i.quantity).toFixed(2)}</span> </div> <div className="flex items-center justify-between mt-2"> <div className="flex items-center bg-gray-800 rounded-lg"> <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-2"><IconMinus className="h-4 w-4"/></button> <span className="w-8 text-center text-sm font-bold">{i.quantity}</span> <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-2"><IconPlus className="h-4 w-4"/></button> </div> <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500"><IconTrash/></button> </div> </div> </div> ))} </div> <div className="mt-8 pt-6 border-t border-gray-800"> <div className="flex justify-between font-black text-xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button disabled={cartItems.length === 0} onClick={() => { setIsFinalClosing(false); setView('checkout'); }} className="w-full bg-emerald-600 py-4 rounded-lg font-bold disabled:opacity-30 uppercase">{isTableSession ? 'Enviar a Cocina' : 'Confirmar Pedido'}</button> </div> </div> )}
                    {view === 'account' && ( <div className="p-6 animate-fade-in"> <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-800"> <h3 className="text-sm font-bold text-emerald-400 uppercase mb-4">Cuenta Acumulada</h3> <div className="space-y-3"> {sessionItems.map((item, idx) => ( <div key={idx} className="flex justify-between text-sm border-b border-gray-800 pb-3"> <span className="font-medium text-gray-300">{item.quantity}x {item.name}</span> <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span> </div> ))} {sessionItems.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">Aún no has pedido nada.</p>} </div> <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center"> <span className="text-gray-400 text-sm font-bold">TOTAL A PAGAR</span> <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> </div> </div> <button onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full mt-6 bg-white text-gray-900 py-4 rounded-lg font-bold uppercase">Pedir la Cuenta / Pagar</button> </div> )}
                    {view === 'checkout' && ( <form id="checkout-form" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const customer: Customer = { name: fd.get('name') as string || customerName, phone: fd.get('phone') as string, address: {calle: fd.get('calle') as string, numero: fd.get('numero') as string, colonia: fd.get('colonia') as string, referencias: fd.get('referencias') as string, googleMapsLink: fd.get('googleMapsLink') as string } }; const paysWith = fd.get('paysWith') as string; handleOrderAction(customer, fd.get('payment') as PaymentMethod || 'Efectivo', parseFloat(paysWith) || 0, (e.currentTarget.querySelector('input[name="proof"]') as any)?.dataset.url); }} className="p-6 space-y-6 animate-fade-in"> {isTableSession ? ( <> {(!customerName) && <input name="name" type="text" className="w-full bg-gray-800 rounded p-3" placeholder="¿A nombre de quién?" required />} {isFinalClosing && (<div className="space-y-4 p-4 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">Pago Final</h3> <select name="payment" className="w-full bg-gray-800 p-3 rounded"><option>Efectivo</option><option>Tarjeta</option></select> {settings.payment.showTipField && <input name="tip" type="number" className="w-full bg-gray-800 p-3 rounded" placeholder="Propina (opcional)"/>} <input name="proof" type="file" className="w-full text-sm"/> </div>)} </> ) : ( <> <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">TUS DATOS</h3> <input name="name" type="text" className="w-full bg-gray-800 rounded p-3" placeholder="Nombre" required /> <input name="phone" type="tel" className="w-full bg-gray-800 rounded p-3" placeholder="WhatsApp" required /> </div> {orderType === OrderType.Delivery && ( <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">DIRECCIÓN</h3> <input type="hidden" name="googleMapsLink" /> <input name="calle" className="w-full bg-gray-800 rounded p-3" placeholder="Calle / Avenida" required /> <input name="numero" className="w-full bg-gray-800 rounded p-3" placeholder="Nro Casa/Apto" required /> <input name="colonia" className="w-full bg-gray-800 rounded p-3" placeholder="Colonia / Sector" required /> <textarea name="referencias" className="w-full bg-gray-800 rounded p-3" placeholder="Referencias"></textarea> <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-lg font-bold disabled:opacity-50"><IconLocationMarker className="h-5 w-5"/> {isGettingLocation ? 'Obteniendo...' : 'Usar ubicación actual'}</button> </div> )} <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">PAGO</h3> {(orderType === OrderType.Delivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods).map(m => ( <label key={m} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"> <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" /> <span>{m}</span> </label> ))} <input type="text" name="paysWith" className="w-full bg-gray-800 rounded p-3 mt-2" placeholder="¿Pagas con? (Para cambio)" /> </div> </> )} <div className="pt-4"> <button type="submit" className="w-full bg-emerald-600 py-4 rounded-lg font-bold uppercase flex items-center justify-center gap-2"><IconWhatsapp className="h-5 w-5"/>{isFinalClosing ? 'Cerrar Mesa y Pagar' : (isTableSession ? 'Enviar a Cocina' : 'Enviar Pedido')}</button> </div> </form> )}
                </div>

                {selectedProduct && ( <div className="fixed inset-0 z-50 flex items-end"><div className="absolute inset-0 bg-black/80" onClick={() => setSelectedProduct(null)}></div><div className="bg-gray-900 w-full max-w-md rounded-t-3xl p-8 relative z-10 animate-slide-up"><h2 className="text-2xl font-bold">{selectedProduct.name}</h2><p className="text-gray-400 my-4">{selectedProduct.description}</p>{/* Fix: Use selectedProduct variable which is in scope */}<button onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }} className="w-full bg-emerald-600 py-4 rounded-lg font-bold">Añadir por ${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</button></div></div>)}
                
                {view === 'menu' && ( <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40 flex flex-col gap-3"> {isTableSession && sessionItems.length > 0 && ( <button onClick={() => setView('account')} className="w-full bg-gray-800/80 backdrop-blur-md text-white font-bold py-3 px-5 rounded-xl flex justify-between items-center border border-emerald-500/20 shadow-lg"> <span>Mi Cuenta Acumulada</span> <span>${sessionTotal.toFixed(2)}</span> </button> )} {itemCount > 0 && ( <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl"> <div className="flex items-center gap-3"> <div className="bg-emerald-800 w-7 h-7 flex items-center justify-center rounded-lg">{itemCount}</div> <span>{isTableSession ? 'Ver Ronda Actual' : 'Ver Pedido'}</span> </div> <span>${cartTotal.toFixed(2)}</span> </button> )} </div> )}
                <Chatbot />
            </div>
        </div>
    );
}