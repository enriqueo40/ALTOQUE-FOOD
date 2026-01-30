
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconDuplicate, IconUpload, IconReceipt, IconSparkles } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur-md z-30 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-all">
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
    }, [items.length]);

    if (!suggestion && !loading) return null;

    return (
        <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl flex items-start gap-3 animate-fade-in shadow-lg shadow-indigo-500/10">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">MARIDAJE RECOMENDADO (IA)</p>
                {loading ? (
                    <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-1"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug font-medium">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

// --- Vista Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'my-account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    
    // --- LÓGICA DE SESIÓN DE MESA PERSISTENTE ---
    const [sessionActive, setSessionActive] = useState<boolean>(() => localStorage.getItem('altoque_session_active') === 'true');
    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    const [consumedItems, setConsumedItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });

    const sessionTotal = useMemo(() => {
        return consumedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [consumedItems]);

    // Controla si el flujo es para una RONDA o para PAGAR LA CUENTA
    const [isFinalPayment, setIsFinalPayment] = useState(false);

    const { cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, clearCart, itemCount } = useCart();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [s, p, c] = await Promise.all([getAppSettings(), getProducts(), getCategories()]);
                setSettings(s); setAllProducts(p); setAllCategories(c);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetch();
        subscribeToMenuUpdates(fetch);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }
        return () => unsubscribeFromChannel();
    }, []);

    // Persistencia de la sesión en localStorage
    useEffect(() => {
        localStorage.setItem('altoque_session_active', sessionActive.toString());
        localStorage.setItem('altoque_customer_name', customerName);
        localStorage.setItem('altoque_consumed_items', JSON.stringify(consumedItems));
    }, [sessionActive, customerName, consumedItems]);

    const handleOrderAction = async (customer: Customer, payment: PaymentMethod, proof?: string | null) => {
        if (!settings) return;
        
        try {
            if (isFinalPayment) {
                // --- FLUJO FINAL: SOLICITAR CUENTA Y LIQUIDAR ---
                const msg = [
                    `💰 *SOLICITUD DE PAGO Y CIERRE*`,
                    `📍 *${settings.company.name.toUpperCase()}*`,
                    `--------------------------------`,
                    `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`,
                    `👤 Cliente: ${customer.name}`,
                    `--------------------------------`,
                    `💵 *TOTAL A LIQUIDAR: $${sessionTotal.toFixed(2)}*`,
                    `💳 Método: ${payment}`,
                    proof ? `✅ Comprobante adjunto` : '',
                    `--------------------------------`,
                    `_Por favor procesar el cierre para liberar la mesa._`
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpiar sesión local completa
                setSessionActive(false);
                setConsumedItems([]);
                setCustomerName('');
                localStorage.clear();
                clearCart();
                setView('confirmation');
            } else {
                // --- FLUJO DE RONDA: ENVIAR COMANDA ---
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
                    customer,
                    items: cartItems,
                    total: cartTotal,
                    status: OrderStatus.Pending,
                    orderType,
                    tableId: orderType === OrderType.DineIn ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentStatus: 'pending'
                };
                
                await saveOrder(newOrderData); 
                setCustomerName(customer.name);

                if (orderType === OrderType.DineIn) {
                    setSessionActive(true);
                    setConsumedItems(prev => [...prev, ...cartItems]);
                }

                const title = orderType === OrderType.DineIn ? '🔥 NUEVA RONDA - MESA ' + tableInfo?.table : '🛒 NUEVO PEDIDO';
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                const msg = [
                    `🧾 *${title}*`,
                    `📍 *${settings.company.name.toUpperCase()}*`,
                    `--------------------------------`,
                    `👤 Cliente: ${customer.name}`,
                    `📍 Zona: ${tableInfo?.zone || 'N/A'}`,
                    `--------------------------------`,
                    itemsStr,
                    `--------------------------------`,
                    `💰 Ronda: $${cartTotal.toFixed(2)}`,
                    orderType === OrderType.DineIn ? `📈 *Total Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : ''
                ].filter(Boolean).join('\n');
                
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                clearCart();
                setView('confirmation');
            }
        } catch(e) { 
            alert("Error al procesar. Intenta de nuevo."); 
        }
    };

    if (isLoadingData || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Iniciando sesión...</p>
        </div>
    );

    const isTableRound = orderType === OrderType.DineIn && !isFinalPayment;

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA' : view === 'my-account' ? 'RESUMEN CUENTA' : (isFinalPayment ? 'PAGAR CUENTA' : 'CONFIRMAR')} 
                        onBack={() => { setView('menu'); setIsFinalPayment(false); }} 
                    />
                )}
                
                <div className="flex-1 overflow-y-auto">
                    {view === 'menu' && (
                        <div className="animate-fade-in pb-48">
                            <div className="relative pb-6 border-b border-gray-800">
                                <div className="h-44 w-full overflow-hidden relative">
                                    {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                                </div>
                                <div className="px-6 -mt-12 flex flex-col items-center text-center relative z-10">
                                    <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-4 border-gray-900 overflow-hidden">
                                        {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
                                    </div>
                                    
                                    {sessionActive && tableInfo && (
                                        <div onClick={() => setView('my-account')} className="mb-4 bg-emerald-500 text-white text-[10px] font-black px-5 py-2 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                            CUENTA ACTIVA: ${sessionTotal.toFixed(2)}
                                        </div>
                                    )}

                                    <h1 className="text-2xl font-black text-white">{settings.company.name}</h1>
                                    
                                    {tableInfo ? (
                                        <div className="mt-4 bg-emerald-950/40 backdrop-blur border border-emerald-500/30 px-6 py-3 rounded-2xl flex items-center gap-3">
                                            <IconTableLayout className="h-5 w-5 text-emerald-400"/>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">MESA {tableInfo.table}</p>
                                                <p className="text-xs font-bold text-gray-400">{tableInfo.zone}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-xs mt-4 bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700">
                                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>A DOMICILIO</button>
                                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>RECOGER</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-8 mt-4">
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input type="text" placeholder="¿Qué vas a pedir hoy?" className="w-full bg-gray-800/40 border border-gray-700 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600 font-bold" />
                                </div>

                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                {cat.name}
                                            </h3>
                                            <div className="grid gap-4">
                                                {products.map(p => (
                                                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-gray-800/30 p-4 rounded-[2rem] border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-800/50 group">
                                                        <div className="relative shrink-0">
                                                            <img src={p.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl group-hover:scale-105 transition-transform" />
                                                            <div className="absolute -bottom-2 -right-2 bg-emerald-600 p-1.5 rounded-xl shadow-lg border-2 border-gray-900">
                                                                <IconPlus className="h-4 w-4 text-white"/>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-tight">{p.name}</h4>
                                                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                                                            <span className="font-black text-emerald-400 mt-2 text-lg">${p.price.toFixed(2)}</span>
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
                    
                    {view === 'cart' && (
                        <div className="p-5 animate-fade-in pb-48">
                            <PairingAI items={cartItems} allProducts={allProducts} />
                            
                            <div className="space-y-4">
                                {cartItems.map(i => (
                                    <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-3xl border border-gray-800/60">
                                        <img src={i.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm text-gray-100">{i.name}</span>
                                                <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center bg-gray-900 rounded-xl px-2 py-1 border border-gray-800">
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-1.5 text-gray-400 hover:text-white"><IconMinus className="h-4 w-4"/></button>
                                                    <span className="w-8 text-center text-xs font-black">{i.quantity}</span>
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-1.5 text-gray-400 hover:text-white"><IconPlus className="h-4 w-4"/></button>
                                                </div>
                                                <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500/40 hover:text-rose-500 p-2"><IconTrash className="h-5 w-5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/98 backdrop-blur-xl border-t border-gray-800 z-40 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                 <div className="flex justify-between font-black text-xl mb-6">
                                     <span className="text-gray-500 text-[10px] tracking-[0.2em] uppercase self-center">TOTAL RONDA ACTUAL</span>
                                     <span className="text-emerald-400 text-2xl">${cartTotal.toFixed(2)}</span>
                                 </div>
                                 <button 
                                    disabled={cartItems.length === 0} 
                                    onClick={() => { setIsFinalPayment(false); setView('checkout'); }} 
                                    className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-sm"
                                 >
                                    {orderType === OrderType.DineIn ? 'ENVIAR RONDA A COCINA' : 'IR A PAGAR'}
                                 </button>
                            </div>
                        </div>
                    )}

                    {view === 'my-account' && (
                        <div className="p-6 animate-fade-in pb-48">
                            <div className="bg-gray-800/30 p-6 rounded-[2.5rem] border border-gray-800 mb-6">
                                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-6">PEDIDOS REALIZADOS</h3>
                                <div className="space-y-4">
                                    {consumedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex gap-3">
                                                <span className="font-black text-gray-500">{item.quantity}x</span>
                                                <span className="font-bold text-gray-200">{item.name}</span>
                                            </div>
                                            <span className="font-black text-emerald-400">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {consumedItems.length === 0 && <p className="text-center text-gray-500 py-10 italic">Aún no has pedido nada.</p>}
                                </div>
                            </div>
                            
                            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/98 backdrop-blur-xl border-t border-gray-800 z-40 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                 <div className="flex justify-between font-black text-xl mb-6">
                                     <span className="text-gray-500 text-[10px] tracking-[0.2em] uppercase self-center">TOTAL ACUMULADO</span>
                                     <span className="text-emerald-400 text-2xl">${sessionTotal.toFixed(2)}</span>
                                 </div>
                                 <button 
                                    onClick={() => { setIsFinalPayment(true); setView('checkout'); }} 
                                    className="w-full bg-white text-gray-900 py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm"
                                 >
                                    PEDIR LA CUENTA / PAGAR
                                 </button>
                            </div>
                        </div>
                    )}
                    
                    {view === 'checkout' && (
                        <form onSubmit={e => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const name = fd.get('name') as string || customerName;
                            handleOrderAction({
                                name,
                                phone: fd.get('phone') as string || '',
                                address: { colonia: '', calle: '', numero: '' }
                            } as any, (fd.get('payment') as PaymentMethod) || 'Efectivo', (e.currentTarget.elements.namedItem('proof') as any)?.dataset.url);
                        }} className="p-6 space-y-8 animate-fade-in pb-48">
                            
                            {(!sessionActive || !customerName) && (
                                <div className="space-y-4 p-7 bg-gray-800/30 border border-gray-800 rounded-[2.5rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">¿A NOMBRE DE QUIÉN?</h3>
                                    <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold" placeholder="Escribe tu nombre" required />
                                    {orderType !== OrderType.DineIn && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold" placeholder="WhatsApp" required />}
                                </div>
                            )}

                            {isFinalPayment && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="space-y-4 p-7 bg-gray-800/30 border border-gray-800 rounded-[2.5rem]">
                                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">FORMA DE PAGO</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['Efectivo', 'Pago Móvil', 'Transferencia'].map(m => (
                                                <label key={m} className="flex justify-between items-center p-4 bg-gray-800/50 border border-gray-700 rounded-2xl cursor-pointer hover:border-emerald-500 transition-colors has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/5">
                                                    <span className="text-sm font-bold">{m}</span>
                                                    <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4 p-7 bg-gray-800/30 border border-gray-800 rounded-[2.5rem]">
                                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">COMPROBANTE (OPCIONAL)</h3>
                                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-700 rounded-3xl cursor-pointer hover:bg-gray-800/50 overflow-hidden relative transition-all group">
                                            <div className="flex flex-col items-center text-gray-500 group-hover:text-emerald-400">
                                                <IconUpload className="h-10 w-10 mb-3 opacity-40" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Subir captura</span>
                                            </div>
                                            <input name="proof" type="file" className="hidden" accept="image/*" onChange={e => {
                                                if (e.target.files?.[0]) {
                                                    const reader = new FileReader();
                                                    reader.onload = (re) => {
                                                        const img = document.createElement('img');
                                                        img.src = re.target?.result as string;
                                                        img.className = "absolute inset-0 w-full h-full object-cover bg-gray-900";
                                                        e.target.dataset.url = re.target?.result as string;
                                                        e.target.parentElement?.appendChild(img);
                                                    };
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/98 backdrop-blur-2xl border-t border-gray-800 z-40 rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.6)]">
                                 <div className="flex justify-between font-black text-2xl mb-6">
                                    <span className="text-gray-500 text-[10px] tracking-[0.2em] self-center uppercase">{isFinalPayment ? 'TOTAL CUENTA' : 'TOTAL RONDA'}</span>
                                    <span className="text-emerald-500">${(isFinalPayment ? sessionTotal : cartTotal).toFixed(2)}</span>
                                 </div>
                                 <button type="submit" className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl">
                                    {isTableRound ? 'ENVIAR RONDA A COCINA' : <><IconWhatsapp className="h-6 w-6" /> {isFinalPayment ? 'LIQUIDAR CUENTA' : 'CONFIRMAR PEDIDO'}</>}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {view === 'confirmation' && (
                        <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner">
                                <IconCheck className="w-14 h-14 text-emerald-500"/>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{isFinalPayment ? '¡CUENTA CERRADA!' : '¡A COCINA!'}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                    {isFinalPayment 
                                        ? 'Hemos enviado tu reporte de pago. ¡Gracias por elegirnos!' 
                                        : 'Tu ronda ha sido enviada. Mantendremos tu sesión abierta para que sigas pidiendo cuando quieras.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalPayment(false); setView('menu'); }} className="w-full max-w-xs bg-emerald-600 py-5 rounded-3xl font-black text-white shadow-xl hover:bg-emerald-500 active:scale-95 transition-all uppercase tracking-widest text-xs">
                                {isFinalPayment ? 'NUEVA CUENTA' : 'SEGUIR PIDIENDO'}
                            </button>
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] overflow-hidden relative z-10 animate-fade-in-up border border-gray-800 shadow-2xl">
                            <div className="h-64 relative overflow-hidden">
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white backdrop-blur-md"><IconX/></button>
                            </div>
                            <div className="p-8">
                                <h2 className="text-2xl font-black mb-2 text-white leading-tight">{selectedProduct.name}</h2>
                                <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex justify-between px-8 items-center active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                                >
                                    <span className="uppercase tracking-widest text-xs">AÑADIR A LA RONDA</span>
                                    <span className="text-lg font-black">${selectedProduct.price.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- BOTONES FLOTANTES DE SESIÓN ACTIVA --- */}
                {view === 'menu' && (
                    <div className="fixed bottom-8 left-6 right-6 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {/* Botón Mi Cuenta (Píldora elegante) */}
                        {sessionActive && sessionTotal > 0 && (
                            <button 
                                onClick={() => setView('my-account')} 
                                className="w-full bg-gray-800/98 backdrop-blur-md text-white font-black py-4 px-7 rounded-3xl flex justify-between items-center border border-emerald-500/40 shadow-2xl transition-all hover:bg-gray-700 active:scale-95 group"
                            >
                                <span className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black"><IconReceipt className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform"/> MI CUENTA ACUMULADA</span>
                                <span className="bg-emerald-500 px-3 py-1 rounded-xl text-xs font-mono shadow-lg shadow-emerald-500/20">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {/* Botón Ronda Actual */}
                        {cartItems.length > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-5 px-7 rounded-3xl flex justify-between shadow-2xl active:scale-[0.98] transition-all animate-slide-up border border-emerald-500/20"
                            >
                                <span className="tracking-[0.2em] uppercase text-[10px] font-black">REVISAR RONDA ({itemCount})</span>
                                <span className="font-black text-lg">${cartTotal.toFixed(2)}</span>
                            </button>
                        )}
                    </div>
                )}
                <Chatbot />
            </div>
        </div>
    );
}
