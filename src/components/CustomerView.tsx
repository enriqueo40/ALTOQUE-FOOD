
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, Schedule, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles, IconClock, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur-md z-30 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight text-center flex-1">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

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

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Payment States
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Efectivo');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [tipAmount, setTipAmount] = useState<number>(0);

    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // --- ESTADO PERSISTENTE DE MESA ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    const [orderType, setOrderType] = useState<OrderType>(() => {
        const savedTable = localStorage.getItem('altoque_table_info');
        return savedTable ? OrderType.DineIn : OrderType.Delivery;
    });

    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);

    const isTableSession = !!tableInfo;

    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems]);

    // Total Calculation including Tips
    const baseTotal = isFinalClosing ? sessionTotal : cartTotal;
    const finalTotal = useMemo(() => baseTotal + tipAmount, [baseTotal, tipAmount]);

    // Sincronización con LocalStorage para Modo Mesa
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [sessionItems, tableInfo, customerName, isTableSession]);

    // Carga de Datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions()
                ]);
                setSettings(s); 
                setAllProducts(p); 
                setAllCategories(c); 
                setAllPromotions(proms);
                if (c.length > 0) setActiveCategory(c[0].id);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone && !localStorage.getItem('altoque_table_info')) {
            const info = { table, zone };
            setTableInfo(info);
            setOrderType(OrderType.DineIn);
            localStorage.setItem('altoque_table_info', JSON.stringify(info));
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
                if (form) {
                    const gpsInput = form.elements.namedItem('googleMapsLink') as HTMLInputElement;
                    if (gpsInput) gpsInput.value = link;
                }
                alert("Ubicación capturada con éxito.");
                setIsGettingLocation(false);
            },
            () => {
                alert("No se pudo obtener la ubicación.");
                setIsGettingLocation(false);
            }
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (res) => {
                setPaymentProof(res.target?.result as string);
                alert("Captura de pago cargada con éxito.");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOrderAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!settings) return;

        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string || customerName;
        const phone = fd.get('phone') as string || '';
        const addressData = {
            calle: fd.get('calle') as string,
            numero: fd.get('numero') as string,
            colonia: fd.get('colonia') as string,
            referencias: fd.get('referencias') as string,
            googleMapsLink: fd.get('googleMapsLink') as string
        };

        const customer: Customer = { name, phone, address: addressData, paymentProof: paymentProof || undefined };

        try {
            if (!isFinalClosing && cartItems.length > 0) {
                const newOrderData: any = {
                    customer, 
                    items: cartItems, 
                    total: finalTotal, // Use total with tip
                    status: OrderStatus.Pending, 
                    orderType,
                    tableId: isTableSession ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentStatus: 'pending',
                    tip: tipAmount
                };
                await saveOrder(newOrderData);
            }

            if (isFinalClosing && isTableSession) {
                // FLUJO CIERRE MESA
                const msg = [
                    `💰 *SOLICITUD DE CIERRE DE CUENTA*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${name}`, `--------------------------------`,
                    `💵 Subtotal: $${sessionTotal.toFixed(2)}`,
                    tipAmount > 0 ? `✨ Propina: $${tipAmount.toFixed(2)}` : '',
                    `⭐ *TOTAL A PAGAR: $${finalTotal.toFixed(2)}*`, `💳 Método: ${selectedPayment}`,
                    paymentProof ? `✅ Comprobante adjunto` : '', 
                    `_Cliente solicita la cuenta para retirarse._`
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
                clearCart();
                setPaymentProof(null);
                setTipAmount(0);
                setView('confirmation');

            } else {
                // FLUJO PEDIDO NUEVO / RONDA
                if (isTableSession) {
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(name);
                }

                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                let msg: string;
                
                if (isTableSession) {
                    msg = [
                        `🧾 *🔥 NUEVA RONDA A COCINA*`,
                        `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `🪑 MESA: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Subtotal Ronda: $${cartTotal.toFixed(2)}`,
                        tipAmount > 0 ? `✨ Propina Ronda: $${tipAmount.toFixed(2)}` : '',
                        `💵 *Total Ronda + Propina: $${finalTotal.toFixed(2)}*`,
                        (sessionItems.length > 0) ? `📈 *Total Acumulado Mesa: $${(sessionTotal + cartTotal).toFixed(2)}*` : '',
                        paymentProof ? `✅ Comprobante adjunto` : ''
                    ].filter(Boolean).join('\n');
                } else {
                    msg = [
                        orderType === OrderType.Delivery ? `🧾 *PEDIDO A DOMICILIO*` : `🥡 *PEDIDO PARA RECOGER*`, 
                        `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `👤 Cliente: ${name}`, `📱 Tel: ${phone}`,
                        orderType === OrderType.Delivery ? `🏠 Dir: ${addressData.calle} ${addressData.numero}, ${addressData.colonia}` : '',
                        orderType === OrderType.Delivery && addressData.referencias ? `👀 Ref: ${addressData.referencias}` : '',
                        orderType === OrderType.Delivery && addressData.googleMapsLink ? `📍 GPS: ${addressData.googleMapsLink}` : '',
                        `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Subtotal: $${cartTotal.toFixed(2)}`,
                        tipAmount > 0 ? `✨ Propina: $${tipAmount.toFixed(2)}` : '',
                        `💵 *TOTAL A PAGAR: $${finalTotal.toFixed(2)}*`, 
                        `💳 Método: ${selectedPayment}`,
                        paymentProof ? `✅ Comprobante adjunto` : ''
                    ].filter(Boolean).join('\n');
                }

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
                setPaymentProof(null);
                setTipAmount(0);
                setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar el pedido.");
        }
    };

    const scrollToCategory = (id: string) => {
        setActiveCategory(id);
        const el = document.getElementById(`cat-${id}`);
        if (el) {
            const offset = 160;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Iniciando menú...</p>
        </div>
    );

    const isBankPayment = ['Pago Móvil', 'Transferencia', 'Zelle'].includes(selectedPayment);

    return (
        <div className="bg-[#0f172a] min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-[#0f172a] min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA ACTUAL' : view === 'account' ? 'MI CUENTA ACUMULADA' : (isFinalClosing ? 'SOLICITAR CUENTA' : 'CONFIRMAR')} 
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
                    {/* ... (Menu, Confirmation, Cart, Account Views remain mostly same, focusing on Checkout) ... */}
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="relative pt-12 pb-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-gray-800 mb-4 overflow-hidden shadow-2xl">
                                    {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover" /> : <span className="text-emerald-500 font-bold text-2xl">AN</span>}
                                </div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">{settings.company.name}</h1>
                                <p className="text-xs text-gray-400 font-medium mt-1">{settings.branch.alias}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Abierto Ahora</span>
                                </div>

                                {!isTableSession ? (
                                    <div className="w-[85%] bg-gray-800/40 rounded-xl p-1 flex mt-6 border border-gray-700">
                                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === OrderType.Delivery ? 'bg-gray-700 text-emerald-400 shadow-lg' : 'text-gray-500'}`}>A domicilio</button>
                                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === OrderType.TakeAway ? 'bg-gray-700 text-emerald-400 shadow-lg' : 'text-gray-500'}`}>Para recoger</button>
                                    </div>
                                ) : (
                                    <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2">
                                        <IconTableLayout className="h-3 w-3"/> MESA {tableInfo!.table} • {tableInfo!.zone}
                                    </div>
                                )}
                            </div>

                            <div className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md px-4 py-4 space-y-4 border-b border-gray-800/50">
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input type="text" placeholder="Buscar productos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1e293b] border-none rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-500 font-medium" />
                                </div>
                                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                                    {allCategories.map(cat => (
                                        <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-white text-gray-900 border-white' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'}`}>
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 space-y-8 mt-4">
                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id} id={`cat-${cat.id}`}>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-2">{cat.name}</h3>
                                            <div className="grid gap-3">
                                                {products.map(p => {
                                                    const { price: displayPrice, promotion } = getDiscountedPrice(p, allPromotions);
                                                    return (
                                                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-[#1e293b]/50 p-3 rounded-2xl border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-[#1e293b]/80 group relative overflow-hidden">
                                                            {promotion && <div className="absolute top-0 left-0 bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-br-xl z-10 shadow-lg">-{promotion.discountType === 'percentage' ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}</div>}
                                                            <div className="relative shrink-0">
                                                                <img src={p.imageUrl} className="w-24 h-24 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center">
                                                                <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-snug">{p.name}</h4>
                                                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                                                                <div className="mt-2 flex flex-col">
                                                                    {promotion && <span className="text-[10px] text-gray-600 line-through font-bold">MXN ${p.price.toFixed(2)}</span>}
                                                                    <span className="font-black text-emerald-400 text-base">MXN ${displayPrice.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-3 right-3 bg-gray-800 p-1.5 rounded-lg text-emerald-400 border border-gray-700 shadow-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                                <IconPlus className="h-4 w-4" />
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
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner">
                                <IconCheck className="w-12 h-12 text-emerald-500"/>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{isFinalClosing ? '¡HASTA PRONTO!' : '¡A COCINA!'}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                    {isFinalClosing ? 'Hemos enviado tu solicitud. Un mesero pasará a confirmar el pago.' : 'Tu ronda ha sido enviada. Puedes seguir pidiendo más cosas.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalClosing(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-700 transition-colors border border-gray-700 uppercase tracking-widest text-xs">
                                {isFinalClosing ? 'NUEVO PEDIDO' : 'SEGUIR PIDIENDO'}
                            </button>
                        </div>
                    )}
                    
                    {view === 'cart' && ( 
                        <div className="p-5 animate-fade-in"> 
                            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Mi Ronda Actual</h2> 
                            <div className="space-y-4"> 
                                {cartItems.map(i => ( 
                                    <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-800/60"> 
                                        <img src={i.imageUrl} className="w-20 h-20 rounded-xl object-cover" /> 
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
                            <div className="mt-8 pt-6 border-t border-gray-800"> 
                                <div className="flex justify-between font-black text-xl mb-6"> 
                                    <span className="text-gray-500 text-[10px] tracking-[0.2em] uppercase self-center">SUBTOTAL RONDA</span> 
                                    <span className="text-emerald-400 text-3xl font-black">${cartTotal.toFixed(2)}</span> 
                                </div> 
                                <button disabled={cartItems.length === 0} onClick={() => { setIsFinalClosing(false); setView('checkout'); }} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-sm"> 
                                    {isTableSession ? 'ENVIAR A COCINA' : 'IR A PAGAR'} 
                                </button> 
                            </div> 
                        </div> 
                    )}

                    {view === 'account' && ( 
                        <div className="p-6 animate-fade-in"> 
                            <div className="bg-gray-800/30 p-7 rounded-[2.5rem] border border-gray-800 mb-6 shadow-xl"> 
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3"> 
                                    <IconReceipt className="h-4 w-4"/> MI CONSUMO TOTAL 
                                </h3> 
                                <div className="space-y-4"> 
                                    {sessionItems.map((item, idx) => ( 
                                        <div key={idx} className="flex justify-between items-start text-sm border-b border-gray-700/50 pb-3 last:border-0"> 
                                            <div className="flex gap-4"> 
                                                <span className="font-black text-gray-500 bg-gray-800 h-6 w-6 flex items-center justify-center rounded-lg text-[10px]">{item.quantity}</span> 
                                                <span className="font-bold text-gray-300">{item.name}</span> 
                                            </div> 
                                            <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span> 
                                        </div> 
                                    ))} 
                                </div> 
                                <div className="mt-6 pt-6 border-t border-gray-700/50 flex justify-between items-center"> 
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">TOTAL ACUMULADO</span> 
                                    <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> 
                                </div> 
                            </div> 
                            <button onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full bg-white text-gray-900 py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm"> 
                                PEDIR LA CUENTA / PAGAR 
                            </button> 
                        </div> 
                    )}

                    {view === 'checkout' && ( 
                        <form id="checkout-form" onSubmit={handleOrderAction} className="p-6 space-y-6 animate-fade-in pb-20"> 
                            
                            {(!customerName || !isTableSession) && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">TUS DATOS</h3>
                                    <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Nombre completo" required />
                                    {!isTableSession && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="WhatsApp" required />}
                                </div>
                            )}

                            {!isTableSession && orderType === OrderType.Delivery && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">DIRECCIÓN DE ENTREGA</h3>
                                    <input type="hidden" name="googleMapsLink" />
                                    <input name="calle" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Calle y Avenida" required />
                                    <input name="numero" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Nro Casa / Apto" required />
                                    <input name="colonia" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Colonia / Sector" required />
                                    <input name="referencias" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Referencias" />
                                    <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="w-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600/30 transition-colors">
                                        <IconLocationMarker className="h-5 w-5" /> {isGettingLocation ? 'Capturando GPS...' : 'Usar Ubicación Actual'}
                                    </button>
                                </div>
                            )}

                            {settings.payment.showTipField && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">¿PROPINA PARA EL EQUIPO?</h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[0, 5, 10, 15].map(p => {
                                            const amount = baseTotal * (p / 100);
                                            return (
                                                <button key={p} type="button" onClick={() => setTipAmount(amount)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${Math.abs(tipAmount - amount) < 0.01 ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                                    {p}%
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input type="number" step="0.01" value={tipAmount || ''} onChange={e => setTipAmount(parseFloat(e.target.value) || 0)} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Monto personalizado" />
                                </div>
                            )}
                            
                            <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem] overflow-hidden relative">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">MÉTODO DE PAGO</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle'].map(m => (
                                        <label key={m} className={`flex justify-between items-center p-4 bg-gray-800/50 border rounded-xl cursor-pointer transition-all ${selectedPayment === m ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:border-gray-500'}`}>
                                            <span className="text-sm font-bold text-gray-300">{m}</span>
                                            <input 
                                                type="radio" 
                                                name="payment" 
                                                value={m} 
                                                checked={selectedPayment === m}
                                                onChange={() => { setSelectedPayment(m as PaymentMethod); setPaymentProof(null); }}
                                                className="accent-emerald-500 h-5 w-5" 
                                            />
                                        </label>
                                    ))}
                                </div>
                                
                                {isBankPayment && (
                                    <div className="mt-4 p-5 bg-gray-900 rounded-2xl border border-gray-700 space-y-4 animate-fade-in relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b border-gray-800 pb-2 mb-2">DATOS PARA EL PAGO</p>
                                        
                                        {selectedPayment === 'Pago Móvil' && settings.payment.pagoMovil && (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-gray-500">Banco:</span><span className="font-bold text-white uppercase">{settings.payment.pagoMovil.bank || '---'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Teléfono:</span><span className="font-bold text-white font-mono text-sm">{settings.payment.pagoMovil.phone || '---'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">C.I./RIF:</span><span className="font-bold text-white uppercase">{settings.payment.pagoMovil.idNumber || '---'}</span></div>
                                            </div>
                                        )}
                                        {selectedPayment === 'Transferencia' && settings.payment.transfer && (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-gray-500">Banco:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.bank || '---'}</span></div>
                                                <div className="flex justify-between items-start"><span className="text-gray-500">Cuenta:</span><span className="font-bold text-white font-mono text-[10px] text-right break-all">{settings.payment.transfer.accountNumber || '---'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.accountHolder || '---'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">RIF:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.idNumber || '---'}</span></div>
                                            </div>
                                        )}
                                        {selectedPayment === 'Zelle' && settings.payment.zelle && (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-gray-500">Correo:</span><span className="font-bold text-white">{settings.payment.zelle.email || '---'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span><span className="font-bold text-white uppercase">{settings.payment.zelle.holder || '---'}</span></div>
                                            </div>
                                        )}

                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors mt-6 bg-black/20">
                                            {paymentProof ? (
                                                <div className="flex flex-col items-center gap-1 text-emerald-400 animate-bounce">
                                                    <IconCheck className="h-6 w-6"/> 
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">¡Comprobante Listo!</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-500 hover:text-white transition-colors">
                                                    <IconUpload className="h-6 w-6 mb-1 opacity-70"/>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">Toca para subir captura</span>
                                                </div>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 pb-6">
                                <div className="space-y-2 mb-6 px-2">
                                    <div className="flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        <span>Subtotal</span>
                                        <span>${baseTotal.toFixed(2)}</span>
                                    </div>
                                    {tipAmount > 0 && (
                                        <div className="flex justify-between text-xs text-emerald-500 font-bold uppercase tracking-wider">
                                            <span>Propina</span>
                                            <span>${tipAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-black text-3xl text-white pt-2 border-t border-gray-800">
                                        <span className="text-[10px] tracking-[0.4em] self-center text-gray-500">TOTAL</span>
                                        <span className="text-emerald-400">${finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                                <button type="submit" disabled={!isFinalClosing && cartItems.length === 0} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <IconWhatsapp className="h-5 w-5" /> 
                                    {isFinalClosing ? 'ENVIAR COMPROBANTE' : (isTableSession ? 'ENVIAR A COCINA' : 'REALIZAR PEDIDO')}
                                </button>
                            </div>
                        </form> 
                    )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-gray-800 shadow-2xl">
                            <div className="h-64 relative overflow-hidden">
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/60"><IconX/></button>
                            </div>
                            <div className="p-8 -mt-10 relative">
                                <h2 className="text-3xl font-black mb-2 text-white leading-none">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium mt-4">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex justify-between px-8 items-center active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                                >
                                    <span className="uppercase tracking-widest text-[10px]">Añadir a la Ronda</span>
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
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                        <IconReceipt className="h-5 w-5"/>
                                    </div>
                                    <div className="text-left leading-none">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black mb-1">Mi Cuenta</p>
                                        <p className="text-xs text-gray-400 font-bold">Ver acumulado</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {itemCount > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-xl shadow-emerald-900/50 active:scale-[0.98] transition-all border border-emerald-400/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-800 px-3 py-1 rounded-lg text-sm font-black border border-emerald-400/30 shadow-inner">{itemCount}</div>
                                    <span className="tracking-[0.1em] uppercase text-xs font-black">{isTableSession ? 'Ver Ronda Actual' : 'Ver Pedido'}</span>
                                </div>
                                <span className="font-black text-xl">${cartTotal.toFixed(2)}</span>
                            </button>
                        )}
                    </div>
                )}
                <Chatbot />
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}
