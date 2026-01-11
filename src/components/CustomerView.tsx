
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// IDENTIFICADOR VISUAL PARA CONFIRMAR DESPLIEGUE EXITOSO
const VERSION_TAG = "VER_3.0_TOTAL_FORCE_RED_SRC";

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    
    // Checkout States
    const [generalComments, setGeneralComments] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState({ colonia: '', calle: '', numero: '', referencias: '' });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const fetchMenuData = async () => {
        try {
            const [appSettings, fetchedPromotions, fetchedPersonalizations, fetchedProducts, fetchedCategories] = await Promise.all([
                getAppSettings(), getPromotions(), getPersonalizations(), getProducts(), getCategories()
            ]);
            setSettings(appSettings);
            setAllPromotions(fetchedPromotions);
            setAllPersonalizations(fetchedPersonalizations);
            setAllProducts(fetchedProducts);
            setAllCategories(fetchedCategories);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMenuData();
        subscribeToMenuUpdates(fetchMenuData);
        return () => unsubscribeFromChannel();
    }, []);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return allProducts.filter(p => p.available);
        return allProducts.filter(p => p.categoryId === selectedCategory && p.available);
    }, [allProducts, selectedCategory]);

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 3 * 1024 * 1024) return alert("Imagen demasiado grande (Max 3MB)");
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Completa tus datos.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Falta dirección.");
        if (!selectedPaymentMethod) return alert("Elige pago.");
        
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = m.includes('zelle') || m.includes('móvil') || m.includes('transferencia') || m.includes('tarjeta');
        
        if (isDigital && !paymentProof) {
            return alert("Es obligatorio adjuntar el capture de pago.");
        }

        setIsPlacingOrder(true);
        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const finalTotal = cartTotal + shippingCost;

        try {
            await saveOrder({
                customer: { name: customerName, phone: customerPhone, address: customerAddress },
                items: cartItems,
                total: finalTotal,
                status: OrderStatus.Pending,
                branchId: 'main',
                orderType,
                generalComments,
                paymentStatus: 'pending',
                paymentProof: paymentProof || undefined,
            });
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=NUEVO PEDIDO V3`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error"); } finally { setIsPlacingOrder(false); }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#0f1115]"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-[#0f1115] pb-32">
            <header className="bg-[#1a1c23] p-4 sticky top-0 z-[60] border-b border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-5"><h1 className="text-xl font-black text-white uppercase italic">{settings?.branch.alias || 'ALTOQUE FOOD'}</h1></div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'}`}>Todo</button>
                    {allCategories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'}`}>{cat.name}</button>
                    ))}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-[#1a1c23] rounded-[2rem] p-3 flex gap-4 cursor-pointer border border-gray-800 transition-all active:scale-95 group">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover" alt={product.name} />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-emerald-400 text-lg tracking-tighter">${product.price.toFixed(2)}</span>
                                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20"><IconPlus className="h-5 w-5"/></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-6 right-6 z-50">
                    <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-2xl active:scale-95 transition-all uppercase text-[11px] tracking-[0.2em] border border-emerald-400/20">
                        <span>Ver Pedido ({itemCount})</span>
                        <span>Total: ${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-[#0f1115] flex flex-col">
            <header className="p-4 bg-[#1a1c23] flex items-center gap-4 border-b border-gray-800"><button onClick={() => setView('menu')} className="p-2.5 bg-gray-800 rounded-2xl text-white"><IconArrowLeft/></button><h1 className="font-black text-white uppercase text-sm">Tu Pedido</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-[#1a1c23] p-4 rounded-[2rem] flex gap-4 border border-gray-800 shadow-xl">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
                        <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <p className="text-emerald-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-5 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-white"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black text-white text-lg">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center bg-emerald-600/20 text-emerald-400 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="self-start mt-2 p-2 text-gray-600 hover:text-red-500"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-[#1a1c23] border-t border-gray-800 rounded-t-[3rem] shadow-2xl"><button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase tracking-[0.2em] text-[11px] border border-emerald-400/20">Ir al Pago</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalFinal = cartTotal + shippingCost;
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = m.includes('zelle') || m.includes('móvil') || m.includes('transferencia') || m.includes('tarjeta');

        return (
            <div className="min-h-screen bg-[#0a0b0d] text-gray-200">
                {/* HEADER ROJO - SI NO LO VES ASÍ, EL CÓDIGO NO SE HA ACTUALIZADO */}
                <div className="bg-red-600 p-6 flex items-center gap-4 border-b-4 border-red-800 sticky top-0 z-[100] text-white shadow-2xl">
                    <button onClick={() => setView('cart')} className="p-3 bg-white/20 rounded-2xl"><IconArrowLeft className="h-6 w-6"/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black uppercase tracking-tighter text-xl">CHECKOUT V3.0 (SRC)</h1>
                        <span className="text-[8px] font-bold opacity-80 uppercase">{VERSION_TAG}</span>
                    </div>
                </div>
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    {/* TIPO ENTREGA */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.Delivery ? 'bg-emerald-600/10 border-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.6)]' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-600'}`}>Domicilio</span>
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.TakeAway ? 'bg-emerald-600/10 border-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.6)]' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-600'}`}>Para llevar</span>
                            </button>
                        </div>
                    </div>
                    {/* DATOS */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <input type="text" placeholder="Tu Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm" />
                        <input type="tel" placeholder="WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono text-sm" />
                    </div>
                    {/* PAGO */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-[#0f1115] border-gray-800 text-gray-600 hover:border-gray-700'}`}>{pm}</button>
                            ))}
                        </div>
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-emerald-500/20 shadow-inner">
                                    <p className="text-emerald-400 font-black text-[9px] uppercase tracking-[0.4em] mb-4 italic">Datos Bancarios para {selectedPaymentMethod}</p>
                                    <p className="text-white text-sm font-bold">Banco: {settings?.payment.pagoMovil?.bank || 'Consultar'}</p>
                                    <p className="text-emerald-400 font-black text-lg">Tel: {settings?.payment.pagoMovil?.phone || 'Consultar'}</p>
                                </div>
                                <div className="space-y-4">
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-500/30 rounded-[2.5rem] bg-[#0f1115] cursor-pointer shadow-2xl">
                                            <IconUpload className="h-8 w-8 text-emerald-500 mb-3"/>
                                            <span className="text-[10px] text-gray-400 font-black uppercase">Subir Capture de Pago</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-emerald-500">
                                            <img src={paymentProof} className="w-full h-72 object-cover opacity-60" alt="Recibo" />
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-2xl"><IconTrash className="h-5 w-5"/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* FOOTER */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#1a1c23]/95 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] rounded-t-[3rem] space-y-4 z-[150] max-w-2xl mx-auto">
                    <div className="flex justify-between items-center px-4 mb-2">
                        <span className="text-gray-500 font-black text-[10px] uppercase">Total Orden</span>
                        <span className="text-emerald-400 font-black text-4xl tracking-tighter shadow-emerald-500/20">${totalFinal.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-[0.2em] text-[11px] ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 cursor-not-allowed grayscale' : 'bg-emerald-600 text-white shadow-emerald-600/40 hover:brightness-110 active:scale-95'}`}
                    >
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> {isDigital && !paymentProof ? 'Adjuntar Recibo' : 'Enviar Pedido'}</>}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center">
            <IconCheck className="h-20 w-20 mb-8" />
            <h1 className="text-4xl font-black mb-4 uppercase">¡PEDIDO ENVIADO!</h1>
            <button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl uppercase text-xs">Volver al Inicio</button>
        </div>
    );
    return null;
}
