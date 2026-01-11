
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// MARCADOR PARA COMPROBAR SI VERCEL ACTUALIZÓ EL CÓDIGO
const APP_DEPLOY_VERSION = "VER_2.0_ULTRA_FIX";

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
            console.error("Error cargando datos:", error); 
        } finally { 
            setIsLoading(false); 
        }
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
            if (file.size > 3 * 1024 * 1024) return alert("La imagen es muy pesada (máximo 3MB).");
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Por favor, ingresa tu nombre y teléfono.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Ingresa tu dirección de entrega.");
        if (!selectedPaymentMethod) return alert("Selecciona un método de pago.");
        
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = !m.includes('efectivo') && !m.includes('punto');
        
        if (isDigital && !paymentProof) {
            return alert("Para este método de pago es obligatorio subir la captura del comprobante.");
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
            
            const message = encodeURIComponent(`*NUEVO PEDIDO DESDE LA WEB*\n\n*Cliente:* ${customerName}\n*Total:* $${finalTotal.toFixed(2)}\n*Pago:* ${selectedPaymentMethod}\n${paymentProof ? '✅ Capture adjunto en el sistema' : ''}\n\n_Entra al panel de administración para ver el detalle._`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            
            clearCart();
            setView('confirmation');
        } catch(e) { 
            alert("Error al procesar el pedido. Intenta de nuevo."); 
        } finally { 
            setIsPlacingOrder(false); 
        }
    };

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#0f1115]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-emerald-500 font-black text-xs uppercase tracking-widest animate-pulse">Cargando Menú...</span>
            </div>
        </div>
    );

    if (view === 'menu') return (
        <div className="min-h-screen bg-[#0f1115] pb-28">
            <header className="bg-[#1a1c23] p-4 sticky top-0 z-40 border-b border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Bienvenido a</span>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter">{settings?.branch.alias || 'ALTOQUE FOOD'}</h1>
                    </div>
                    <div className="bg-gray-800 p-2.5 rounded-2xl text-gray-400"><IconSearch className="h-5 w-5"/></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'}`}>Todo</button>
                    {allCategories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'}`}>{cat.name}</button>
                    ))}
                </div>
            </header>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-[#1a1c23] rounded-[2rem] p-3 flex gap-4 cursor-pointer border border-gray-800 hover:border-emerald-500/50 transition-all active:scale-95 group">
                        <div className="relative overflow-hidden rounded-2xl">
                            <img src={product.imageUrl} className="w-24 h-24 object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <h3 className="font-bold text-white text-sm line-clamp-1">{product.name}</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                            </div>
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
                    <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase text-[11px] tracking-[0.2em] border border-emerald-400/20">
                        <span className="flex items-center gap-2"><div className="w-5 h-5 bg-white text-emerald-700 rounded-full flex items-center justify-center text-[10px]">{itemCount}</div> Mi Pedido</span>
                        <span>Ver Total: ${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-[#0f1115] flex flex-col">
            <header className="p-4 bg-[#1a1c23] flex items-center gap-4 border-b border-gray-800">
                <button onClick={() => setView('menu')} className="p-2.5 bg-gray-800 rounded-2xl text-white"><IconArrowLeft/></button>
                <h1 className="font-black text-white uppercase tracking-widest text-sm">Tu Pedido</h1>
            </header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-[#1a1c23] p-4 rounded-[2rem] flex gap-4 border border-gray-800 shadow-xl">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
                        <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <p className="text-emerald-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-5 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-white active:bg-emerald-600 transition-colors"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black text-white text-lg">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center bg-emerald-600/20 text-emerald-400 rounded-xl active:bg-emerald-600 active:text-white transition-colors"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="self-start mt-2 p-2 text-gray-600 hover:text-red-500"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-[#1a1c23] border-t border-gray-800 rounded-t-[3rem] shadow-2xl">
                <button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase tracking-[0.2em] text-[11px] border border-emerald-400/20">Continuar al Pago</button>
            </div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalFinal = cartTotal + shippingCost;
        
        // DETECCIÓN DE PAGO DIGITAL: SI NO ES EFECTIVO NI PUNTO, ES DIGITAL
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = !!m && !m.includes('efectivo') && !m.includes('punto');

        return (
            <div className="min-h-screen bg-[#0f1115] text-gray-200 selection:bg-emerald-500/30">
                {/* HEADER NEGRO PARA DIFERENCIAR VERSIÓN */}
                <div className="p-5 bg-black flex items-center gap-4 border-b border-emerald-500/20 sticky top-0 z-[100]">
                    <button onClick={() => setView('cart')} className="p-3 bg-gray-900 rounded-2xl text-white shadow-xl border border-gray-800"><IconArrowLeft/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black uppercase tracking-[0.2em] text-white text-xs">Finalizar Pedido</h1>
                        <span className="text-[8px] font-bold text-emerald-500 tracking-[0.3em] uppercase">{APP_DEPLOY_VERSION}</span>
                    </div>
                </div>
                
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    {/* 1. MÉTODO DE ENTREGA */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-emerald-500 mb-5 text-center">¿Cómo recibes tu comida?</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.Delivery ? 'bg-emerald-600/10 border-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.6)]' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-600'}`}>A Domicilio</span>
                                <span className="text-[9px] font-bold text-emerald-500/80 flex items-center gap-1">
                                    <IconClock className="h-3 w-3" /> {settings?.shipping.deliveryTime.min || '25'}-{settings?.shipping.deliveryTime.max || '45'} min
                                </span>
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-5 rounded-[1.8rem] border-2 transition-all duration-500 gap-2 ${orderType === OrderType.TakeAway ? 'bg-emerald-600/10 border-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.6)]' : 'bg-[#0f1115] border-gray-800 opacity-50'}`}>
                                <IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-600'}`}>Para llevar</span>
                                <span className="text-[9px] font-bold text-emerald-500/80 flex items-center gap-1">
                                    <IconClock className="h-3 w-3" /> {settings?.shipping.pickupTime.min || '15'} min
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 2. DATOS PERSONALES */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-emerald-500 mb-2">Tus Datos</h3>
                        <div className="space-y-3">
                            <div className="relative group">
                                <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm group-hover:border-gray-700" />
                            </div>
                            <div className="relative group">
                                <input type="tel" placeholder="WhatsApp (Ej. 0412 1234567)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono text-sm group-hover:border-gray-700" />
                            </div>
                            {orderType === OrderType.Delivery && (
                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                    <textarea placeholder="Dirección detallada: Calle, Edificio, Casa, Sector..." value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm resize-none group-hover:border-gray-700" rows={3} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. MÉTODOS DE PAGO */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-emerald-500 mb-5">Elige cómo pagar</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-[#0f1115] border-gray-800 text-gray-600 hover:border-gray-700'}`}>{pm}</button>
                            ))}
                        </div>

                        {/* BLOQUE DIGITAL REFORZADO - SE MUESTRA SIEMPRE QUE NO SEA EFECTIVO */}
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-emerald-500/20 shadow-inner">
                                    <div className="flex items-center gap-3 text-emerald-400 font-black text-[9px] uppercase tracking-[0.4em] mb-5">
                                        <IconInfo className="h-4 w-4"/> Datos para {selectedPaymentMethod}
                                    </div>
                                    
                                    <div className="space-y-4 text-sm">
                                        {(m.includes('movil') || m.includes('móvil')) ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center py-2 border-b border-gray-800/50"><span className="text-gray-500 text-xs uppercase font-bold">Banco:</span> <span className="font-black text-white">{settings?.payment.pagoMovil?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-800/50"><span className="text-gray-500 text-xs uppercase font-bold">Teléfono:</span> <span className="font-mono font-black text-emerald-400 text-lg tracking-tighter">{settings?.payment.pagoMovil?.phone || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between items-center py-2"><span className="text-gray-500 text-xs uppercase font-bold">Cédula:</span> <span className="font-mono font-black text-white">{settings?.payment.pagoMovil?.idNumber || 'Consultar WhatsApp'}</span></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center py-2 border-b border-gray-800/50"><span className="text-gray-500 text-xs uppercase font-bold">Banco:</span> <span className="font-black text-white">{settings?.payment.transfer?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 py-2 border-b border-gray-800/50"><span className="text-gray-500 text-[10px] uppercase font-bold">N° Cuenta:</span> <span className="font-mono font-black text-emerald-400 text-xs break-all leading-relaxed bg-black/40 p-2 rounded-lg">{settings?.payment.transfer?.accountNumber || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between items-center py-2"><span className="text-gray-500 text-xs uppercase font-bold">Titular:</span> <span className="font-black text-white">{settings?.payment.transfer?.accountHolder || 'Consultar WhatsApp'}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-1 mb-2">
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Adjuntar Comprobante</p>
                                        <p className="text-[8px] text-gray-500 uppercase font-bold">Obligatorio para pagos digitales</p>
                                    </div>
                                    
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-500/30 rounded-[2.5rem] bg-[#0f1115] cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group shadow-2xl">
                                            <div className="bg-emerald-500/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform"><IconUpload className="h-8 w-8 text-emerald-500"/></div>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Presiona para subir imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-emerald-500 group">
                                            <img src={paymentProof} className="w-full h-72 object-cover opacity-60" alt="Comprobante" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-6 left-0 right-0 text-white text-[10px] font-black text-center uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> Capture cargado correctamente
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. NOTAS */}
                    <div className="bg-[#1a1c23] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-emerald-500">¿Alguna nota extra?</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none text-sm group-hover:border-gray-700 placeholder:text-gray-700" placeholder="Ej. El timbre no suena fuerte, llamar al llegar..." />
                    </div>
                    
                    {/* DEBUG INFO INVISIBLE PERO PRESENTE */}
                    <div className="py-10 text-center">
                         <span className="text-[8px] text-gray-800 font-black uppercase tracking-[0.5em] opacity-20">Altoque Food Systems v2.0</span>
                    </div>
                </div>

                {/* FOOTER GLOBAL FLOTANTE */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] rounded-t-[3rem] space-y-4 z-[150] max-w-2xl mx-auto">
                    <div className="flex justify-between items-end px-4 mb-2">
                        <div className="flex flex-col">
                            <span className="text-gray-500 font-black text-[9px] uppercase tracking-widest">Total a pagar</span>
                            <span className="text-emerald-400 font-black text-4xl tracking-tighter shadow-emerald-500/20">${totalFinal.toFixed(2)}</span>
                        </div>
                        {orderType === OrderType.Delivery && shippingCost > 0 && (
                            <div className="text-right">
                                <span className="text-gray-600 font-bold text-[8px] uppercase">Envío: ${shippingCost.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-[0.2em] text-[11px] relative overflow-hidden ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 cursor-not-allowed grayscale' : 'bg-emerald-600 text-white shadow-emerald-500/40 hover:brightness-110 active:scale-95'}`}
                    >
                        {isPlacingOrder ? (
                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <IconWhatsapp className="h-6 w-6"/> 
                                {isDigital && !paymentProof ? 'Sube tu comprobante' : 'Realizar Pedido'}
                            </>
                        )}
                        <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/10 skew-x-[-20deg] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                    </button>
                    {isDigital && !paymentProof && <p className="text-[9px] text-center text-red-500 font-black uppercase animate-pulse tracking-widest">Sube la captura para habilitar el botón</p>}
                </div>
                
                <style>{`
                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 200%; }
                    }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center">
            <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(255,255,255,0.3)] animate-bounce"><IconCheck className="h-16 w-16 text-white" /></div>
            <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter italic">¡ÉXITO TOTAL!</h1>
            <p className="mb-12 text-emerald-50 font-bold max-w-xs leading-tight text-lg">Tu pedido ya está en la cocina. En segundos te llevamos a WhatsApp para confirmar.</p>
            <button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-gray-900 transition-all uppercase text-xs tracking-[0.3em]">Volver al Menú</button>
        </div>
    );
    return null;
}
