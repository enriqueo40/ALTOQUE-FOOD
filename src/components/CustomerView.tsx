
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// MARCADOR DE VERSIÓN SRC
const SRC_VERSION = "V4.0_BLUE_FORCE_SRC";

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

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Fix: Extract file from event target to resolve reference error on line 58
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Completa tus datos.");
        if (!selectedPaymentMethod) return alert("Elige pago.");
        
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia');
        
        if (isDigital && !paymentProof) return alert("Adjunta el comprobante.");

        setIsPlacingOrder(true);
        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const total = cartTotal + shippingCost;

        try {
            await saveOrder({
                customer: { name: customerName, phone: customerPhone, address: customerAddress },
                items: cartItems,
                total: total,
                status: OrderStatus.Pending,
                branchId: 'main',
                orderType,
                generalComments,
                paymentStatus: 'pending',
                paymentProof: paymentProof || undefined,
            });
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=PEDIDO_V4`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error"); } finally { setIsPlacingOrder(false); }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#0a0b0d]"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-[#0a0b0d] pb-32">
            <header className="bg-[#15171d] p-4 sticky top-0 z-[60] border-b border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-5"><h1 className="text-xl font-black text-white uppercase italic tracking-tighter">{settings?.branch.alias || 'ALTOQUE'}</h1></div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800/50 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800/50 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProducts.filter(p => p.available && (selectedCategory === 'all' || p.categoryId === selectedCategory)).map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-[#15171d] rounded-[2rem] p-3 flex gap-4 cursor-pointer border border-gray-800 transition-all active:scale-95 group">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover" alt={product.name} />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-center"><span className="font-black text-blue-400 text-lg tracking-tighter">${product.price.toFixed(2)}</span><div className="bg-blue-500/10 p-2 rounded-xl text-blue-400 border border-blue-500/20"><IconPlus className="h-5 w-5"/></div></div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && <div className="fixed bottom-6 left-6 right-6 z-50"><button onClick={() => setView('cart')} className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-2xl active:scale-95 transition-all uppercase text-[11px] tracking-[0.2em] border border-blue-400/20"><span>Ver Pedido ({itemCount})</span><span>Total: ${cartTotal.toFixed(2)}</span></button></div>}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-[#0a0b0d] flex flex-col">
            <header className="p-4 bg-[#15171d] flex items-center gap-4 border-b border-gray-800"><button onClick={() => setView('menu')} className="p-2.5 bg-gray-800 rounded-2xl text-white"><IconArrowLeft/></button><h1 className="font-black text-white uppercase text-sm">Tu Pedido</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-[#15171d] p-4 rounded-[2rem] flex gap-4 border border-gray-800 shadow-xl"><img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} /><div className="flex-1 flex flex-col justify-center"><h4 className="font-bold text-white text-sm">{item.name}</h4><p className="text-blue-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p><div className="flex items-center gap-5 mt-3"><button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-white"><IconMinus className="h-4 w-4"/></button><span className="font-black text-white text-lg">{item.quantity}</span><button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded-xl"><IconPlus className="h-4 w-4"/></button></div></div><button onClick={() => removeFromCart(item.cartItemId)} className="self-start mt-2 p-2 text-gray-600 hover:text-red-500"><IconTrash className="h-5 w-5"/></button></div>
                ))}
            </div>
            <div className="p-6 bg-[#15171d] border-t border-gray-800 rounded-t-[3rem] shadow-2xl"><button onClick={() => setView('checkout')} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase tracking-[0.2em] text-[11px] border border-blue-400/20">Ir al Pago</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalFinal = cartTotal + shippingCost;
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia');

        return (
            <div className="min-h-screen bg-[#07080a] text-gray-200">
                {/* HEADER AZUL SRC - PRUEBA DEFINITIVA */}
                <div className="bg-blue-600 p-6 flex items-center gap-4 border-b-4 border-blue-800 sticky top-0 z-[100] text-white shadow-2xl">
                    <button onClick={() => setView('cart')} className="p-3 bg-white/20 rounded-2xl"><IconArrowLeft className="h-6 w-6"/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black uppercase tracking-tighter text-xl leading-none">CHECKOUT BLUE (SRC)</h1>
                        <span className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-widest">{SRC_VERSION}</span>
                    </div>
                </div>
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.Delivery ? 'bg-blue-600/10 border-blue-500 shadow-lg' : 'bg-[#0a0b0d] border-gray-800 opacity-50'}`}><IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-blue-400' : 'text-gray-600'}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-600'}`}>Domicilio</span></button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.TakeAway ? 'bg-blue-600/10 border-blue-500 shadow-lg' : 'bg-[#0a0b0d] border-gray-800 opacity-50'}`}><IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-blue-400' : 'text-gray-600'}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-600'}`}>Llevar</span></button>
                        </div>
                    </div>
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <input type="text" placeholder="Tu Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm" />
                        <input type="tel" placeholder="WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all font-mono text-sm" />
                    </div>
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-[#0a0b0d] border-gray-800 text-gray-600'}`}>{pm}</button>
                            ))}
                        </div>
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 space-y-6">
                                <div className="p-6 bg-blue-500/5 rounded-[2rem] border-2 border-blue-500/20 shadow-inner">
                                    <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] mb-4">Datos Bancarios</p>
                                    <p className="text-white text-sm font-bold">Banco: {settings?.payment.pagoMovil?.bank || 'Consultar'}</p>
                                    <p className="text-blue-400 font-black text-lg">Tel: {settings?.payment.pagoMovil?.phone || 'Consultar'}</p>
                                </div>
                                <div className="space-y-4">
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-500/30 rounded-[2.5rem] bg-[#0a0b0d] cursor-pointer shadow-2xl"><IconUpload className="h-8 w-8 text-blue-500 mb-3"/><span className="text-[10px] text-gray-400 font-black uppercase">Subir Capture</span><input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} /></label>
                                    ) : (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-blue-500"><img src={paymentProof} className="w-full h-72 object-cover opacity-60" alt="Recibo" /><button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-2xl"><IconTrash className="h-5 w-5"/></button></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#15171d]/95 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] rounded-t-[3rem] space-y-4 z-[150] max-w-xl mx-auto">
                    <div className="flex justify-between items-center px-4 mb-2"><span className="text-gray-500 font-black text-[10px] uppercase">Total Orden</span><span className="text-blue-400 font-black text-4xl tracking-tighter">${totalFinal.toFixed(2)}</span></div>
                    <button onClick={handlePlaceOrder} disabled={isPlacingOrder || (isDigital && !paymentProof)} className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-[0.2em] text-[11px] ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-500/40 hover:brightness-110 active:scale-95'}`}>{isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> {isDigital && !paymentProof ? 'Adjuntar Recibo' : 'Enviar Pedido'}</>}</button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-8 text-white text-center"><IconCheck className="h-20 w-20 mb-8" /><h1 className="text-4xl font-black mb-4 uppercase">¡LISTO!</h1><button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl uppercase text-xs">Volver al Inicio</button></div>
    );
    return null;
}
