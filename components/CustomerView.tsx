
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
        if (items.length > 0 || (localStorage.getItem('altoque_consumed_items') || '[]') !== '[]' ) {
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
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);

    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems]);

    // --- Sincronización con LocalStorage ---
    useEffect(() => {
        localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
    }, [sessionItems]);

    useEffect(() => {
        if (tableInfo) {
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
        } else {
            localStorage.removeItem('altoque_table_info');
        }
    }, [tableInfo]);

    useEffect(() => {
        localStorage.setItem('altoque_customer_name', customerName);
    }, [customerName]);

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
            setOrderType(OrderType.DineIn);
        }

        return () => unsubscribeFromChannel();
    }, []);

    // --- Lógica Central de Pedidos ---
    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => {
        if (!settings) return;

        try {
            if (isFinalClosing) {
                // --- CIERRE DE MESA (PAGO) ---
                const msg = [
                    `💰 *SOLICITUD DE CIERRE DE CUENTA*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`,
                    `💵 *TOTAL A PAGAR: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}`,
                    paymentProof ? `✅ Comprobante adjunto` : '', `_Cliente solicita la cuenta para retirarse._`
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpieza completa de la sesión local
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                clearCart();
                setView('confirmation');

            } else {
                // --- NUEVA RONDA (PEDIDO A COCINA) ---
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
                    customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType,
                    tableId: orderType === OrderType.DineIn ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentStatus: 'pending', generalComments: tipAmount > 0 ? `Propina sugerida: $${tipAmount}` : undefined
                };
                await saveOrder(newOrderData);
                
                if (orderType === OrderType.DineIn) {
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(customer.name);
                }

                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                const msg = [
                    `🧾 *${orderType === OrderType.DineIn ? '🔥 NUEVA RONDA A COCINA' : '🛒 NUEVO PEDIDO'}*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    tableInfo ? `🪑 MESA: ${tableInfo.table} (${tableInfo.zone})` : `🚚 TIPO: ${orderType}`,
                    `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                    `💰 Ronda Actual: $${cartTotal.toFixed(2)}`,
                    (orderType === OrderType.DineIn && sessionItems.length > 0) ? `📈 *Total Acumulado Mesa: $${(sessionTotal + cartTotal).toFixed(2)}*` : '',
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
                setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar el pedido. Intente de nuevo.");
        }
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Cargando menú...</p>
        </div>
    );

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA' : view === 'account' ? 'MI CUENTA' : (isFinalClosing ? 'CERRAR MESA' : 'CONFIRMAR RONDA')} 
                        onBack={() => {
                            if (view === 'checkout') {
                                isFinalClosing ? setView('account') : setView('cart');
                            } else {
                                setView('menu');
                            }
                        }} 
                    />
                )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="relative pb-6 border-b border-gray-800">
                                <div className="h-44 w-full overflow-hidden relative">
                                    {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                                </div>
                                <div className="px-6 -mt-12 flex flex-col items-center text-center relative z-10">
                                    <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-4 border-gray-900 overflow-hidden">
                                        {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
                                    </div>
                                    
                                    {isTableSession ? (
                                        <div className="mb-4 flex flex-col items-center gap-2">
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                                                <IconTableLayout className="h-4 w-4"/>
                                                MESA {tableInfo.table} • {tableInfo.zone}
                                            </div>
                                            {sessionItems.length > 0 && (
                                                <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                                                    Cuenta abierta: ${sessionTotal.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-xs mt-4 bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700">
                                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>DOMICILIO</button>
                                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>RECOGER</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-8 mt-4">
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input type="text" placeholder="¿Qué se te antoja?" className="w-full bg-gray-800/40 border border-gray-700 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600 font-bold" />
                                </div>

                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                {cat.name}
                                            </h3>
                                            <div className="grid gap-4">
                                                {products.map(p => {
                                                    const { price: displayPrice, promotion } = getDiscountedPrice(p, allPromotions);
                                                    return (
                                                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-gray-800/30 p-4 rounded-[2rem] border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-800/50 group">
                                                            <div className="relative shrink-0">
                                                                <img src={p.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl group-hover:scale-105 transition-transform" />
                                                                {promotion && <div className="absolute top-0 left-0 bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-br-lg rounded-tl-lg">OFERTA</div>}
                                                                <div className="absolute -bottom-2 -right-2 bg-emerald-600 p-1.5 rounded-xl shadow-lg border-2 border-gray-900">
                                                                    <IconPlus className="h-4 w-4 text-white"/>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center">
                                                                <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-tight">{p.name}</h4>
                                                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="font-black text-emerald-400 text-lg">${displayPrice.toFixed(2)}</span>
                                                                    {promotion && <span className="text-xs text-gray-600 line-through">${p.price.toFixed(2)}</span>}
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
                    
                    {view === 'confirmation' && (
                        <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner animate-bounce">
                                <IconCheck className="w-12 h-12 text-emerald-500"/>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{isFinalClosing ? '¡HASTA PRONTO!' : '¡A COCINA!'}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                    {isFinalClosing 
                                        ? 'Hemos enviado tu solicitud de cierre. Un mesero pasará a confirmar el pago.' 
                                        : 'Tu ronda ha sido enviada a cocina. Puedes seguir pidiendo más cosas desde este mismo menú.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalClosing(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-700 transition-colors border border-gray-700 uppercase tracking-widest text-xs">
                                {isFinalClosing ? 'INICIAR NUEVO PEDIDO' : 'SEGUIR PIDIENDO'}
                            </button>
                        </div>
                    )}
                    
                    {view === 'cart' && ( <div className="p-5 animate-fade-in"> <PairingAI items={cartItems} allProducts={allProducts} /> <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Tu Ronda Actual</h2> <div className="space-y-4"> {cartItems.map(i => ( <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-3xl border border-gray-800/60"> <img src={i.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg" /> <div className="flex-1 flex flex-col justify-center"> <div className="flex justify-between items-start mb-2"> <span className="font-bold text-sm text-gray-100">{i.name}</span> <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span> </div> <div className="flex items-center justify-between"> <div className="flex items-center bg-gray-900 rounded-xl px-2 py-1 border border-gray-800"> <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-1.5 text-gray-400 hover:text-white"><IconMinus className="h-4 w-4"/></button> <span className="w-8 text-center text-xs font-black">{i.quantity}</span> <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-1.5 text-gray-400 hover:text-white"><IconPlus className="h-4 w-4"/></button> </div> <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500/40 hover:text-rose-500 p-2"><IconTrash className="h-5 w-5"/></button> </div> </div> </div> ))} </div> <div className="mt-8 pt-6 border-t border-gray-800"> <div className="flex justify-between font-black text-xl mb-6"> <span className="text-gray-500 text-[10px] tracking-[0.2em] uppercase self-center">TOTAL RONDA</span> <span className="text-emerald-400 text-3xl">${cartTotal.toFixed(2)}</span> </div> <button disabled={cartItems.length === 0} onClick={() => { setIsFinalClosing(false); setView('checkout'); }} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-sm"> {isTableSession ? 'ENVIAR A COCINA' : 'IR A PAGAR'} </button> </div> </div> )}
                    {view === 'account' && ( <div className="p-6 animate-fade-in"> <div className="bg-gray-800/30 p-7 rounded-[2.5rem] border border-gray-800 mb-6 shadow-xl"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3"> <IconReceipt className="h-4 w-4"/> TU CUENTA ACUMULADA </h3> <div className="space-y-4"> {sessionItems.map((item, idx) => ( <div key={idx} className="flex justify-between items-start text-sm border-b border-gray-700/50 pb-3 last:border-0"> <div className="flex gap-4"> <span className="font-black text-gray-500 bg-gray-800 h-6 w-6 flex items-center justify-center rounded-lg text-[10px]">{item.quantity}</span> <span className="font-bold text-gray-300">{item.name}</span> </div> <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span> </div> ))} {sessionItems.length === 0 && <p className="text-center text-gray-500 py-4 italic">Aún no has pedido nada.</p>} </div> <div className="mt-6 pt-6 border-t border-gray-700/50 flex justify-between items-center"> <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">TOTAL A PAGAR</span> <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> </div> </div> <button onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full bg-white text-gray-900 py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"> <IconCheck className="h-5 w-5"/> PEDIR LA CUENTA / PAGAR </button> </div> )}
                    {view === 'checkout' && ( <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string || (isTableSession ? customerName : ''); const tip = parseFloat(fd.get('tip') as string) || 0; const payment = (fd.get('payment') as PaymentMethod) || 'Efectivo'; const proof = (e.currentTarget.elements.namedItem('proof') as any)?.dataset.url; handleOrderAction({ name, phone: fd.get('phone') as string || '', address: { colonia: '', calle: '', numero: '' } } as any, payment, tip, proof); }} className="p-6 space-y-6 animate-fade-in"> {(!customerName || !isTableSession) && ( <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">DATOS</h3> <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="¿A nombre de quién?" required /> {!isTableSession && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="WhatsApp de contacto" required />} </div> )} {isFinalClosing && ( <> {settings.payment.showTipField && ( <div className="p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">PROPINA (OPCIONAL)</h3> <input name="tip" type="number" min="0" step="any" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Monto de propina" /> </div> )} <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">MÉTODO DE PAGO FINAL</h3> <div className="grid grid-cols-1 gap-2"> {['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle'].map(m => ( <label key={m} className="flex justify-between items-center p-4 bg-gray-800/50 border border-gray-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-all has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10"> <span className="text-sm font-bold text-gray-300">{m}</span> <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" /> </label> ))} </div> </div> <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]"> <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">COMPROBANTE (SI APLICA)</h3> <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-800/50 transition-all group relative overflow-hidden"> <div className="flex flex-col items-center text-gray-500 group-hover:text-emerald-400"> <IconUpload className="h-8 w-8 mb-2 opacity-50" /> <span className="text-[10px] font-black uppercase tracking-widest">Subir Imagen</span> </div> <input name="proof" type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (re) => { const img = document.createElement('img'); img.src = re.target?.result as string; img.className = "absolute inset-0 w-full h-full object-cover bg-gray-900"; e.target.dataset.url = re.target?.result as string; e.target.parentElement?.appendChild(img); }; reader.readAsDataURL(e.target.files[0]); } }} /> </label> </div> </> )} <div className="pt-4"> <div className="flex justify-between font-black text-2xl mb-6 px-2"> <span className="text-gray-500 text-[10px] tracking-[0.3em] self-center uppercase">{isFinalClosing ? 'TOTAL A PAGAR' : 'TOTAL RONDA'}</span> <span className="text-emerald-400 text-3xl font-black">${(isFinalClosing ? sessionTotal : cartTotal).toFixed(2)}</span> </div> <button type="submit" className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/30 hover:bg-emerald-500"> <IconWhatsapp className="h-5 w-5" /> {isFinalClosing ? 'CERRAR MESA Y PAGAR' : 'ENVIAR RONDA A COCINA'} </button> </div> </form> )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-gray-800 shadow-2xl">
                            <div className="h-64 relative overflow-hidden">
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white backdrop-blur-md border border-white/10"><IconX/></button>
                            </div>
                            <div className="p-8 -mt-10 relative">
                                <h2 className="text-3xl font-black mb-2 text-white leading-none">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium mt-4">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex justify-between px-8 items-center active:scale-95 transition-all shadow-xl shadow-emerald-900/40 hover:bg-emerald-500"
                                >
                                    <span className="uppercase tracking-widest text-[10px]">AÑADIR A LA RONDA</span>
                                    <span className="text-xl font-black">${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'menu' && (
                    <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {sessionItems.length > 0 && isTableSession && (
                            <button 
                                onClick={() => setView('account')} 
                                className="w-full bg-gray-800/90 backdrop-blur-xl text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center border border-emerald-500/30 shadow-2xl transition-transform active:scale-95 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 group-hover:text-emerald-300"><IconReceipt className="h-5 w-5"/></div>
                                    <div className="text-left leading-none">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black mb-1">MI CUENTA</p>
                                        <p className="text-xs text-gray-400 font-bold">Ver acumulado</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {itemCount > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-xl shadow-emerald-900/50 active:scale-[0.98] transition-all animate-bounce-subtle border border-emerald-400/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-800 px-3 py-1 rounded-lg text-sm font-black border border-emerald-400/30 shadow-inner">{itemCount}</div>
                                    <span className="tracking-[0.1em] uppercase text-xs font-black">VER RONDA ACTUAL</span>
                                </div>
                                <span className="font-black text-xl">${cartTotal.toFixed(2)}</span>
                            </button>
                        )}
                    </div>
                )}
                <Chatbot />
            </div>
        </div>
    );
}
