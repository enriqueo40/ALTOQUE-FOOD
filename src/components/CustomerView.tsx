
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

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
            if (file.size > 3 * 1024 * 1024) return alert("Imagen demasiado grande (Máximo 3MB)");
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Ingresa tu nombre y teléfono.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Ingresa la dirección.");
        if (!selectedPaymentMethod) return alert("Selecciona un método de pago.");
        
        // Verificación de Pago Digital
        const m = selectedPaymentMethod.toLowerCase();
        const isDigital = !m.includes('efectivo') && !m.includes('punto');
        
        if (isDigital && !paymentProof) {
            return alert("Para este método de pago, debes adjuntar el comprobante (capture).");
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
            
            const message = encodeURIComponent(`*NUEVO PEDIDO*\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}\nPago: ${selectedPaymentMethod}${paymentProof ? '\n✅ Capture enviado al sistema' : ''}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { 
            alert("Error al procesar el pedido. Verifica tu conexión."); 
        } finally { 
            setIsPlacingOrder(false); 
        }
    };

    // Lógica de detección de pago digital
    const isDigitalPayment = useMemo(() => {
        if (!selectedPaymentMethod) return false;
        const m = selectedPaymentMethod.toLowerCase();
        return !m.includes('efectivo') && !m.includes('punto');
    }, [selectedPaymentMethod]);

    if (isLoading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            <header className="bg-white dark:bg-[#1a1c23] p-4 sticky top-0 z-30 shadow-md border-b dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black dark:text-emerald-500 uppercase tracking-tighter">{settings?.branch.alias || 'ALTOQUE FOOD'}</h1>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full"><IconSearch className="h-5 w-5 text-gray-500"/></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-[#1a1c23] rounded-3xl p-3 flex gap-4 cursor-pointer border dark:border-gray-800 shadow-sm transition-transform active:scale-95">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover" />
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
            {itemCount > 0 && <button onClick={() => setView('cart')} className="fixed bottom-6 left-6 right-6 bg-emerald-600 text-white p-5 rounded-3xl font-black flex justify-between shadow-2xl z-40 active:scale-95 transition-all uppercase text-xs tracking-widest"><span>Pedido ({itemCount})</span><span>${cartTotal.toFixed(2)}</span></button>}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] flex flex-col">
            <header className="p-4 bg-white dark:bg-[#1a1c23] flex items-center gap-3 border-b dark:border-gray-800"><button onClick={() => setView('menu')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full dark:text-white"><IconArrowLeft/></button><h1 className="font-black dark:text-white uppercase tracking-tighter">Tu Pedido</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-white dark:bg-[#1a1c23] p-4 rounded-3xl flex gap-4 shadow-sm border dark:border-gray-800">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                        <div className="flex-1">
                            <h4 className="font-bold dark:text-white">{item.name}</h4>
                            <p className="text-emerald-600 dark:text-emerald-400 font-black">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl dark:text-white"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-white dark:bg-[#1a1c23] border-t dark:border-gray-800 shadow-2xl rounded-t-[2.5rem]"><button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm">Pagar Ahora</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        
        return (
            <div className="min-h-screen bg-[#0f1115] flex flex-col text-gray-200">
                <header className="p-4 bg-[#1a1c23] flex items-center gap-3 border-b border-gray-800 sticky top-0 z-30">
                    <button onClick={() => setView('cart')} className="p-2 bg-[#2a2e38] rounded-full text-white"><IconArrowLeft/></button>
                    <h1 className="font-black uppercase tracking-tighter">Finalizar Pago</h1>
                </header>
                
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* TUS DATOS */}
                    <div className="bg-[#1a1c23] p-5 rounded-[2rem] border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500">Tus Datos</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm" />
                            <input type="tel" placeholder="WhatsApp (Ej. 0414-0000000)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono text-sm" />
                        </div>
                    </div>

                    {/* FORMA DE PAGO */}
                    <div className="bg-[#1a1c23] p-5 rounded-[2rem] border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500">Forma de pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => { setSelectedPaymentMethod(m); setPaymentProof(null); }} 
                                    className={`p-4 rounded-xl border font-bold text-xs uppercase transition-all ${selectedPaymentMethod === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-[#0f1115] border-gray-800 text-gray-500'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {/* ESTE BLOQUE SE MOSTRARÁ SI EL MÉTODO ES DIGITAL */}
                        {isDigitalPayment && (
                            <div className="mt-6 pt-6 border-t border-gray-800 space-y-6">
                                <div className="p-5 bg-emerald-500/5 rounded-3xl border-2 border-emerald-500/20">
                                    <div className="flex items-center gap-2 text-emerald-400 font-black text-[9px] uppercase tracking-[0.3em] mb-4">
                                        <IconInfo className="h-4 w-4"/> Datos de Pago
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        {selectedPaymentMethod.toLowerCase().includes('movil') || selectedPaymentMethod.toLowerCase().includes('móvil') ? (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-emerald-100">{settings?.payment.pagoMovil?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Teléfono:</span> <span className="font-mono font-bold text-emerald-400">{settings?.payment.pagoMovil?.phone || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Cédula:</span> <span className="font-mono font-bold text-emerald-100">{settings?.payment.pagoMovil?.idNumber || 'Consultar WhatsApp'}</span></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800/40 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-emerald-100">{settings?.payment.transfer?.bank || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 border-b border-gray-800/40 pb-2"><span className="text-gray-500 text-[10px] uppercase font-bold">N° Cuenta:</span> <span className="font-mono font-bold text-emerald-400 text-xs break-all leading-relaxed">{settings?.payment.transfer?.accountNumber || 'Consultar WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span> <span className="font-bold text-emerald-100 text-right">{settings?.payment.transfer?.accountHolder || 'Consultar WhatsApp'}</span></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Adjunta tu capture de pago (Requerido)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-emerald-500/40 rounded-[2rem] bg-[#0f1115] cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group">
                                            <IconUpload className="h-10 w-10 text-emerald-500/40 group-hover:text-emerald-500 mb-2 transition-transform group-hover:-translate-y-1"/>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Toca para subir imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-2 border-emerald-500">
                                            <img src={paymentProof} className="w-full h-64 object-cover opacity-80" />
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-transform"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[9px] font-black text-center py-3 uppercase tracking-[0.2em]">Capture cargado con éxito</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1a1c23] p-5 rounded-[2rem] border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500">Nota Adicional</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={2} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none text-sm" placeholder="Ej. Tocar el timbre fuerte, sin servilletas..." />
                    </div>
                </div>

                <div className="p-6 bg-[#1a1c23] border-t border-gray-800 shadow-2xl rounded-t-[2.5rem] space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Total Orden</span>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigitalPayment && !paymentProof)}
                        className={`w-full py-5 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm ${isPlacingOrder || (isDigitalPayment && !paymentProof) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                    >
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> Enviar por WhatsApp</>}
                    </button>
                    {isDigitalPayment && !paymentProof && <p className="text-[8px] text-center text-red-500 font-black uppercase animate-pulse">Sube tu capture para habilitar el envío</p>}
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce"><IconCheck className="h-12 w-12 text-emerald-600" /></div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">¡LISTO!</h1>
            <p className="mb-10 text-emerald-100 font-bold max-w-xs leading-tight">Tu pedido está siendo procesado. Te hemos enviado a WhatsApp para confirmar los detalles finales.</p>
            <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black shadow-2xl hover:bg-emerald-50 transition-all uppercase text-xs tracking-widest">Volver al inicio</button>
        </div>
    );
    return null;
}
