
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// VERSIÓN UNIFICADA
const APP_VERSION = "V6.1_OMNI_PURPLE";

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
            console.error("Error Sync:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => {
        fetchMenuData();
        // Force refresh log
        console.log("ALTOQUE FOOD APP - VERSIÓN", APP_VERSION);
        subscribeToMenuUpdates(fetchMenuData);
        return () => unsubscribeFromChannel();
    }, []);

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validación suave de tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("La imagen es muy pesada. Intenta con una más pequeña o envíala por WhatsApp.");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setPaymentProof(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("⚠️ Faltan tus datos básicos (Nombre y Teléfono).");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("⚠️ Ingresa la dirección de entrega.");
        if (!selectedPaymentMethod) return alert("⚠️ Selecciona cómo vas a pagar.");
        
        // Lógica de detección de pago digital
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia') || m.includes('móvil') || m.includes('movil');
        
        if (isDigital && !paymentProof) {
            return alert("📸 POR FAVOR: Sube la foto del pago para continuar.");
        }

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
            
            const methodText = isDigital ? '✅ Pago Adjunto (Verificar Foto)' : selectedPaymentMethod;
            const message = encodeURIComponent(`*NUEVO PEDIDO ${APP_VERSION}*\n👤 ${customerName}\n💵 Total: $${total.toFixed(2)}\n💳 Método: ${methodText}\n📍 Tipo: ${orderType}`);
            
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { 
            alert("Error de conexión. Por favor toma una captura de tu pedido y envíala por WhatsApp."); 
            console.error(e);
        } finally { 
            setIsPlacingOrder(false); 
        }
    };

    if (isLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0a0b0d] text-purple-500 gap-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold tracking-widest text-xs animate-pulse">CARGANDO MENÚ {APP_VERSION}...</p>
        </div>
    );

    if (view === 'menu') return (
        <div className="min-h-screen bg-[#0a0b0d] pb-32">
            <header className="bg-[#15171d] p-4 sticky top-0 z-[60] border-b border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">{settings?.branch.alias || 'ALTOQUE'}</h1>
                    <div className="bg-gray-800 p-2 rounded-full text-gray-400"><IconSearch className="h-5 w-5"/></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${selectedCategory === 'all' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${selectedCategory === cat.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProducts.filter(p => p.available && (selectedCategory === 'all' || p.categoryId === selectedCategory)).map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-[#15171d] rounded-3xl p-3 flex gap-4 cursor-pointer border border-gray-800 transition-all active:scale-95 group hover:border-purple-500/30">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-2xl bg-gray-800" alt={product.name} />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-purple-400 text-lg tracking-tighter">${product.price.toFixed(2)}</span>
                                <div className="bg-purple-600/10 p-2 rounded-xl text-purple-400 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-colors"><IconPlus className="h-5 w-5"/></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-6 right-6 z-[70]">
                    <button onClick={() => setView('cart')} className="w-full bg-purple-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-[0_10px_30px_rgba(147,51,234,0.3)] active:scale-95 transition-all uppercase text-[11px] tracking-widest border border-purple-400/20">
                        <span>Ver Pedido ({itemCount})</span>
                        <span>Total: ${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-[#0a0b0d] flex flex-col">
            <header className="p-4 bg-[#15171d] flex items-center gap-4 border-b border-gray-800">
                <button onClick={() => setView('menu')} className="p-2.5 bg-gray-800 rounded-2xl text-white hover:bg-gray-700 transition-colors"><IconArrowLeft/></button>
                <h1 className="font-black text-white uppercase text-sm tracking-widest">Tu Carrito</h1>
            </header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-[#15171d] p-4 rounded-[2rem] flex gap-4 border border-gray-800 shadow-xl">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt={item.name} />
                        <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <p className="text-purple-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-5 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-white hover:bg-gray-700"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black text-white text-lg">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center bg-purple-600/20 text-purple-400 rounded-xl hover:bg-purple-600 hover:text-white transition-colors"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="self-start mt-2 p-2 text-gray-600 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-[#15171d] border-t border-gray-800 rounded-t-[3rem] shadow-2xl">
                <button onClick={() => setView('checkout')} className="w-full bg-purple-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase tracking-widest text-[11px] border border-purple-400/20 hover:brightness-110 transition-all">Pagar Ahora</button>
            </div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalFinal = cartTotal + shippingCost;
        
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia') || m.includes('móvil') || m.includes('movil');

        return (
            <div className="min-h-screen bg-[#07080a] text-gray-200">
                {/* Header Estilo V6.1 PURPLE OMNI */}
                <div className="bg-purple-700 p-6 flex items-center gap-5 border-b-4 border-purple-900 sticky top-0 z-[100] shadow-2xl">
                    <button onClick={() => setView('cart')} className="p-3 bg-black/20 rounded-2xl hover:bg-black/30 transition-all text-white backdrop-blur-sm"><IconArrowLeft className="h-6 w-6"/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black text-white uppercase tracking-tighter text-2xl leading-none">CHECKOUT V6.1</h1>
                        <span className="text-[10px] font-bold text-purple-200 mt-1 uppercase tracking-[0.3em]">{APP_VERSION}</span>
                    </div>
                </div>
                
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    {/* TIPO DE ENTREGA */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-purple-400 mb-5">1. Método de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-2 ${orderType === OrderType.Delivery ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]' : 'bg-[#0a0b0d] border-gray-800 opacity-60 grayscale'}`}>
                                <IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-purple-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-600'}`}>A Domicilio</span>
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-2 ${orderType === OrderType.TakeAway ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]' : 'bg-[#0a0b0d] border-gray-800 opacity-60 grayscale'}`}>
                                <IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-purple-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-600'}`}>Para Llevar</span>
                            </button>
                        </div>
                    </div>

                    {/* DATOS PERSONALES */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-purple-400">2. Tus Datos</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-purple-500 transition-all text-sm text-white placeholder-gray-600" />
                            <input type="tel" placeholder="WhatsApp (Ej. 0414...)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-purple-500 transition-all font-mono text-sm text-white placeholder-gray-600" />
                            {orderType === OrderType.Delivery && (
                                <textarea placeholder="Dirección exacta: Calle, Casa, Edificio..." value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-purple-500 transition-all text-sm resize-none text-white placeholder-gray-600" rows={3} />
                            )}
                        </div>
                    </div>

                    {/* MÉTODOS DE PAGO */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-purple-400 mb-5">3. Pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-purple-600 border-purple-500 text-white shadow-lg scale-105' : 'bg-[#0a0b0d] border-gray-800 text-gray-600 hover:border-gray-700'}`}>{pm}</button>
                            ))}
                        </div>

                        {/* SECCIÓN DESPLEGABLE DE PAGO DIGITAL */}
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="p-6 bg-purple-900/10 rounded-[2rem] border-2 border-purple-500/20 mb-6">
                                    <div className="flex items-center gap-2 mb-4 text-purple-400 font-bold uppercase text-xs tracking-widest">
                                        <IconInfo className="h-4 w-4" /> Datos para transferir
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500">Banco:</span>
                                            <span className="font-bold text-white text-right">{settings?.payment.pagoMovil?.bank || 'Consultar'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500">Teléfono:</span>
                                            <span className="font-mono font-bold text-purple-400 text-right tracking-wider text-lg">{settings?.payment.pagoMovil?.phone || 'Consultar'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Cédula/RIF:</span>
                                            <span className="font-mono font-bold text-white text-right">{settings?.payment.pagoMovil?.idNumber || 'Consultar'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest text-center">Adjuntar comprobante (Obligatorio)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-purple-500/40 rounded-[2rem] bg-[#0a0b0d] cursor-pointer hover:bg-purple-900/10 hover:border-purple-500 transition-all group">
                                            <div className="bg-purple-500/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform"><IconUpload className="h-6 w-6 text-purple-500"/></div>
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest group-hover:text-purple-400">Toca para subir foto</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2rem] overflow-hidden border-2 border-purple-500 shadow-2xl">
                                            <img src={paymentProof} className="w-full h-64 object-cover opacity-80" alt="Recibo" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                                <span className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                                                    <IconCheck className="h-3 w-3"/> Foto Cargada
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-purple-500 transition-all resize-none text-sm text-white placeholder-gray-600" placeholder="¿Alguna nota extra para la cocina?" />
                    </div>
                </div>

                {/* FOOTER GLOBAL - SIEMPRE VISIBLE */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#15171d]/95 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] rounded-t-[3rem] space-y-4 z-[150] max-w-xl mx-auto">
                    <div className="flex justify-between items-center px-5 mb-2">
                        <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Total a Pagar</span>
                        <span className="text-purple-400 font-black text-4xl tracking-tighter shadow-purple-500/20">${totalFinal.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-widest text-[11px] relative overflow-hidden ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed' : 'bg-purple-600 text-white shadow-purple-500/40 hover:brightness-110 active:scale-95'}`}
                    >
                        {isPlacingOrder ? (
                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <><IconWhatsapp className="h-6 w-6"/> {isDigital && !paymentProof ? 'Sube la foto del pago' : 'ENVIAR PEDIDO AHORA'}</>
                        )}
                    </button>
                    <p className="text-[8px] text-center text-gray-600 font-mono uppercase tracking-widest opacity-50">{APP_VERSION}</p>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-purple-600 flex flex-col items-center justify-center p-8 text-white text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce border border-white/30"><IconCheck className="h-12 w-12 text-white" /></div>
            <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter italic">¡PEDIDO ENVIADO!</h1>
            <p className="mb-12 text-purple-100 font-bold max-w-xs leading-tight text-lg">Tu orden ha sido registrada. Serás redirigido a WhatsApp para confirmar.</p>
            <button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-gray-900 transition-all uppercase text-xs tracking-widest border border-gray-800">Volver al Inicio</button>
        </div>
    );
    return null;
}
