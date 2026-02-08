
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles } from '../constants';
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
        <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl flex items-start gap-3 animate-fade-in">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">RECOMENDACIÓN IA</p>
                {loading ? (
                    <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-1"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug font-medium">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

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
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);

    // --- LÓGICA DE PERSISTENCIA ROBUSTA ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });

    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });

    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    
    // El orderType se bloquea a DineIn si hay información de mesa
    const [orderType, setOrderType] = useState<OrderType>(() => {
        const savedTable = localStorage.getItem('altoque_table_info');
        return savedTable ? OrderType.DineIn : OrderType.Delivery;
    });

    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems]);

    // Efecto para sincronizar persistencia
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [sessionItems, tableInfo, customerName, isTableSession]);

    // Inicialización y detección de QR
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions()
                ]);
                setSettings(s); setAllProducts(p); setAllCategories(c); setAllPromotions(proms);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        // Lógica de escaneo de QR (solo si no hay sesión previa)
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone && !localStorage.getItem('altoque_table_info')) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }

        return () => unsubscribeFromChannel();
    }, []);

    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => {
        if (!settings) return;

        try {
            if (isFinalClosing && isTableSession) {
                // --- FLUJO: PEDIR LA CUENTA FINAL ---
                const msg = [
                    `💰 *SOLICITUD DE CIERRE DE CUENTA*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`,
                    `💵 *TOTAL A PAGAR: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}`,
                    tipAmount > 0 ? `⭐ Propina: $${tipAmount.toFixed(2)}` : '',
                    paymentProof ? `✅ Comprobante adjunto` : '', `_Cliente solicita la cuenta para retirarse._`
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpieza total de sesión tras pedir la cuenta
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
                clearCart();
                setView('confirmation');

            } else {
                // --- FLUJO: ENVIAR RONDA A COCINA (O PEDIDO NORMAL) ---
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
                    customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType,
                    tableId: isTableSession ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentStatus: 'pending'
                };
                await saveOrder(newOrderData);
                
                if (isTableSession) {
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(customer.name);
                }

                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                let msg: string;
                if (isTableSession) {
                    msg = [
                        `🧾 *🔥 NUEVA RONDA A COCINA*`,
                        `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `🪑 MESA: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Ronda Actual: $${cartTotal.toFixed(2)}`,
                        (sessionItems.length > 0) ? `📈 *Total Acumulado Mesa: $${(sessionTotal + cartTotal).toFixed(2)}*` : '',
                    ].filter(Boolean).join('\n');
                } else {
                    // Flujo original de domicilio/recoger sin cambios en la lógica del mensaje
                    msg = [
                        `🧾 *🛒 NUEVO PEDIDO (${orderType})*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `👤 Cliente: ${customer.name}`, `📱 Tel: ${customer.phone}`,
                        orderType === OrderType.Delivery ? `🏠 Dir: ${customer.address.calle} ${customer.address.numero}, ${customer.address.colonia}` : '',
                        `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Total: $${cartTotal.toFixed(2)}`, `💳 Método: ${paymentMethod}`
                    ].filter(Boolean).join('\n');
                }

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

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA' : view === 'account' ? 'MI CUENTA' : (isFinalClosing ? 'CERRAR MESA' : 'CONFIRMAR')} 
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
                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">{cat.name}</h3>
                                            <div className="grid gap-4">
                                                {products.map(p => (
                                                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-gray-800/30 p-4 rounded-3xl border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-800/50 group">
                                                        <div className="relative shrink-0">
                                                            <img src={p.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl" />
                                                            <div onClick={(e) => { e.stopPropagation(); addToCart(p, 1);}} className="absolute -bottom-2 -right-2 bg-emerald-600 p-1.5 rounded-xl shadow-lg border-2 border-gray-900 active:scale-90 transition-transform">
                                                                <IconPlus className="h-4 w-4 text-white"/>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-tight">{p.name}</h4>
                                                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.description}</p>
                                                            <span className="font-black text-emerald-400 text-lg mt-auto">${getDiscountedPrice(p, allPromotions).price.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {view === 'confirmation' && (
                        <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner">
                                <IconCheck className="w-12 h-12 text-emerald-500"/>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{isFinalClosing ? '¡HASTA PRONTO!' : '¡A COCINA!'}</h2>
                                <p className="text-gray-500 text-sm font-medium">
                                    {isFinalClosing 
                                        ? 'Hemos enviado tu solicitud. Un mesero pasará a confirmar el pago.' 
                                        : 'Tu ronda ha sido enviada. Puedes seguir pidiendo más cosas desde el menú.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalClosing(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs border border-gray-700">
                                {isFinalClosing ? 'INICIAR NUEVO PEDIDO' : 'SEGUIR PIDIENDO'}
                            </button>
                        </div>
                    )}
                    
                    {view === 'cart' && ( 
                        <div className="p-5 animate-fade-in"> 
                            <PairingAI items={cartItems} allProducts={allProducts} /> 
                            <h2 className="text-xl font-black text-white mb-6 uppercase">{isTableSession ? 'Tu Ronda Actual' : 'Tu Pedido'}</h2> 
                            <div className="space-y-4"> 
                                {cartItems.map(i => ( 
                                    <div key={i.cartItemId} className="flex gap-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800"> 
                                        <img src={i.imageUrl} className="w-16 h-16 rounded-xl object-cover" /> 
                                        <div className="flex-1"> 
                                            <div className="flex justify-between items-start"> 
                                                <span className="font-bold text-sm">{i.name}</span> 
                                                <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span> 
                                            </div> 
                                            <div className="flex items-center justify-between mt-3"> 
                                                <div className="flex items-center bg-gray-900 rounded-lg p-1"> 
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-1 text-gray-400 hover:text-white"><IconMinus className="h-4 w-4"/></button> 
                                                    <span className="w-8 text-center text-xs font-bold">{i.quantity}</span> 
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-1 text-gray-400 hover:text-white"><IconPlus className="h-4 w-4"/></button> 
                                                </div> 
                                                <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500/50 hover:text-rose-500 transition-colors"><IconTrash className="h-5 w-5"/></button> 
                                            </div> 
                                        </div> 
                                    </div> 
                                ))} 
                            </div> 
                            <div className="mt-8 pt-6 border-t border-gray-800"> 
                                <div className="flex justify-between font-black text-xl mb-6 items-baseline"> 
                                    <span className="text-gray-500 text-[10px] tracking-widest uppercase">TOTAL RONDA</span> 
                                    <span className="text-emerald-400 text-2xl">${cartTotal.toFixed(2)}</span> 
                                </div> 
                                <button disabled={cartItems.length === 0} onClick={() => { setIsFinalClosing(false); setView('checkout'); }} className="w-full bg-emerald-600 py-4 rounded-xl font-black text-white shadow-xl disabled:opacity-30 uppercase tracking-widest text-xs">
                                    {isTableSession ? 'Enviar a Cocina' : 'Ir a Pagar'}
                                </button> 
                            </div> 
                        </div> 
                    )}

                    {view === 'account' && ( 
                        <div className="p-6 animate-fade-in"> 
                            <div className="bg-gray-800/30 p-6 rounded-[2rem] border border-gray-800 shadow-xl"> 
                                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <IconReceipt className="h-4 w-4"/> Cuenta Acumulada
                                </h3> 
                                <div className="space-y-3"> 
                                    {sessionItems.map((item, idx) => ( 
                                        <div key={idx} className="flex justify-between text-sm border-b border-gray-800/50 pb-3 last:border-0"> 
                                            <span className="font-medium text-gray-300">{item.quantity}x {item.name}</span> 
                                            <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span> 
                                        </div> 
                                    ))} 
                                    {sessionItems.length === 0 && <p className="text-center text-gray-500 py-4 text-sm italic">No has realizado pedidos aún.</p>} 
                                </div> 
                                <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center"> 
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">TOTAL A PAGAR</span> 
                                    <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> 
                                </div> 
                            </div> 
                            <button onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full mt-6 bg-white text-gray-900 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                                Pedir la Cuenta / Pagar
                            </button> 
                        </div> 
                    )}

                    {view === 'checkout' && ( 
                        <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string || customerName; handleOrderAction({ name, phone: fd.get('phone') as string || '', address: { colonia: fd.get('colonia') as string || '', calle: fd.get('calle') as string || '', numero: fd.get('numero') as string || '' } } as any, fd.get('payment') as PaymentMethod || 'Efectivo', 0, (e.currentTarget.elements.namedItem('proof') as any)?.dataset.url); }} className="p-6 space-y-6 animate-fade-in"> 
                            {(!customerName || !isTableSession) && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-2xl">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Tus Datos</h3>
                                    <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="¿Cómo te llamas?" required />
                                    {!isTableSession && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="WhatsApp" required />}
                                </div>
                            )}

                            {!isTableSession && orderType === OrderType.Delivery && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-2xl">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Dirección de Entrega</h3>
                                    <input name="calle" type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Calle / Avenida" required />
                                    <input name="numero" type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Número de casa/apto" required />
                                    <input name="colonia" type="text" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Colonia" required />
                                </div>
                            )}

                            {isFinalClosing && isTableSession && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-2xl">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Método de Pago Final</h3>
                                    <select name="payment" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none">
                                        <option>Efectivo</option>
                                        <option>Pago Móvil</option>
                                        <option>Transferencia</option>
                                        <option>Zelle</option>
                                    </select>
                                    <input name="proof" type="file" className="hidden" id="proof-upload" onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => { (e.target as any).dataset.url = ev.target?.result; alert("Comprobante cargado."); }; r.readAsDataURL(e.target.files[0]); } }} />
                                    <label htmlFor="proof-upload" className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 p-4 rounded-xl text-xs font-bold text-gray-500 cursor-pointer hover:bg-gray-800/50 transition-colors">
                                        <IconUpload className="h-4 w-4"/> ADJUNTAR PAGO (OPCIONAL)
                                    </label>
                                </div>
                            )}

                            <div className="pt-4">
                                <div className="flex justify-between items-baseline mb-6 px-2">
                                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{isFinalClosing ? 'TOTAL A PAGAR' : 'TOTAL RONDA'}</span>
                                    <span className="text-emerald-400 text-3xl font-black">${(isFinalClosing ? sessionTotal : cartTotal).toFixed(2)}</span>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 active:scale-95 transition-all text-xs tracking-widest shadow-2xl shadow-emerald-900/40">
                                    <IconWhatsapp className="h-5 w-5" /> 
                                    {isFinalClosing ? 'SOLICITAR CIERRE DE MESA' : (isTableSession ? 'ENVIAR RONDA A COCINA' : 'REALIZAR PEDIDO')}
                                </button>
                            </div>
                        </form> 
                    )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 animate-fade-in">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-gray-800 shadow-2xl">
                            <div className="h-56 relative">
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white backdrop-blur-md border border-white/10"><IconX/></button>
                            </div>
                            <div className="p-8 -mt-8 relative">
                                <h2 className="text-2xl font-black mb-3 text-white leading-tight">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 py-4 rounded-2xl font-black text-white flex justify-between px-8 items-center active:scale-95 transition-all"
                                >
                                    <span className="uppercase tracking-widest text-[10px]">Añadir Ronda</span>
                                    <span className="text-lg font-black">${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'menu' && (
                    <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {isTableSession && sessionItems.length > 0 && (
                            <button 
                                onClick={() => setView('account')} 
                                className="w-full bg-gray-800/90 backdrop-blur-xl text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center border border-emerald-500/30 shadow-2xl group transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                        <IconReceipt className="h-5 w-5"/>
                                    </div>
                                    <div className="text-left leading-none">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black mb-1">Cuenta de Mesa</p>
                                        <p className="text-xs text-gray-400 font-bold">Ver acumulado</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-white">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {itemCount > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl active:scale-[0.98] transition-all border border-emerald-400/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-800 px-3 py-1 rounded-lg text-sm font-black border border-emerald-400/30 shadow-inner">{itemCount}</div>
                                    <span className="tracking-[0.1em] uppercase text-xs font-black">{isTableSession ? 'Mi Ronda Actual' : 'Ver Pedido'}</span>
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
