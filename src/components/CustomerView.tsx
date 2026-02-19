
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, DiscountType, PromotionAppliesTo, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconCheck, IconUpload, IconReceipt, IconClock, IconStore, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Sub-componentes Visuales ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-[#0f172a]/95 backdrop-blur-md z-30 border-b border-gray-800">
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
        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds.includes(product.id);
    });
    if (activePromotions.length === 0) return { price: product.price };
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;
    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === DiscountType.Percentage) {
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
    
    // Estados de Pago y Propinas
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Efectivo');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [tipAmount, setTipAmount] = useState<number>(0);

    // --- LÓGICA DE PERSISTENCIA PARA MESA (QR) ---
    // Recuperamos el estado de la mesa, el nombre del cliente y lo consumido (Mi Cuenta)
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
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);

    const isTableSession = !!tableInfo;

    // Total acumulado de lo que ya se ha pedido (Cuenta total)
    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => {
            const optsPrice = item.selectedOptions ? item.selectedOptions.reduce((s, o) => s + (Number(o.price) || 0), 0) : 0;
            return acc + ((Number(item.price) || 0) + optsPrice) * item.quantity;
        }, 0);
    }, [sessionItems]);

    // El total a pagar en el checkout depende de si es una ronda o el cierre final
    const baseTotal = isFinalClosing ? sessionTotal : cartTotal;
    const finalTotal = useMemo(() => baseTotal + tipAmount, [baseTotal, tipAmount]);

    // Persistencia automática en localStorage cuando cambian los datos de la mesa
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [sessionItems, tableInfo, customerName, isTableSession]);

    // Carga inicial y detección proactiva de mesa por URL
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms, pers] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions(), getPersonalizations()
                ]);
                setSettings(s); 
                setAllProducts(p); 
                setAllCategories(c); 
                setAllPromotions(proms);
                setAllPersonalizations(pers);
                if (c.length > 0) setActiveCategory(c[0].id);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        // Detectar si venimos de un QR con mesa y zona
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone) {
            const info = { table, zone };
            setTableInfo(info);
            setOrderType(OrderType.DineIn);
            localStorage.setItem('altoque_table_info', JSON.stringify(info));
        }

        return () => unsubscribeFromChannel();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (res) => {
                setPaymentProof(res.target?.result as string);
                alert("Comprobante de pago cargado exitosamente.");
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
            calle: fd.get('calle') as string || '',
            numero: fd.get('numero') as string || '',
            colonia: fd.get('colonia') as string || '',
            referencias: fd.get('referencias') as string || ''
        };

        const customer: Customer = { name, phone, address: addressData, paymentProof: paymentProof || undefined };

        try {
            // Si NO es el cierre final, procesamos la ronda actual
            if (!isFinalClosing) {
                if (cartItems.length > 0) {
                    const newOrderData: any = {
                        customer, 
                        items: cartItems, 
                        total: cartTotal + tipAmount,
                        status: OrderStatus.Pending, 
                        orderType,
                        tableId: isTableSession ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                        paymentStatus: 'pending',
                        tip: tipAmount
                    };
                    await saveOrder(newOrderData);
                    
                    if (isTableSession) {
                        setSessionItems(prev => [...prev, ...cartItems]);
                        setCustomerName(name);
                    }
                }
            }

            // Construir mensaje de WhatsApp contextualizado
            const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
            let msg: string;
            
            if (isFinalClosing && isTableSession) {
                // Mensaje de Cierre Final
                msg = [
                    `💰 *CIERRE DE CUENTA - MESA ${tableInfo!.table}*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `👤 Cliente: ${name}`, 
                    `💵 Total Acumulado: $${sessionTotal.toFixed(2)}`,
                    tipAmount > 0 ? `✨ Propina: $${tipAmount.toFixed(2)}` : '',
                    `⭐ *TOTAL FINAL: $${finalTotal.toFixed(2)}*`,
                    `💳 Método: ${selectedPayment}`,
                    paymentProof ? '✅ Comprobante adjunto' : '',
                    `_Solicito la cuenta para retirarme._`
                ].filter(Boolean).join('\n');
                
                // LIMPIEZA DE SESIÓN (Solo al cerrar cuenta)
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
            } else if (isTableSession) {
                // Mensaje de Nueva Ronda
                msg = [
                    `🧾 *🔥 NUEVA RONDA A COCINA*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `🪑 MESA: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                    `💵 Subtotal Ronda: $${cartTotal.toFixed(2)}`,
                    `📈 *Total Acumulado Mesa: $${(sessionTotal + cartTotal).toFixed(2)}*`,
                    paymentProof ? '✅ Comprobante enviado' : ''
                ].filter(Boolean).join('\n');
            } else {
                // Flujo normal Delivery/Recoger
                const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (Number(settings.shipping.fixedCost) || 0) : 0;
                msg = [
                    orderType === OrderType.Delivery ? `🧾 *PEDIDO A DOMICILIO*` : `🥡 *PEDIDO PARA RECOGER*`, 
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `👤 Cliente: ${name}`, `📱 Tel: ${phone}`,
                    orderType === OrderType.Delivery ? `🏠 Dir: ${addressData.calle} ${addressData.numero}, ${addressData.colonia}` : '',
                    `--------------------------------`, itemsStr, `--------------------------------`,
                    `💰 Subtotal: $${cartTotal.toFixed(2)}`,
                    shippingCost > 0 ? `🚚 Envío: $${shippingCost.toFixed(2)}` : '',
                    `💵 *TOTAL: $${(cartTotal + shippingCost + tipAmount).toFixed(2)}*`, 
                    `💳 Método: ${selectedPayment}`
                ].filter(Boolean).join('\n');
            }

            window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
            clearCart();
            setPaymentProof(null);
            setTipAmount(0);
            setView('confirmation');
            
        } catch(e) {
            console.error("Error al procesar pedido:", e);
            alert("Ocurrió un error. Por favor intenta de nuevo.");
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
        <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando mesa...</p>
        </div>
    );

    const isBankPayment = ['Pago Móvil', 'Transferencia', 'Zelle'].includes(selectedPayment);

    return (
        <div className="bg-[#0f172a] min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe overflow-x-hidden">
            <div className="container mx-auto max-w-md bg-[#0f172a] min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA ACTUAL' : view === 'account' ? 'MI CUENTA TOTAL' : (isFinalClosing ? 'PEDIR LA CUENTA' : 'CONFIRMAR')} 
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
                            {/* Visual Hero */}
                            <div className="relative pt-12 pb-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-gray-800 mb-4 shadow-2xl overflow-hidden">
                                    {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover" /> : <span className="text-emerald-500 font-bold text-2xl">AF</span>}
                                </div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">{settings.company.name}</h1>
                                <p className="text-xs text-gray-400 font-medium mt-1">{settings.branch.alias}</p>

                                {!isTableSession ? (
                                    <div className="w-[85%] bg-gray-800/40 rounded-xl p-1 flex mt-6 border border-gray-700">
                                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === OrderType.Delivery ? 'bg-gray-700 text-emerald-400 shadow-lg' : 'text-gray-500'}`}>A domicilio</button>
                                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === OrderType.TakeAway ? 'bg-gray-700 text-emerald-400 shadow-lg' : 'text-gray-500'}`}>Recoger</button>
                                    </div>
                                ) : (
                                    <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2">
                                        <IconTableLayout className="h-3 w-3"/> MESA {tableInfo!.table} • {tableInfo!.zone}
                                    </div>
                                )}
                            </div>

                            {/* Buscador Sticky */}
                            <div className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md px-4 py-4 space-y-4 border-b border-gray-800/50">
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input type="text" placeholder="Buscar algo delicioso..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1e293b] border-none rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-500 font-medium" />
                                </div>
                                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                                    {allCategories.map(cat => (
                                        <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-white text-gray-900 border-white' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'}`}>
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Productos */}
                            <div className="p-4 space-y-8 mt-4">
                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id} id={`cat-${cat.id}`}>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-2">{cat.name}</h3>
                                            <div className="grid gap-3">
                                                {products.map(p => (
                                                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-[#1e293b]/50 p-3 rounded-2xl border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-[#1e293b]/80 group relative">
                                                        <div className="relative shrink-0">
                                                            <img src={p.imageUrl} className="w-24 h-24 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors leading-snug">{p.name}</h4>
                                                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                                                            <span className="mt-2 font-black text-emerald-400 text-base">${getDiscountedPrice(p, allPromotions).price.toFixed(2)}</span>
                                                        </div>
                                                        <div className="absolute bottom-3 right-3 bg-gray-800 p-1.5 rounded-lg text-emerald-400 border border-gray-700 shadow-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                            <IconPlus className="h-4 w-4" />
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
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{isFinalClosing ? '¡HASTA PRONTO!' : '¡A COCINA!'}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                    {isFinalClosing ? 'Gracias por visitarnos. El personal pasará a retirar tu ticket.' : 'Hemos enviado tu ronda. Sigue disfrutando de nuestra propuesta gastronómica.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalClosing(false); setView('menu'); }} className="w-full max-w-xs bg-emerald-600 text-white py-5 rounded-2xl font-black transition-all hover:bg-emerald-700 shadow-xl shadow-emerald-900/40 uppercase tracking-widest text-xs">
                                {isFinalClosing ? 'NUEVO PEDIDO' : 'SEGUIR PIDIENDO'}
                            </button>
                        </div>
                    )}
                    
                    {view === 'cart' && ( 
                        <div className="p-5 animate-fade-in"> 
                            <div className="space-y-4"> 
                                {cartItems.map(i => ( 
                                    <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-800/60"> 
                                        <img src={i.imageUrl} className="w-20 h-20 rounded-xl object-cover" /> 
                                        <div className="flex-1"> 
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
                                    <IconReceipt className="h-4 w-4"/> CONSUMO ACUMULADO 
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
                                    {sessionItems.length === 0 && <p className="text-center text-gray-500 text-xs py-10">Aún no has consumido nada en esta mesa.</p>}
                                </div> 
                                <div className="mt-6 pt-6 border-t border-gray-700/50 flex justify-between items-center"> 
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">TOTAL ACUMULADO</span> 
                                    <span className="text-2xl font-black text-white">${sessionTotal.toFixed(2)}</span> 
                                </div> 
                            </div> 
                            <button disabled={sessionItems.length === 0} onClick={() => { setIsFinalClosing(true); setView('checkout'); }} className="w-full bg-white text-gray-900 py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm disabled:opacity-50"> 
                                PEDIR LA CUENTA / PAGAR 
                            </button> 
                        </div> 
                    )}

                    {view === 'checkout' && ( 
                        <div className="p-6 space-y-6 animate-fade-in"> 
                            <form onSubmit={handleOrderAction} className="space-y-6">
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">TUS DATOS</h3>
                                    <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Tu Nombre" required />
                                    {!isTableSession && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="WhatsApp" required />}
                                </div>
                                
                                {orderType === OrderType.Delivery && (
                                    <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">DIRECCIÓN DE ENTREGA</h3>
                                        <input name="calle" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Calle / Avenida" required />
                                        <input name="numero" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Número" required />
                                        <input name="colonia" className="w-full bg-gray-800 border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-bold text-white" placeholder="Sector / Urbanización" required />
                                    </div>
                                )}

                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">MÉTODO DE PAGO</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {['Efectivo', 'Pago Móvil', 'Zelle'].map(m => (
                                            <label key={m} className={`flex justify-between items-center p-4 bg-gray-800/50 border rounded-xl cursor-pointer transition-all ${selectedPayment === m ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700'}`}>
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
                                        <div className="mt-4 p-4 bg-gray-900 rounded-2xl border border-gray-700 space-y-4 animate-fade-in">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ANEXAR COMPROBANTE</p>
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                                                {paymentProof ? (
                                                    <div className="flex items-center gap-2 text-emerald-400">
                                                        <IconCheck className="h-5 w-5"/> <span className="text-xs font-bold">Documento cargado</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-gray-500">
                                                        <IconUpload className="h-6 w-6 mb-1"/>
                                                        <span className="text-[10px] font-bold">Haz clic para subir captura</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8">
                                    <div className="flex justify-between font-black text-3xl text-white mb-6">
                                        <span className="text-[10px] tracking-[0.4em] self-center text-gray-500">TOTAL</span>
                                        <span className="text-emerald-400">${finalTotal.toFixed(2)}</span>
                                    </div>
                                    <button type="submit" className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/30">
                                        <IconWhatsapp className="h-5 w-5" /> 
                                        {isFinalClosing ? 'SOLICITAR CUENTA FINAL' : (isTableSession ? 'ENVIAR RONDA A COCINA' : 'PROCESAR PEDIDO')}
                                    </button>
                                </div>
                            </form> 
                        </div> 
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
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed font-medium mt-4">{selectedProduct.description}</p>
                                
                                {allPersonalizations
                                    .filter(pers => selectedProduct.personalizationIds?.includes(pers.id))
                                    .map(pers => (
                                        <div key={pers.id} className="mb-6 space-y-3">
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{pers.name}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {pers.options.map(opt => (
                                                    <button key={opt.id} className="p-3 bg-gray-800 rounded-xl border border-gray-700 text-xs font-bold text-gray-300 text-left hover:border-emerald-500 transition-all flex justify-between">
                                                        <span>{opt.name}</span>
                                                        {opt.price > 0 && <span className="text-emerald-500">+${opt.price}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                }

                                <button 
                                    onClick={() => { 
                                        const { price: finalPrice } = getDiscountedPrice(selectedProduct, allPromotions);
                                        addToCart({ ...selectedProduct, price: finalPrice }, 1); 
                                        setSelectedProduct(null); 
                                    }}
                                    className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex justify-between px-8 items-center active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                                >
                                    <span className="uppercase tracking-widest text-[10px]">Agregar a la Ronda</span>
                                    <span className="text-xl font-black">${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</span>
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
                                className="w-full bg-gray-800/90 backdrop-blur-xl text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center border border-emerald-500/30 shadow-2xl transition-transform active:scale-95 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                        <IconReceipt className="h-5 w-5"/>
                                    </div>
                                    <div className="text-left leading-none">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black mb-1">Mi Cuenta</p>
                                        <p className="text-xs text-gray-400 font-bold">Consumo acumulado</p>
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
                                    <span className="tracking-[0.1em] uppercase text-xs font-black">{isTableSession ? 'Revisar Ronda Actual' : 'Ver Pedido'}</span>
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
