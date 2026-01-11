
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// IDENTIFICADOR VISUAL PARA CONFIRMAR DESPLIEGUE EXITOSO
const VERSION_TAG = "VER_3.0_TOTAL_FORCE_RED";

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
        } catch (error) { 
            console.error("Supabase Sync Error:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => {
        fetchMenuData();
        subscribeToMenuUpdates(fetchMenuData);
        // Limpieza de estados antiguos para forzar actualización
        if (!localStorage.getItem('v3_initialized')) {
            localStorage.setItem('v3_initialized', 'true');
            console.log("Iniciando Versión 3.0...");
        }
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
        if (!customerName || !customerPhone) return alert("Completa tu nombre y WhatsApp.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Ingresa la dirección de envío.");
        if (!selectedPaymentMethod) return alert("Selecciona un método de pago.");
        
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
            const message = encodeURIComponent(`*NUEVO PEDIDO WEB*\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}\nPago: ${selectedPaymentMethod}\n${paymentProof ? '✅ Comprobante adjunto' : ''}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { 
            alert("Error al procesar el pedido."); 
        } finally { 
            setIsPlacingOrder(false); 
        }
    };

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#0f1115]">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (view === 'menu') return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-32">
            <header className="bg-white dark:bg-[#1a1c23] p-4 sticky top-0 z-[60] border-b dark:border-gray-800 shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black dark:text-emerald-500 uppercase tracking-tighter italic">{settings?.branch.alias || 'ALTOQUE FOOD'}</h1>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full"><IconSearch className="h-5 w-5 text-gray-500"/></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-[#1a1c23] rounded-3xl p-3 flex gap-4 cursor-pointer border dark:border-gray-800 shadow-sm transition-all active:scale-95">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover" alt={product.name}/>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold dark:text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-end">
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">${product.price.toFixed(2)}</span>
                                <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400"><IconPlus className="h-5 w-5"/></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-6 right-6 z-[70]">
                    <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-2xl transition-transform active:scale-95 uppercase text-xs tracking-widest border border-emerald-400/20">
                        <span>Mi Pedido ({itemCount})</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] flex flex-col">
            <header className="p-4 bg-white dark:bg-[#1a1c23] flex items-center gap-4 border-b dark:border-gray-800"><button onClick={() => setView('menu')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full dark:text-white"><IconArrowLeft/></button><h1 className="font-black dark:text-white uppercase tracking-tighter">Tu Carrito</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-white dark:bg-[#1a1c23] p-4 rounded-3xl flex gap-4 border dark:border-gray-800 shadow-sm">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
                        <div className="flex-1">
                            <h4 className="font-bold dark:text-white text-sm">{item.name}</h4>
                            <p className="text-emerald-600 dark:text-emerald-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl dark:text-white"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 text-gray-400 hover:text-red-500"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-white dark:bg-[#1a1c23] border-t dark:border-gray-800 rounded-t-[2.5rem]"><button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm">Pagar Orden</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const total = cartTotal + shippingCost;
        
        // DETECCIÓN DE PAGO DIGITAL MEJORADA
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = m.includes('zelle') || m.includes('móvil') || m.includes('transferencia') || m.includes('tarjeta');

        return (
            <div className="min-h-screen bg-[#0a0b0d] text-gray-200">
                {/* HEADER ROJO - SI NO LO VES ASÍ, EL CÓDIGO NO SE HA ACTUALIZADO */}
                <div className="bg-red-600 p-6 flex items-center gap-4 border-b-4 border-red-800 sticky top-0 z-[100] text-white shadow-2xl">
                    <button onClick={() => setView('cart')} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-all"><IconArrowLeft className="h-6 w-6"/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black uppercase tracking-tighter text-xl leading-none">CHECKOUT V3.0</h1>
                        <p className="text-[9px] font-bold opacity-80 mt-1 uppercase tracking-widest">{VERSION_TAG}</p>
                    </div>
                </div>
                
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    {/* 1. MÉTODO DE ENTREGA */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500 mb-5">Método de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-5 rounded-[2rem] border transition-all duration-300 gap-2 ${orderType === OrderType.Delivery ? 'bg-emerald-600/10 border-emerald-500 shadow-lg' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>Domicilio</span>
                                <span className="text-[9px] font-bold text-emerald-500/80 flex items-center gap-1">
                                    <IconClock className="h-3 w-3" /> {settings?.shipping.deliveryTime.min || '25'}-{settings?.shipping.deliveryTime.max || '45'} min
                                </span>
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-5 rounded-[2rem] border transition-all duration-300 gap-2 ${orderType === OrderType.TakeAway ? 'bg-emerald-600/10 border-emerald-500 shadow-lg' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>Para llevar</span>
                                <span className="text-[9px] font-bold text-emerald-500/80 flex items-center gap-1">
                                    <IconClock className="h-3 w-3" /> {settings?.shipping.pickupTime.min || '15'} min
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 2. DATOS PERSONALES */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500">Información de contacto</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm" />
                            <input type="tel" placeholder="WhatsApp (Ej. 0414...)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono text-sm" />
                            {orderType === OrderType.Delivery && (
                                <textarea placeholder="Dirección exacta de entrega..." value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm resize-none" rows={3} />
                            )}
                        </div>
                    </div>

                    {/* 3. MÉTODOS DE PAGO */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500 mb-5">Elige cómo pagar</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-[#0f1115] border-gray-800 text-gray-500 hover:border-gray-700'}`}>{pm}</button>
                            ))}
                        </div>

                        {/* BLOQUE DIGITAL REFORZADO */}
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="p-6 bg-emerald-500/5 rounded-3xl border-2 border-emerald-500/30 shadow-inner">
                                    <div className="flex items-center gap-3 text-emerald-400 font-black text-[9px] uppercase tracking-[0.4em] mb-4">
                                        <IconInfo className="h-4 w-4"/> Datos para {selectedPaymentMethod}
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        {(m.includes('movil') || m.includes('móvil')) ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-white uppercase">{settings?.payment.pagoMovil?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Teléfono:</span> <span className="font-mono font-bold text-emerald-400 text-lg tracking-tighter">{settings?.payment.pagoMovil?.phone || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Cédula/RIF:</span> <span className="font-mono font-bold text-white">{settings?.payment.pagoMovil?.idNumber || 'Consultar WhatsApp'}</span></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-white uppercase">{settings?.payment.transfer?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 border-b border-gray-800/40 pb-2"><span className="text-gray-500 text-[10px] uppercase font-bold">N° Cuenta:</span> <span className="font-mono font-bold text-emerald-400 text-xs break-all leading-tight">{settings?.payment.transfer?.accountNumber || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span> <span className="font-bold text-white">{settings?.payment.transfer?.accountHolder || 'Consultar WhatsApp'}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Adjuntar comprobante (Capture)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-500/30 rounded-[2.5rem] bg-[#0f1115] cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group shadow-xl">
                                            <IconUpload className="h-10 w-10 text-emerald-500/40 group-hover:text-emerald-500 mb-2 transition-transform group-hover:-translate-y-1"/>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Toca para cargar imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-emerald-500">
                                            <img src={paymentProof} className="w-full h-72 object-cover opacity-60" alt="Recibo" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-all"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-6 left-0 right-0 text-white text-[10px] font-black text-center uppercase tracking-widest flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> Capture Listo
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. NOTAS */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500">¿Alguna nota extra?</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none text-sm" placeholder="Ej. El timbre no suena, llamar al llegar..." />
                    </div>
                </div>

                {/* FOOTER GLOBAL - SIEMPRE VISIBLE ABAJO */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#1a1c23]/95 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] rounded-t-[3rem] space-y-4 z-[150] max-w-xl mx-auto">
                    <div className="flex justify-between items-center px-4">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Total a Pagar</span>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">${total.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-sm ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-500/40 active:scale-95'}`}
                    >
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> {isDigital && !paymentProof ? 'Adjunta el capture' : 'Confirmar Pedido'}</>}
                    </button>
                    {isDigital && !paymentProof && <p className="text-[9px] text-center text-red-500 font-black uppercase animate-pulse tracking-widest">Se requiere comprobante para activar el botón</p>}
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce"><IconCheck className="h-12 w-12 text-white" /></div>
            <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter italic">¡PEDIDO RECIBIDO!</h1>
            <p className="mb-12 text-emerald-50 font-bold max-w-xs leading-tight text-lg">Tu pedido ya está en camino a nuestra cocina. Te contactaremos vía WhatsApp.</p>
            <button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-gray-900 transition-all uppercase text-xs tracking-widest">Volver al Menú</button>
        </div>
    );
    return null;
}
