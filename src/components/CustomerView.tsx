
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconCheck, IconUpload, IconReceipt, IconSparkles } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, subscribeToMenuUpdates, unsubscribeFromChannel, updateOrder } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes Estilizados ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-30 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-all">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-bold text-white uppercase tracking-tight">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const RestaurantHero: React.FC<{ 
    settings: AppSettings, 
    orderType: OrderType, 
    setOrderType: (type: OrderType) => void,
    tableInfo: { table: string, zone: string } | null,
    hasActiveSession: boolean
}> = ({ settings, orderType, setOrderType, tableInfo, hasActiveSession }) => (
    <div className="relative pb-6 border-b border-gray-800">
        <div className="h-44 w-full overflow-hidden relative">
            {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>
        <div className="px-6 -mt-14 flex flex-col items-center text-center relative z-10">
            <div className="w-28 h-28 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-4 border-gray-900 overflow-hidden">
                {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
            </div>
            
            {hasActiveSession && (
                <div className="mb-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full animate-pulse shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    MESA CON CUENTA ACTIVA
                </div>
            )}

            <h1 className="text-2xl font-black text-white">{settings.company.name}</h1>
            <p className="text-[10px] text-gray-500 mb-5 uppercase tracking-widest font-bold">{settings.branch.alias}</p>
            
            {tableInfo ? (
                <div className="bg-emerald-950/40 backdrop-blur border border-emerald-500/30 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                    <IconTableLayout className="h-5 w-5 text-emerald-400"/>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Estás en la mesa</p>
                        <p className="text-sm font-black text-white">{tableInfo.table} • {tableInfo.zone}</p>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-xs bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700 backdrop-blur-sm">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                    <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>A DOMICILIO</button>
                    <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-black transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>RECOGER</button>
                </div>
            )}
        </div>
    </div>
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
        <div className="mx-0 mb-6 p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-2xl flex items-start gap-3 animate-fade-in">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    Sugerencia del Chef (IA)
                </p>
                {loading ? (
                    <div className="h-4 w-32 bg-gray-800 rounded animate-pulse"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

const ProductDetailModal: React.FC<{
    product: Product, 
    onClose: () => void,
    onAddToCart: (product: Product, quantity: number) => void
}> = ({ product, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-gray-900 rounded-t-[2.5rem] shadow-2xl relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 <button onClick={handleClose} className="absolute top-6 right-6 bg-gray-800/80 p-2 rounded-full text-white z-10 backdrop-blur-md">
                    <IconX className="h-5 w-5" />
                </button>

                <div className="h-72 w-full overflow-hidden">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-[2.5rem]" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                </div>

                <div className="p-8 -mt-12 relative z-10">
                    <h2 className="text-2xl font-black text-white mb-2">{product.name}</h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">{product.description}</p>
                    
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-2xl border border-gray-800 mb-8">
                         <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Cantidad</span>
                         <div className="flex items-center gap-6">
                            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 text-gray-400 hover:text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-black text-xl text-white w-6 text-center">{quantity}</span>
                            <button type="button" onClick={() => setQuantity(q => q + 1)} className="p-2 text-gray-400 hover:text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => onAddToCart(product, quantity)}
                        className="w-full bg-emerald-600 py-4.5 rounded-2xl font-black text-white shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex justify-between px-8 items-center"
                    >
                        <span className="uppercase tracking-widest text-sm">AGREGAR</span>
                        <span className="font-mono text-lg">${(product.price * quantity).toFixed(2)}</span>
                    </button>
                </div>
                <div className="h-8"></div>
            </div>
        </div>
    );
};

// --- Componente Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    
    // Sesión de Mesa Persistente
    const [activeOrderId, setActiveOrderId] = useState<string | null>(() => localStorage.getItem('activeOrderId'));
    const [sessionTotal, setSessionTotal] = useState<number>(() => Number(localStorage.getItem('sessionTotal')) || 0);
    const [isFinalPayment, setIsFinalPayment] = useState(false);

    const { cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
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

    const handleOrder = async (customer: Customer, payment: PaymentMethod, proof?: string | null) => {
        if (!settings) return;
        
        try {
            if (isFinalPayment && activeOrderId) {
                // FLUJO PAGO FINAL: Reportar cierre de cuenta acumulada
                await updateOrder(activeOrderId, { paymentStatus: 'paid', paymentProof: proof || undefined });
                const msg = `💰 *SOLICITUD DE CIERRE - MESA ${tableInfo?.table}*\n👤 Cliente: ${customer.name}\n📍 Zona: ${tableInfo?.zone}\n💰 *TOTAL ACUMULADO: $${sessionTotal.toFixed(2)}*\n✅ Comprobante adjunto.`;
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpiar sesión local
                localStorage.removeItem('activeOrderId');
                localStorage.removeItem('sessionTotal');
                setActiveOrderId(null);
                setSessionTotal(0);
                clearCart();
            } else {
                // FLUJO COMANDA (Ronda): Enviar pedido a cocina
                const newOrder: Omit<Order, 'id' | 'createdAt'> = {
                    customer,
                    items: cartItems,
                    total: cartTotal,
                    status: OrderStatus.Pending,
                    orderType,
                    tableId: orderType === OrderType.DineIn ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentProof: proof || undefined
                };
                
                const saved = await saveOrder(newOrder); 
                
                if (orderType === OrderType.DineIn) {
                    const newTotal = sessionTotal + cartTotal;
                    localStorage.setItem('activeOrderId', saved.id);
                    localStorage.setItem('sessionTotal', newTotal.toString());
                    setActiveOrderId(saved.id);
                    setSessionTotal(newTotal);
                }

                const title = orderType === OrderType.DineIn ? '🔥 COMANDA A COCINA' : '🛒 NUEVO PEDIDO';
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                const msg = `🧾 *${title} - ${settings.company.name}*\n👤 Cliente: ${customer.name}\n📍 Entrega: ${orderType === OrderType.DineIn ? 'MESA ' + tableInfo?.table : 'DOMICILIO'}\n----------------\n${itemsStr}\n----------------\n💰 *Total ronda: $${cartTotal.toFixed(2)}*`;
                
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
            }
            setView('confirmation');
        } catch(e) { 
            alert("Error al enviar pedido. Verifica tu conexión."); 
        }
    };

    if (isLoadingData || !settings) {
        return (
            <div className="h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-emerald-500 font-black text-[10px] tracking-[0.4em] uppercase">Cargando Experiencia</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 font-sans">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA' : (isFinalPayment ? 'PAGAR CUENTA' : 'CONFIRMAR')} 
                        onBack={() => { setView(view === 'checkout' ? 'cart' : 'menu'); setIsFinalPayment(false); }} 
                    />
                )}
                
                {view === 'menu' && (
                    <div className="animate-fade-in">
                        <RestaurantHero settings={settings} orderType={orderType} setOrderType={setOrderType} tableInfo={tableInfo} hasActiveSession={!!activeOrderId} />
                        
                        <div className="p-4 space-y-8 pb-40">
                             <div className="relative mb-6">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar en el menú..." 
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-600 text-sm"
                                />
                            </div>

                            {allCategories.map(cat => {
                                const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                if (products.length === 0) return null;
                                return (
                                    <div key={cat.id}>
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></span>
                                            {cat.name}
                                        </h3>
                                        <div className="grid gap-4">
                                            {products.map(p => (
                                                <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-gray-800/40 p-3.5 rounded-2xl border border-gray-800/60 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-800/60">
                                                    <img src={p.imageUrl} className="w-20 h-20 rounded-xl object-cover" alt={p.name} />
                                                    <div className="flex-1 flex flex-col justify-between py-0.5">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-gray-100">{p.name}</h4>
                                                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-black text-emerald-400 text-sm">${p.price.toFixed(2)}</span>
                                                            <div className="bg-emerald-500/10 text-emerald-500 p-1.5 rounded-lg border border-emerald-500/20"><IconPlus className="h-4 w-4"/></div>
                                                        </div>
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
                                <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-800/60">
                                    <img src={i.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm text-gray-100">{i.name}</span>
                                            <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center bg-gray-900/50 rounded-xl px-2 py-0.5 border border-gray-700/50">
                                                <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-2 text-gray-400 hover:text-white"><IconMinus className="h-3.5 w-3.5"/></button>
                                                <span className="w-8 text-center text-xs font-black">{i.quantity}</span>
                                                <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-2 text-gray-400 hover:text-white"><IconPlus className="h-3.5 w-3.5"/></button>
                                            </div>
                                            <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500/30 hover:text-rose-500 p-2 transition-colors"><IconTrash className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {cartItems.length === 0 && (
                            <div className="text-center py-20">
                                <IconReceipt className="h-12 w-12 text-gray-800 mx-auto mb-4" />
                                <p className="text-gray-500 italic text-sm">No has seleccionado nada aún.</p>
                            </div>
                        )}
                        
                        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-40">
                             <div className="flex justify-between font-black text-xl mb-6 px-1">
                                 <span className="text-gray-500 text-[10px] font-black tracking-[0.2em] self-center uppercase">Total Ronda</span>
                                 <span className="text-emerald-500">${cartTotal.toFixed(2)}</span>
                             </div>
                             <button disabled={cartItems.length === 0} onClick={() => setView('checkout')} className="w-full bg-emerald-600 py-4.5 rounded-2xl font-black text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-30 uppercase tracking-widest text-xs">
                                {orderType === OrderType.DineIn ? 'ENVIAR A COCINA' : 'CONTINUAR AL PAGO'}
                             </button>
                        </div>
                    </div>
                )}
                
                {view === 'checkout' && (
                    <form onSubmit={e => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const customer: Customer = {
                            name: formData.get('name') as string,
                            phone: formData.get('phone') as string || '',
                            address: { calle: '', numero: '', colonia: '' }
                        };
                        handleOrder(customer, 'Efectivo', (e.currentTarget.elements.namedItem('proof_file') as any)?.dataset.proof);
                    }} className="p-6 space-y-8 animate-fade-in pb-44">
                        <div className="space-y-4 p-7 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Identificación</h3>
                            <input name="name" type="text" className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold" placeholder="Tu nombre completo" required />
                            {(!isSimpleComanda(orderType, isFinalPayment)) && <input name="phone" type="tel" className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold" placeholder="WhatsApp (Ej: 58414...)" required />}
                        </div>

                        {!isSimpleComanda(orderType, isFinalPayment) && (
                            <div className="space-y-4 p-7 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Carga de Pago</h3>
                                <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-wider">Si pagaste por transferencia, adjunta la captura para {isFinalPayment ? 'liquidar tu cuenta' : 'procesar tu pedido'}.</p>
                                <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-700 rounded-3xl cursor-pointer hover:bg-gray-800/50 overflow-hidden relative group">
                                    <div className="flex flex-col items-center text-gray-500 group-hover:text-emerald-400 transition-colors">
                                        <IconUpload className="h-8 w-8 mb-3 opacity-50 group-hover:opacity-100" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Subir comprobante</span>
                                    </div>
                                    <input 
                                        name="proof_file" 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                const reader = new FileReader();
                                                reader.onload = (re) => {
                                                    const img = document.createElement('img');
                                                    img.src = re.target?.result as string;
                                                    img.className = "absolute inset-0 w-full h-full object-contain bg-gray-950 p-3 z-10";
                                                    e.target.dataset.proof = re.target?.result as string;
                                                    e.target.parentElement?.appendChild(img);
                                                };
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                        )}

                        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                             <div className="flex justify-between font-black text-2xl mb-6 px-1">
                                <span className="text-gray-500 text-[10px] font-black tracking-[0.2em] self-center uppercase">{isFinalPayment ? 'TOTAL ACUMULADO' : 'TOTAL ORDEN'}</span>
                                <span className="text-emerald-500">${(isFinalPayment ? sessionTotal : cartTotal).toFixed(2)}</span>
                             </div>
                             <button type="submit" className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20">
                                {isSimpleComanda(orderType, isFinalPayment) ? 'ENVIAR COMANDA A COCINA' : <><IconWhatsapp className="h-6 w-6" /> {isFinalPayment ? 'REPORTAR PAGO FINAL' : 'NOTIFICAR PEDIDO'}</>}
                            </button>
                        </div>
                    </form>
                )}
                
                {view === 'confirmation' && (
                    <div className="p-12 text-center h-[85vh] flex flex-col items-center justify-center gap-8 animate-fade-in">
                        <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner">
                            <IconCheck className="w-14 h-14 text-emerald-500"/>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{isFinalPayment ? '¡CUENTA CERRADA!' : '¡EN COCINA!'}</h2>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                {isFinalPayment ? 'Hemos recibido tu reporte de pago. El personal confirmará tu salida en breve.' : 'Tu orden ha sido enviada. Puedes seguir pidiendo más cosas desde el menú cuando gustes.'}
                            </p>
                        </div>
                        <button onClick={() => { setIsFinalPayment(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 py-4.5 rounded-3xl font-black text-gray-200 border border-gray-700 active:scale-95 transition-all shadow-xl">VOLVER AL MENÚ</button>
                    </div>
                )}

                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onClose={() => setSelectedProduct(null)} 
                        onAddToCart={(p, q) => { addToCart(p, q); setSelectedProduct(null); }} 
                    />
                )}
                
                {/* Botones flotantes inteligentes */}
                {view === 'menu' && (
                    <div className="fixed bottom-10 left-6 right-6 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {activeOrderId && (
                            <button 
                                onClick={() => { setIsFinalPayment(true); setView('checkout'); }} 
                                className="w-full bg-gray-800/95 backdrop-blur-md text-white font-black py-4 px-7 rounded-3xl flex justify-between items-center border border-emerald-500/30 shadow-2xl transition-all group"
                            >
                                <span className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em]"><IconReceipt className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform"/> MI CUENTA</span>
                                <span className="bg-emerald-500 px-3 py-1 rounded-xl text-xs font-mono shadow-lg shadow-emerald-500/20">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {cartItems.length > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-5 px-7 rounded-3xl flex justify-between shadow-2xl active:scale-[0.98] transition-transform animate-slide-up border border-emerald-500/20"
                            >
                                <span className="tracking-[0.2em] uppercase text-[10px]">REVISAR PEDIDO ({cartItems.length})</span>
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

function isSimpleComanda(type: OrderType, final: boolean) {
    return type === OrderType.DineIn && !final;
}
