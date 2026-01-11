
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload, IconClock } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// MARCADOR DE VERSIÓN INDESTRUCTIBLE
const SYSTEM_VERSION = "V4.0_BLUE_FORCE_DEPLOY";

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
        subscribeToMenuUpdates(fetchMenuData);
        // Fuerza limpieza de caché local al detectar nueva versión
        if (localStorage.getItem('app_v') !== SYSTEM_VERSION) {
            localStorage.setItem('app_v', SYSTEM_VERSION);
            console.log("Sistema actualizado a V4.0");
        }
        return () => unsubscribeFromChannel();
    }, []);

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 4 * 1024 * 1024) return alert("Imagen demasiado pesada.");
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Ingresa tu nombre y teléfono.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Ingresa tu dirección.");
        if (!selectedPaymentMethod) return alert("Selecciona cómo vas a pagar.");
        
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia');
        
        if (isDigital && !paymentProof) {
            return alert("Adjunta el capture del pago para continuar.");
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
            const message = encodeURIComponent(`*PEDIDO ALTOQUE FOOD*\n\n*Cliente:* ${customerName}\n*Total:* $${total.toFixed(2)}\n*Método:* ${selectedPaymentMethod}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { 
            alert("Error al enviar pedido."); 
        } finally { 
            setIsPlacingOrder(false); 
        }
    };

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#0a0b0d]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                    <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProducts.filter(p => p.available && (selectedCategory === 'all' || p.categoryId === selectedCategory)).map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-[#15171d] rounded-3xl p-3 flex gap-4 cursor-pointer border border-gray-800 transition-all active:scale-95 group">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-2xl" alt={product.name} />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-blue-400 text-lg tracking-tighter">${product.price.toFixed(2)}</span>
                                <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400 border border-blue-500/20"><IconPlus className="h-5 w-5"/></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-6 right-6 z-[70]">
                    <button onClick={() => setView('cart')} className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black flex justify-between shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase text-[11px] tracking-widest border border-blue-400/20">
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
                <button onClick={() => setView('menu')} className="p-2.5 bg-gray-800 rounded-2xl text-white"><IconArrowLeft/></button>
                <h1 className="font-black text-white uppercase text-sm tracking-widest">Tu Carrito</h1>
            </header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-[#15171d] p-4 rounded-[2rem] flex gap-4 border border-gray-800 shadow-xl">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt={item.name} />
                        <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <p className="text-blue-400 font-black mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-5 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center bg-gray-800 rounded-xl text-white"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black text-white text-lg">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="self-start mt-2 p-2 text-gray-600 hover:text-red-500"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-[#15171d] border-t border-gray-800 rounded-t-[3rem] shadow-2xl">
                <button onClick={() => setView('checkout')} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase tracking-widest text-[11px] border border-blue-400/20">Proceder al Pago</button>
            </div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const totalFinal = cartTotal + shippingCost;
        
        // IDENTIFICADOR DE PAGO DIGITAL
        const m = (selectedPaymentMethod || "").toLowerCase().trim();
        const isDigital = m.includes('pago') || m.includes('zelle') || m.includes('transferencia');

        return (
            <div className="min-h-screen bg-[#07080a] text-gray-200">
                {/* HEADER AZUL - PRUEBA DE DESPLIEGUE DEFINITIVA */}
                <div className="bg-blue-600 p-6 flex items-center gap-5 border-b-4 border-blue-800 sticky top-0 z-[100] text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)]">
                    <button onClick={() => setView('cart')} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/20"><IconArrowLeft className="h-6 w-6"/></button>
                    <div className="flex flex-col">
                        <h1 className="font-black uppercase tracking-tighter text-2xl leading-none">CHECKOUT AZUL</h1>
                        <span className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-[0.3em]">{SYSTEM_VERSION}</span>
                    </div>
                </div>
                
                <div className="p-4 pb-48 space-y-6 max-w-xl mx-auto overflow-x-hidden">
                    {/* TIPO DE ENTREGA */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-blue-400 mb-5">¿Cómo quieres tu pedido?</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-2 ${orderType === OrderType.Delivery ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)]' : 'bg-[#0a0b0d] border-gray-800 opacity-50'}`}>
                                <IconStore className={`h-8 w-8 ${orderType === OrderType.Delivery ? 'text-blue-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-600'}`}>A Domicilio</span>
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-2 ${orderType === OrderType.TakeAway ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)]' : 'bg-[#0a0b0d] border-gray-800 opacity-50'}`}>
                                <IconLocationMarker className={`h-8 w-8 ${orderType === OrderType.TakeAway ? 'text-blue-400' : 'text-gray-600'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-600'}`}>Para Llevar</span>
                            </button>
                        </div>
                    </div>

                    {/* DATOS PERSONALES */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-blue-400">Tus Datos</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm" />
                            <input type="tel" placeholder="WhatsApp (Ej. 0414 1234567)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all font-mono text-sm" />
                            {orderType === OrderType.Delivery && (
                                <textarea placeholder="Dirección exacta: Calle, Casa, Edificio..." value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm resize-none" rows={3} />
                            )}
                        </div>
                    </div>

                    {/* MÉTODOS DE PAGO */}
                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-blue-400 mb-5">Elige el método de pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'] || ['Efectivo', 'Pago Móvil']).map(pm => (
                                <button key={pm} onClick={() => { setSelectedPaymentMethod(pm); setPaymentProof(null); }} className={`p-4 rounded-2xl border-2 font-bold text-[10px] uppercase transition-all duration-300 ${selectedPaymentMethod === pm ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-[#0a0b0d] border-gray-800 text-gray-600 hover:border-gray-700'}`}>{pm}</button>
                            ))}
                        </div>

                        {/* DATOS DE PAGO DIGITAL FORZADOS */}
                        {isDigital && (
                            <div className="mt-8 pt-8 border-t border-gray-800 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="p-6 bg-blue-500/5 rounded-3xl border-2 border-blue-500/30 shadow-inner">
                                    <div className="flex items-center gap-3 text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] mb-4">
                                        <IconInfo className="h-4 w-4"/> Datos para {selectedPaymentMethod}
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        {m.includes('pago') ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Banco:</span> <span className="font-black text-white">{settings?.payment.pagoMovil?.bank || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Tel:</span> <span className="font-mono font-black text-blue-400 text-lg tracking-tighter">{settings?.payment.pagoMovil?.phone || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase text-[9px]">ID:</span> <span className="font-mono font-black text-white">{settings?.payment.pagoMovil?.idNumber || 'Ver en WhatsApp'}</span></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Banco:</span> <span className="font-black text-white">{settings?.payment.transfer?.bank || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 border-b border-gray-800/40 pb-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Cuenta:</span> <span className="font-mono font-black text-blue-400 text-xs break-all bg-black/40 p-2 rounded-lg">{settings?.payment.transfer?.accountNumber || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase text-[9px]">Titular:</span> <span className="font-black text-white">{settings?.payment.transfer?.accountHolder || 'Ver en WhatsApp'}</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center italic">Adjunta tu capture (Obligatorio)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-500/30 rounded-[2.5rem] bg-[#0a0b0d] cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group shadow-2xl">
                                            <div className="bg-blue-500/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform"><IconUpload className="h-8 w-8 text-blue-500"/></div>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Toca para cargar imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-blue-500">
                                            <img src={paymentProof} className="w-full h-72 object-cover opacity-60" alt="Recibo" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-all"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-6 left-0 right-0 text-white text-[10px] font-black text-center uppercase tracking-widest flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div> Capture Listo
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#15171d] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-blue-400">¿Alguna nota extra?</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} className="w-full p-4 bg-[#0a0b0d] border border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all resize-none text-sm placeholder:text-gray-700" placeholder="Ej. Tocar timbre fuerte, dejar en recepción..." />
                    </div>
                </div>

                {/* FOOTER GLOBAL AZUL */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#15171d]/95 backdrop-blur-xl border-t border-gray-800 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] rounded-t-[3rem] space-y-4 z-[150] max-w-xl mx-auto">
                    <div className="flex justify-between items-center px-5 mb-2">
                        <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Total a Pagar</span>
                        <span className="text-blue-400 font-black text-4xl tracking-tighter shadow-blue-500/20">${totalFinal.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all duration-500 uppercase tracking-widest text-[11px] relative overflow-hidden ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-500/40 hover:brightness-110 active:scale-95'}`}
                    >
                        {isPlacingOrder ? (
                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <><IconWhatsapp className="h-6 w-6"/> {isDigital && !paymentProof ? 'Sube el comprobante' : 'Realizar Pedido'}</>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                    </button>
                    {isDigital && !paymentProof && <p className="text-[9px] text-center text-red-500 font-black uppercase animate-pulse tracking-[0.2em]">Sube el capture para habilitar el botón</p>}
                </div>
                <style>{`
                    @keyframes shimmer { 0% { transform: translateX(-200%); } 100% { transform: translateX(200%); } }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-8 text-white text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce border border-white/30"><IconCheck className="h-12 w-12 text-white" /></div>
            <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter italic">¡PEDIDO RECIBIDO!</h1>
            <p className="mb-12 text-blue-50 font-bold max-w-xs leading-tight text-lg">Ya estamos trabajando en tu orden. Serás redirigido a WhatsApp para confirmar.</p>
            <button onClick={() => setView('menu')} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-gray-900 transition-all uppercase text-xs tracking-widest border border-gray-800">Volver al Inicio</button>
        </div>
    );
    return null;
}
