
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel, updateOrder } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes Mejorados ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors">
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
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent"></div>
        </div>
        <div className="px-6 -mt-14 flex flex-col items-center text-center relative z-10">
            <div className="w-28 h-28 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-4 border-gray-900 overflow-hidden">
                {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
            </div>
            
            {hasActiveSession && (
                <div className="mb-3 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full animate-pulse shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    CUENTA ABIERTA EN MESA
                </div>
            )}

            <h1 className="text-2xl font-bold text-white">{settings.company.name}</h1>
            <p className="text-xs text-gray-400 mb-5">{settings.branch.alias}</p>
            
            {tableInfo ? (
                <div className="bg-emerald-950/40 backdrop-blur border border-emerald-500/30 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                    <IconTableLayout className="h-5 w-5 text-emerald-400"/>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Estás en la mesa</p>
                        <p className="text-sm font-black text-white">{tableInfo.table} ({tableInfo.zone})</p>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-xs bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700 backdrop-blur-sm">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-500 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                    <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>A DOMICILIO</button>
                    <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>PARA RECOGER</button>
                </div>
            )}
        </div>
    </div>
);

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
        <div className="mx-0 mb-6 p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-2xl flex items-start gap-3 animate-fade-in">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Sugerencia de la Casa (IA)</p>
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
    onAddToCart: (product: Product, quantity: number) => void, 
    onClose: () => void
}> = ({product, onAddToCart, onClose}) => {
    const [quantity, setQuantity] = useState(1);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-3xl overflow-hidden relative z-10 animate-fade-in-up">
                <img src={product.imageUrl} className="w-full h-48 object-cover" />
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-2">{product.name}</h2>
                    <p className="text-gray-400 text-sm mb-6">{product.description}</p>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center bg-gray-800 rounded-xl p-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-2 text-gray-400 hover:text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                            <button onClick={() => setQuantity(q => q+1)} className="p-2 text-gray-400 hover:text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                        <span className="text-2xl font-black text-emerald-500">${(product.price * quantity).toFixed(2)}</span>
                    </div>
                    <button onClick={() => onAddToCart(product, quantity)} className="w-full bg-emerald-500 py-4 rounded-2xl font-black text-white shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">AGREGAR AL PEDIDO</button>
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
    isSessionActive: boolean,
    onUpdateQuantity: (id: string, q: number) => void,
    onRemoveItem: (id: string) => void,
    allProducts: Product[]
}> = ({ items, total, onCheckout, isDineIn, isSessionActive, onUpdateQuantity, onRemoveItem, allProducts }) => (
    <div className="p-5 space-y-4 pb-48">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">RESUMEN DEL PEDIDO</h2>
            <span className="text-[10px] bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{items.length} productos</span>
        </div>
        
        {items.length > 0 && <PairingAI items={items} allProducts={allProducts} />}

        {items.map(i => (
            <div key={i.cartItemId} className="flex gap-4 bg-gray-800/40 p-3.5 rounded-2xl border border-gray-800/60">
                <img src={i.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-sm">{i.name}</span>
                        <span className="font-black text-emerald-400">${(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-gray-900/50 rounded-lg px-2 border border-gray-700/50">
                            <button onClick={() => onUpdateQuantity(i.cartItemId, i.quantity - 1)} className="p-1.5 text-gray-400"><IconMinus className="h-3 w-3"/></button>
                            <span className="w-6 text-center text-xs font-bold">{i.quantity}</span>
                            <button onClick={() => onUpdateQuantity(i.cartItemId, i.quantity + 1)} className="p-1.5 text-gray-400"><IconPlus className="h-3 w-3"/></button>
                        </div>
                        <button onClick={() => onRemoveItem(i.cartItemId)} className="text-rose-500/50 hover:text-rose-500"><IconTrash className="h-4 w-4"/></button>
                    </div>
                </div>
            </div>
        ))}
        {items.length === 0 && <p className="text-center py-10 text-gray-500 italic">No hay productos seleccionados.</p>}
        
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 shadow-2xl z-30">
             <div className="flex justify-between font-black text-xl mb-5">
                 <span className="text-gray-400 uppercase text-xs tracking-widest self-center">Subtotal actual</span>
                 <span>${total.toFixed(2)}</span>
             </div>
             <button disabled={items.length === 0} onClick={onCheckout} className="w-full bg-emerald-500 py-4.5 rounded-2xl font-black text-white shadow-xl shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-30 uppercase tracking-widest">
                {isDineIn ? 'ENVIAR A COCINA' : 'CONTINUAR AL PAGO'}
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

    const isSimpleOrder = orderType === OrderType.DineIn && !isFinalPayment;

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setProof(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onOrder({ name, phone, address: { calle: '', numero: '', colonia: '' } }, 'Efectivo', proof); }} className="p-5 space-y-6 animate-fade-in pb-44">
            <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-3xl">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Tus Datos</h3>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-1 focus:ring-emerald-500 transition-all" placeholder="Nombre completo" required />
                {!isSimpleOrder && <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-2xl p-4 outline-none focus:ring-1 focus:ring-emerald-500" placeholder="WhatsApp (Ej: 58414...)" required />}
            </div>

            {!isSimpleOrder && (
                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-3xl">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Reportar Pago</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed uppercase">Si realizaste Pago Móvil o Transferencia, adjunta la captura para {isFinalPayment ? 'cerrar tu cuenta' : 'confirmar el pedido'}.</p>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-3xl cursor-pointer hover:bg-gray-800/50 transition-all">
                        {proof ? (
                            <img src={proof} className="w-full h-full object-contain rounded-3xl p-3" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <IconUpload className="h-8 w-8 mb-3 opacity-50" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Cargar comprobante</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 shadow-2xl z-30">
                 <div className="flex justify-between font-black text-xl mb-5">
                    <span className="text-gray-400 uppercase text-xs tracking-widest self-center">{isFinalPayment ? 'TOTAL ACUMULADO' : 'TOTAL ORDEN'}</span>
                    <span>${total.toFixed(2)}</span>
                 </div>
                 <button type="submit" className={`w-full py-4.5 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] ${isSimpleOrder ? 'bg-emerald-600 shadow-emerald-500/10' : 'bg-green-600 shadow-green-500/10'}`}>
                    {isSimpleOrder ? 'CONFIRMAR Y ENVIAR A COCINA' : <><IconWhatsapp className="h-6 w-6" /> {isFinalPayment ? 'NOTIFICAR CIERRE POR WHATSAPP' : 'NOTIFICAR PAGO POR WHATSAPP'}</>}
                </button>
            </div>
        </form>
    );
};

const MenuList: React.FC<{ products: Product[], categories: Category[], onProductClick: (p: Product) => void }> = ({ products, categories, onProductClick }) => {
    const [search, setSearch] = useState("");
    return (
        <div className="p-4 pb-32">
            <div className="relative mb-6">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Buscar platillo o bebida..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-gray-600"
                />
            </div>
            {categories.map(cat => {
                const catProds = products.filter(p => p.categoryId === cat.id && p.available && p.name.toLowerCase().includes(search.toLowerCase()));
                if (catProds.length === 0) return null;
                return (
                    <div key={cat.id} className="mb-8">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                            <span className="bg-emerald-500 w-2 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            {cat.name}
                        </h3>
                        <div className="grid gap-4">
                            {catProds.map(p => (
                                <div key={p.id} onClick={() => onProductClick(p)} className="bg-gray-800/30 p-3.5 rounded-2xl border border-gray-800/60 flex gap-4 hover:bg-gray-800/60 transition-colors cursor-pointer active:scale-[0.98]">
                                    <img src={p.imageUrl} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                                    <div className="flex-1 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="font-bold text-gray-100">{p.name}</h4>
                                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-emerald-400">${p.price.toFixed(2)}</span>
                                            <div className="bg-gray-700/50 p-1.5 rounded-lg text-emerald-500"><IconPlus className="h-4 w-4"/></div>
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

// --- Componente Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    
    // Sesión de mesa persistente
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

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }

        return unsubscribeFromChannel;
    }, []);

    const handleOrder = async (customer: Customer, payment: PaymentMethod, proof?: string | null) => {
        if (!settings) return;
        
        try {
            if (isFinalPayment && activeOrderId) {
                // FLUJO PAGO FINAL: Reportar cierre de cuenta
                await updateOrder(activeOrderId, { paymentStatus: 'paid', paymentProof: proof || undefined });
                const msg = `💰 *SOLICITUD DE PAGO - MESA ${tableInfo?.table}*\n👤 Cliente: ${customer.name}\n📍 Ubicación: ${tableInfo?.zone}\n💰 *TOTAL ACUMULADO: $${sessionTotal.toFixed(2)}*\n✅ Comprobante adjunto.`;
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                // Limpiar sesión local
                localStorage.removeItem('activeOrderId');
                localStorage.removeItem('sessionTotal');
                setActiveOrderId(null);
                setSessionTotal(0);
                clearCart();
            } else {
                // FLUJO COMANDA: Enviar pedido a cocina
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
                    const newSessionTotal = sessionTotal + cartTotal;
                    localStorage.setItem('activeOrderId', saved.id);
                    localStorage.setItem('sessionTotal', newSessionTotal.toString());
                    setActiveOrderId(saved.id);
                    setSessionTotal(newSessionTotal);
                }

                const title = orderType === OrderType.DineIn ? 'COMANDA A COCINA' : 'NUEVO PEDIDO';
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                const msg = `🧾 *${title} - ${settings.company.name}*\n👤 Cliente: ${customer.name}\n📍 Entrega: ${orderType === OrderType.DineIn ? 'MESA ' + tableInfo?.table : customer.address.calle}\n----------------\n${itemsStr}\n----------------\n💰 *Total pedido: $${cartTotal.toFixed(2)}*`;
                
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
            }
            setView('confirmation');
        } catch(e) { 
            console.error(e);
            alert("Error al procesar el pedido. Intenta de nuevo."); 
        }
    };

    if (!settings) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500 font-bold animate-pulse">Iniciando ALTOQUE FOOD...</div>;

    const currentCheckoutTotal = isFinalPayment ? sessionTotal : cartTotal;

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/30">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI COMANDA' : (isFinalPayment ? 'PAGAR CUENTA' : 'CONFIRMAR')} 
                        onBack={() => { setView(view === 'checkout' ? 'cart' : 'menu'); setIsFinalPayment(false); }} 
                    />
                )}
                
                {view === 'menu' && (
                    <div className="animate-fade-in">
                        <RestaurantHero settings={settings} orderType={orderType} setOrderType={setOrderType} tableInfo={tableInfo} hasActiveSession={!!activeOrderId} />
                        <MenuList products={allProducts} categories={allCategories} onProductClick={setSelectedProduct} />
                    </div>
                )}
                
                {view === 'cart' && (
                    <div className="animate-slide-up">
                        <CartSummaryView 
                            items={cartItems} 
                            total={cartTotal} 
                            onCheckout={() => setView('checkout')} 
                            isDineIn={orderType === OrderType.DineIn} 
                            isSessionActive={!!activeOrderId} 
                            onUpdateQuantity={updateQuantity}
                            onRemoveItem={removeFromCart}
                            allProducts={allProducts}
                        />
                    </div>
                )}
                
                {view === 'checkout' && (
                    <CheckoutView 
                        total={currentCheckoutTotal} 
                        onOrder={handleOrder} 
                        settings={settings} 
                        orderType={orderType} 
                        isFinalPayment={isFinalPayment} 
                    />
                )}
                
                {view === 'confirmation' && (
                    <div className="p-10 text-center h-[85vh] flex flex-col items-center justify-center gap-6 animate-fade-in">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                            <IconCheck className="w-12 h-12 text-emerald-500"/>
                        </div>
                        <h2 className="text-3xl font-black text-white">{isFinalPayment ? '¡CUENTA CERRADA!' : '¡COMANDA EN COCINA!'}</h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                            {isFinalPayment ? 'Tu pago está siendo verificado. ¡Esperamos verte pronto!' : 'Hemos notificado tu pedido. Puedes seguir agregando más cosas desde el menú.'}
                        </p>
                        <button onClick={() => { setIsFinalPayment(false); setView('menu'); }} className="w-full max-w-xs bg-gray-800 py-4 rounded-2xl font-bold text-gray-200 border border-gray-700 active:scale-95 transition-all">VOLVER AL MENÚ</button>
                    </div>
                )}

                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onClose={() => setSelectedProduct(null)} 
                        onAddToCart={(p, q) => { addToCart(p, q); setSelectedProduct(null); }} 
                    />
                )}
                
                {/* Barra flotante dinámica */}
                {view === 'menu' && (
                    <div className="fixed bottom-8 left-6 right-6 max-w-md mx-auto z-40 flex flex-col gap-3">
                        {activeOrderId && (
                            <button 
                                onClick={() => { setIsFinalPayment(true); setView('checkout'); }} 
                                className="w-full bg-gray-800/95 backdrop-blur-md text-white font-black py-3.5 px-6 rounded-2xl flex justify-between items-center border border-emerald-500/40 shadow-2xl transition-all hover:bg-gray-700"
                            >
                                <span className="flex items-center gap-2 text-xs uppercase tracking-widest"><IconReceipt className="h-5 w-5 text-emerald-400"/> MI CUENTA</span>
                                <span className="bg-emerald-500 px-3 py-1 rounded-lg text-xs font-mono">${sessionTotal.toFixed(2)}</span>
                            </button>
                        )}
                        {cartItems.length > 0 && (
                            <button 
                                onClick={() => setView('cart')} 
                                className="w-full bg-emerald-500 text-white font-black py-4.5 px-6 rounded-2xl flex justify-between shadow-2xl active:scale-[0.98] transition-transform"
                            >
                                <span className="tracking-widest uppercase">VER MI PEDIDO ({cartItems.length})</span>
                                <span className="font-mono">${cartTotal.toFixed(2)}</span>
                            </button>
                        )}
                    </div>
                )}
                <Chatbot />
            </div>
        </div>
    );
}
