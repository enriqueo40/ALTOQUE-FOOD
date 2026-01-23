
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel, updateOrder } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes Visuales ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800">
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
        <div className="px-6 -mt-16 flex flex-col items-center text-center relative z-10">
            <div className="w-32 h-32 bg-gray-800 rounded-full p-1 shadow-2xl mb-4 border-4 border-gray-900 overflow-hidden">
                {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-black text-emerald-500 text-3xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
            </div>
            
            {hasActiveSession && (
                <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full animate-pulse shadow-lg shadow-emerald-500/5 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    SESIÓN DE MESA ACTIVA
                </div>
            )}

            <h1 className="text-3xl font-black text-white leading-tight">{settings.company.name}</h1>
            <p className="text-xs text-gray-500 mb-6 uppercase tracking-widest font-bold">{settings.branch.alias}</p>
            
            {tableInfo ? (
                <div className="bg-emerald-950/40 backdrop-blur border border-emerald-500/30 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <IconTableLayout className="h-5 w-5 text-emerald-400"/>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">SU MESA ACTUAL</p>
                        <p className="text-sm font-black text-white">{tableInfo.table} • {tableInfo.zone}</p>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-xs bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700 backdrop-blur-sm shadow-xl">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-full transition-all duration-500 ease-out ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                    <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2.5 text-xs font-black transition-colors duration-300 ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>A DOMICILIO</button>
                    <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2.5 text-xs font-black transition-colors duration-300 ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>RECOGER</button>
                </div>
            )}
        </div>
    </div>
);

// --- Componente de Sugerencias Gemini ---

const PairingAI: React.FC<{ items: CartItem[], allProducts: Product[] }> = ({ items, allProducts }) => {
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (items.length > 0) {
            setLoading(true);
            getPairingSuggestion(items, allProducts).then(res => {
                setSuggestion(res);
                setLoading(false);
            });
        } else {
            setSuggestion("");
        }
    }, [items.length]);

    if (!suggestion && !loading) return null;

    return (
        <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-start gap-3 animate-fade-in my-4">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">RECOMENDACIÓN CHEF INTELIGENTE</p>
                {loading ? (
                    <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse mt-2"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

// --- Sub-componentes del Menú ---

const MenuList: React.FC<{ products: Product[], categories: Category[], onProductClick: (p: Product) => void }> = ({ products, categories, onProductClick }) => {
    const [search, setSearch] = useState("");
    return (
        <div className="p-6">
            <div className="relative mb-8">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="¿Qué se te antoja hoy?" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-800/40 border-2 border-gray-800/50 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 outline-none transition-all placeholder-gray-600 font-bold text-gray-200"
                />
            </div>
            {categories.map(cat => {
                const catProds = products.filter(p => p.categoryId === cat.id && p.available && p.name.toLowerCase().includes(search.toLowerCase()));
                if (catProds.length === 0) return null;
                return (
                    <div key={cat.id} className="mb-10">
                        <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-5 flex items-center gap-4">
                            <span className="bg-emerald-500 w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"></span>
                            {cat.name}
                        </h3>
                        <div className="grid gap-5">
                            {catProds.map(p => (
                                <div key={p.id} onClick={() => onProductClick(p)} className="bg-gray-800/30 p-4 rounded-[28px] border border-gray-800/60 flex gap-5 hover:bg-gray-800/60 transition-all cursor-pointer active:scale-[0.97] group">
                                    <img src={p.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl transition-transform group-hover:scale-105 duration-500" />
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <h4 className="font-bold text-gray-100 text-lg group-hover:text-emerald-400 transition-colors leading-tight">{p.name}</h4>
                                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-1.5 font-medium leading-relaxed">{p.description}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-emerald-400 text-lg">${p.price.toFixed(2)}</span>
                                            <div className="bg-gray-700/50 p-2 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><IconPlus className="h-5 w-5"/></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number) => void, 
    onClose: () => void
}> = ({product, onAddToCart, onClose}) => {
    const [quantity, setQuantity] = useState(1);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-[40px] overflow-hidden relative z-10 animate-fade-in-up shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="h-64 relative overflow-hidden">
                    <img src={product.imageUrl} className="w-full h-full object-cover" />
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 p-2.5 rounded-2xl text-white backdrop-blur-md border border-white/10"><IconX className="h-5 w-5"/></button>
                </div>
                <div className="p-8">
                    <h2 className="text-2xl font-black mb-2 leading-tight text-white">{product.name}</h2>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{product.description}</p>
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center bg-gray-800 rounded-2xl p-1 border border-gray-700 shadow-inner">
                            <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-3 text-gray-400 hover:text-white transition-colors"><IconMinus className="h-6 w-6"/></button>
                            <span className="w-12 text-center font-black text-xl text-white">{quantity}</span>
                            <button onClick={() => setQuantity(q => q+1)} className="p-3 text-gray-400 hover:text-white transition-colors"><IconPlus className="h-6 w-6"/></button>
                        </div>
                        <span className="text-3xl font-black text-emerald-500">${(product.price * quantity).toFixed(2)}</span>
                    </div>
                    <button onClick={() => onAddToCart(product, quantity)} className="w-full bg-emerald-600 py-5 rounded-[28px] font-black text-white shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all uppercase tracking-widest">AÑADIR AL PEDIDO</button>
                </div>
            </div>
        </div>
    );
};

const CartSummaryView: React.FC<{ 
    items: CartItem[], 
    total: number, 
    onCheckout: () => void, 
    isDineIn: boolean, 
    onUpdateQuantity: (id: string, q: number) => void,
    onRemoveItem: (id: string) => void,
    allProducts: Product[]
}> = ({ items, total, onCheckout, isDineIn, onUpdateQuantity, onRemoveItem, allProducts }) => (
    <div className="p-6 space-y-4 pb-48 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-white">REVISIÓN</h2>
            <span className="text-[10px] bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">{items.length} ITEMS</span>
        </div>

        {items.length > 0 && <PairingAI items={items} allProducts={allProducts} />}

        <div className="space-y-4">
            {items.map(i => (
                <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-4 rounded-3xl border border-gray-800/60 transition-all active:scale-[0.98]">
                    <img src={i.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-2xl" />
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-gray-100 leading-tight">{i.name}</span>
                            <span className="font-black text-emerald-400 text-sm">${(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center bg-gray-900 rounded-xl px-2 border border-gray-800">
                                <button onClick={() => onUpdateQuantity(i.cartItemId, i.quantity - 1)} className="p-1.5 text-gray-400 hover:text-emerald-500"><IconMinus className="h-3 w-3"/></button>
                                <span className="w-8 text-center text-xs font-black text-white">{i.quantity}</span>
                                <button onClick={() => onUpdateQuantity(i.cartItemId, i.quantity + 1)} className="p-1.5 text-gray-400 hover:text-emerald-500"><IconPlus className="h-3 w-3"/></button>
                            </div>
                            <button onClick={() => onRemoveItem(i.cartItemId)} className="text-rose-500/40 hover:text-rose-500 transition-colors p-2"><IconTrash className="h-4 w-4"/></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        {items.length === 0 && (
            <div className="text-center py-20 opacity-40">
                <IconReceipt className="h-16 w-16 mx-auto mb-4" />
                <p className="font-bold italic">Tu carrito está esperando por algo rico...</p>
            </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/95 backdrop-blur-2xl border-t border-gray-800 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] z-30 rounded-t-[40px]">
             <div className="flex justify-between font-black text-2xl mb-6">
                 <span className="text-gray-500 uppercase text-xs tracking-[0.2em] self-center">SUBTOTAL RONDA</span>
                 <span className="text-white">${total.toFixed(2)}</span>
             </div>
             <button disabled={items.length === 0} onClick={onCheckout} className="w-full bg-emerald-600 py-5.5 rounded-[24px] font-black text-white shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-30 uppercase tracking-[0.2em] text-sm">
                {isDineIn ? 'ENVIAR COMANDA A COCINA' : 'IR A DATOS DE ENTREGA'}
             </button>
        </div>
    </div>
);

const CheckoutView: React.FC<{ 
    total: number, 
    onOrder: (c: Customer, p: PaymentMethod, proof?: string | null) => void, 
    settings: AppSettings, 
    orderType: OrderType,
    isFinalPayment: boolean
}> = ({ total, onOrder, settings, orderType, isFinalPayment }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [proof, setProof] = useState<string | null>(null);

    const isSimpleComanda = orderType === OrderType.DineIn && !isFinalPayment;

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setProof(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onOrder({ name, phone, address: { calle: '', numero: '', colonia: '' } }, 'Efectivo', proof); }} className="p-6 space-y-8 animate-fade-in pb-44">
            <div className="space-y-5 p-7 bg-gray-800/30 border border-gray-800 rounded-[32px] shadow-sm">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">DATOS DEL CLIENTE</h3>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 transition-all font-bold text-white" placeholder="Tu nombre o Apellido" required />
                {!isSimpleComanda && <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 transition-all font-bold text-white" placeholder="WhatsApp (Ej: 58414...)" required />}
            </div>

            {!isSimpleComanda && (
                <div className="space-y-5 p-7 bg-gray-800/30 border border-gray-800 rounded-[32px] shadow-sm">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">CARGA DE PAGO</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-bold uppercase tracking-wider">Adjunta el comprobante para {isFinalPayment ? 'liquidar tu cuenta total' : 'procesar tu pedido'}.</p>
                    <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-700 rounded-3xl cursor-pointer hover:bg-gray-800/50 transition-all group overflow-hidden">
                        {proof ? (
                            <img src={proof} className="w-full h-full object-contain rounded-3xl p-4" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-500 group-hover:text-emerald-400">
                                <IconUpload className="h-10 w-10 mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Toca para cargar comprobante</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-8 bg-gray-900/95 backdrop-blur-2xl border-t border-gray-800 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] z-30 rounded-t-[40px]">
                 <div className="flex justify-between font-black text-2xl mb-6">
                    <span className="text-gray-500 uppercase text-xs tracking-[0.2em] self-center">{isFinalPayment ? 'TOTAL ACUMULADO' : 'TOTAL ORDEN'}</span>
                    <span className="text-emerald-500">${total.toFixed(2)}</span>
                 </div>
                 <button type="submit" className={`w-full py-5.5 rounded-[24px] font-black text-white flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.98] ${isSimpleComanda ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-green-600 shadow-green-900/40'}`}>
                    {isSimpleComanda ? 'ENVIAR COMANDA A COCINA' : <><IconWhatsapp className="h-7 w-7" /> {isFinalPayment ? 'REPORTAR PAGO FINAL' : 'NOTIFICAR PEDIDO'}</>}
                </button>
            </div>
        </form>
    );
};

// --- Componente Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    
    // Gestión de Sesión de Mesa Persistente
    const [activeOrderId, setActiveOrderId] = useState<string | null>(localStorage.getItem('activeOrderId'));
    const [sessionTotal, setSessionTotal] = useState<number>(Number(localStorage.getItem('sessionTotal')) || 0);
    const [isFinalPayment, setIsFinalPayment] = useState(false);

    const { cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const [s, p, c] = await Promise.all([getAppSettings(), getProducts(), getCategories()]);
            setSettings(s); setAllProducts(p); setAllCategories(c);
        };
        fetch(); subscribeToMenuUpdates(fetch);

        // Detección de Mesa vía URL
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }

        return unsubscribeFromChannel;
    }, []);

    const handleOrderAction = async (customer: Customer, payment: PaymentMethod, proof?: string | null) => {
        if (!settings) return;
        
        try {
            if (isFinalPayment && activeOrderId) {
                // FLUJO PAGO FINAL: Reportar cierre de cuenta total
                await updateOrder(activeOrderId, { paymentStatus: 'paid', paymentProof: proof || undefined });
                const msg = `💰 *SOLICITUD DE CIERRE DE CUENTA*\n📍 Ubicación: *MESA ${tableInfo?.table} - ${tableInfo?.zone}*\n👤 Cliente: ${customer.name}\n💰 *TOTAL A PAGAR: $${sessionTotal.toFixed(2)}*\n✅ Comprobante adjunto.\n\n_Favor validar pago en sistema._`;
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpiar todo al finalizar estancia
                localStorage.removeItem('activeOrderId');
                localStorage.removeItem('sessionTotal');
                setActiveOrderId(null);
                setSessionTotal(0);
                clearCart();
            } else {
                // FLUJO COMANDA: Enviar ronda a cocina
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
                    const newAccTotal = sessionTotal + cartTotal;
                    localStorage.setItem('activeOrderId', saved.id);
                    localStorage.setItem('sessionTotal', newAccTotal.toString());
                    setActiveOrderId(saved.id);
                    setSessionTotal(newAccTotal);
                }

                const title = orderType === OrderType.DineIn ? 'COMANDA A COCINA' : 'NUEVO PEDIDO';
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                const msg = `🧾 *${title} - ${settings.company.name}*\n👤 Cliente: ${customer.name}\n📍 Entrega: ${orderType === OrderType.DineIn ? 'MESA ' + tableInfo?.table : 'DOMICILIO'}\n----------------\n${itemsStr}\n----------------\n💰 *Total ronda: $${cartTotal.toFixed(2)}*`;
                
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
            }
            setView('confirmation');
        } catch(e) { 
            alert("Error al procesar el pedido. Verifica tu conexión."); 
        }
    };

    if (!settings) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500 font-black animate-pulse uppercase tracking-[0.3em]">Iniciando Experience...</div>;

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI PEDIDO' : (isFinalPayment ? 'PAGAR CUENTA' : 'DATOS')} 
                        onBack={() => { setView(view === 'checkout' ? 'cart' : 'menu'); setIsFinalPayment(false); }} 
                    />
                )}
                
                <div className="flex-1 overflow-y-auto">
                    {view === 'menu' && (
                        <div className="animate-fade-in pb-44">
                            <RestaurantHero settings={settings} orderType={orderType} setOrderType={setOrderType} tableInfo={tableInfo} hasActiveSession={!!activeOrderId} />
                            <MenuList products={allProducts} categories={allCategories} onProductClick={setSelectedProduct} />
                        </div>
                    )}
                    
                    {view === 'cart' && (
                        <CartSummaryView 
                            items={cartItems} 
                            total={cartTotal} 
                            onCheckout={() => setView('checkout')} 
                            isDineIn={orderType === OrderType.DineIn} 
                            onUpdateQuantity={updateQuantity}
                            onRemoveItem={removeFromCart}
                            allProducts={allProducts}
                        />
                    )}
                    
                    {view === 'checkout' && (
                        <CheckoutView 
                            total={isFinalPayment ? sessionTotal : cartTotal} 
                            onOrder={handleOrderAction} 
                            settings={settings} 
                            orderType={orderType} 
                            isFinalPayment={isFinalPayment} 
                        />
                    )}
                    
                    {view === 'confirmation' && (
                        <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in">
                            <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-inner">
                                <IconCheck className="w-14 h-14 text-emerald-500"/>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{isFinalPayment ? '¡Esperamos verte pronto!' : '¡EN COCINA!'}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
                                    {isFinalPayment ? 'Tu pago está en revisión. ¡Gracias por elegirnos!' : 'Hemos recibido tu orden correctamente. Puedes seguir pidiendo más del menú si lo deseas.'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFinalPayment(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 py-4 rounded-3xl font-black text-gray-200 border border-gray-700 active:scale-95 transition-all shadow-xl hover:bg-gray-700">VOLVER AL INICIO</button>
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onClose={() => setSelectedProduct(null)} 
                        onAddToCart={(p, q) => { addToCart(p, q); setSelectedProduct(null); }} 
                    />
                )}
                
                {/* Barra flotante de navegación dinámica */}
                {view === 'menu' && (
                    <div className="fixed bottom-10 left-6 right-6 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {activeOrderId && (
                            <button 
                                onClick={() => { setIsFinalPayment(true); setView('checkout'); }} 
                                className="w-full bg-gray-800/95 backdrop-blur-md text-white font-black py-4 px-6 rounded-3xl flex justify-between items-center border border-emerald-500/30 shadow-2xl transition-all hover:bg-gray-700 group"
                            >
                                <span className="flex items-center gap-2.5 text-xs uppercase tracking-widest"><IconReceipt className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform"/> MI CUENTA</span>
                                <span className="bg-emerald-500 px-3 py-1 rounded-xl text-xs font-mono">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {cartItems.length > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-600 text-white font-black py-5 px-7 rounded-3xl flex justify-between shadow-2xl active:scale-[0.98] transition-transform animate-slide-up border border-emerald-500/20"
                            >
                                <span className="tracking-widest uppercase text-sm">REVISAR RONDA ({cartItems.length})</span>
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
