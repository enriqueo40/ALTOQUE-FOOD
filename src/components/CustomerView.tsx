
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer, Personalization, PersonalizationOption, OrderStatus, Order, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink, IconMinus, IconCheck, IconStore, IconDelivery, IconArrowLeft, IconSearch, IconUpload, IconInfo, IconReceipt, IconMap } from '../constants';
import { getProducts, getCategories, getAppSettings, getPromotions, getPersonalizations, saveOrder, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Lógica de Apertura Refinada ---
const checkIfOpen = (schedules: Schedule[]) => {
    if (!schedules || schedules.length === 0) return true;
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = days[now.getDay()];
    
    const schedule = schedules.find(s => s.id === 'general') || schedules[0];
    const today = schedule.days.find(d => d.day === currentDayName);

    if (!today || !today.isOpen) return false;
    if (!today.shifts || today.shifts.length === 0) return true;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return today.shifts.some(shift => {
        const [hStart, mStart] = shift.start.split(':').map(Number);
        const [hEnd, mEnd] = shift.end.split(':').map(Number);
        const start = hStart * 60 + mStart;
        const end = hEnd * 60 + mEnd;
        
        if (end < start) {
            return currentTime >= start || currentTime <= end;
        }
        return currentTime >= start && currentTime <= end;
    });
};

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const promo = promotions.find(p => p.appliesTo === PromotionAppliesTo.AllProducts || p.productIds.includes(product.id));
    if (!promo) return { price: product.price, promotion: null };
    let discount = promo.discountType === DiscountType.Percentage ? product.price * (promo.discountValue / 100) : promo.discountValue;
    return { price: Math.max(0, product.price - discount), promotion: promo };
};

// --- Sub-componentes Visuales ---

const StatusBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors duration-500 ${isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
        {isOpen ? 'Abierto ahora' : 'Cerrado'}
    </div>
);

const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-6 flex items-center relative border-b border-gray-50 bg-gray-50/30">
                    <button onClick={onClose} className="p-2 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <IconX className="h-5 w-5" />
                    </button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                </div>
                <div className="p-8">
                    {children}
                    <button 
                        onClick={onClose} 
                        className="w-full mt-8 py-4.5 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [activeModal, setActiveModal] = useState<'hours' | 'location' | 'none'>('none');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);

    // Checkout form states
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState({ calle: '', numero: '', colonia: '', referencias: '' });
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | ''>('');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const { cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, itemCount, clearCart } = useCart();

    const loadData = useCallback(async () => {
        try {
            const [s, prm, prod, cat] = await Promise.all([
                getAppSettings(), getPromotions(), getProducts(), getCategories()
            ]);
            setSettings(s);
            setPromotions(prm);
            setProducts(prod);
            setCategories(cat);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        subscribeToMenuUpdates(loadData);
        return () => unsubscribeFromChannel();
    }, [loadData]);

    const filteredProducts = useMemo(() => {
        const available = products.filter(p => p.available);
        return selectedCategory === 'all' ? available : available.filter(p => p.categoryId === selectedCategory);
    }, [products, selectedCategory]);

    const isOpenNow = useMemo(() => settings ? checkIfOpen(settings.schedules) : true, [settings]);

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone || !selectedPayment) {
            alert("Por favor completa los datos obligatorios.");
            return;
        }
        
        setIsPlacingOrder(true);
        try {
            const finalTotal = cartTotal + (orderType === OrderType.Delivery ? (settings.shipping.fixedCost || 0) : 0);
            
            const newOrder: Omit<Order, 'id' | 'createdAt'> = {
                customer: {
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress
                },
                items: cartItems,
                total: finalTotal,
                status: OrderStatus.Pending,
                paymentStatus: 'pending',
                paymentProof: paymentProof || undefined,
                branchId: 'main-branch',
                orderType: orderType,
            };

            await saveOrder(newOrder);
            
            // Build WhatsApp Message
            const currency = settings.company.currency.code;
            const messageParts = [
                `*NUEVO PEDIDO - ${settings.company.name}*`,
                `--------------------------`,
                `*Cliente:* ${customerName}`,
                `*Teléfono:* ${customerPhone}`,
                `*Tipo:* ${orderType}`,
                orderType === OrderType.Delivery ? `*Dirección:* ${customerAddress.calle} #${customerAddress.numero}, ${customerAddress.colonia}` : '',
                `--------------------------`,
                `*PRODUCTOS:*`,
                ...cartItems.map(i => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(0)})`),
                `--------------------------`,
                `*Subtotal:* ${currency} ${cartTotal.toFixed(0)}`,
                orderType === OrderType.Delivery ? `*Envío:* ${currency} ${settings.shipping.fixedCost || 0}` : '',
                `*TOTAL:* ${currency} ${finalTotal.toFixed(0)}`,
                `*Método de pago:* ${selectedPayment}`,
                paymentProof ? `✅ _Comprobante adjuntado_` : `⏳ _Pendiente enviar capture_`
            ].filter(Boolean);

            const whatsappUrl = `https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(messageParts.join('\n'))}`;
            window.open(whatsappUrl, '_blank');
            
            clearCart();
            setView('confirmation');
        } catch (e) {
            console.error(e);
            alert("Error al procesar el pedido.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-[#5EC278] border-t-transparent rounded-full animate-spin"></div></div>;

    // --- Views ---

    if (view === 'cart') {
        return (
            <div className="min-h-screen bg-[#FDFDFD] pb-32">
                <header className="p-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-50">
                    <button onClick={() => setView('menu')} className="p-2 bg-gray-50 rounded-full text-gray-500"><IconArrowLeft/></button>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Tu Pedido</h2>
                </header>
                <div className="p-6 space-y-4">
                    {cartItems.map(item => (
                        <div key={item.cartItemId} className="bg-white rounded-[2rem] p-4 flex gap-4 border border-gray-100 shadow-sm items-center">
                            <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{item.name}</h4>
                                <p className="text-[#5EC278] font-black">${item.price.toFixed(0)}</p>
                                <div className="flex items-center gap-4 mt-2">
                                    <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="p-1 text-gray-300 hover:text-gray-500"><IconMinus className="h-4 w-4"/></button>
                                    <span className="font-black text-gray-800">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 text-[#5EC278]"><IconPlus className="h-4 w-4"/></button>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 text-gray-300 hover:text-red-400"><IconX className="h-5 w-5"/></button>
                        </div>
                    ))}
                    {cartItems.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><IconReceipt className="h-10 w-10 text-gray-300"/></div>
                            <p className="text-gray-400 font-bold">Tu carrito está vacío</p>
                        </div>
                    )}
                </div>
                {cartItems.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <button onClick={() => setView('checkout')} className="w-full bg-gray-900 text-white py-5 rounded-[2.25rem] font-black text-lg shadow-2xl flex justify-between px-10 active:scale-[0.98] transition-all">
                            <span>Continuar</span>
                            <span>${cartTotal.toFixed(0)}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'checkout') {
        const paymentMethods = orderType === OrderType.Delivery ? settings?.payment.deliveryMethods : settings?.payment.pickupMethods;
        const needsProof = selectedPayment === 'Pago Móvil' || selectedPayment === 'Transferencia' || selectedPayment === 'Zelle';

        return (
            <div className="min-h-screen bg-[#0F172A] text-white pb-40 font-sans">
                <header className="p-6 flex items-center gap-4 border-b border-gray-800 sticky top-0 bg-[#0F172A]/80 backdrop-blur-md z-50">
                    <button onClick={() => setView('cart')} className="p-2 bg-gray-800/50 rounded-full text-gray-400"><IconArrowLeft/></button>
                    <h2 className="text-xl font-black tracking-tight">Cerrar Pedido</h2>
                </header>
                
                <div className="p-6 space-y-10 max-w-lg mx-auto">
                    {/* Datos del Cliente */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Tus Datos</h3>
                        <div className="space-y-3">
                            <input 
                                type="text" placeholder="Nombre completo" 
                                value={customerName} onChange={e => setCustomerName(e.target.value)}
                                className="w-full bg-[#1E293B] border border-gray-700/50 rounded-2xl p-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#5EC278]/50 transition-all"
                            />
                            <input 
                                type="tel" placeholder="WhatsApp / Teléfono" 
                                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full bg-[#1E293B] border border-gray-700/50 rounded-2xl p-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#5EC278]/50 transition-all"
                            />
                        </div>
                    </section>

                    {/* Dirección (si es Delivery) */}
                    {orderType === OrderType.Delivery && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Ubicación de entrega</h3>
                            <div className="grid grid-cols-4 gap-3">
                                <input 
                                    type="text" placeholder="Calle / Av" value={customerAddress.calle}
                                    onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})}
                                    className="col-span-3 bg-[#1E293B] border border-gray-700/50 rounded-2xl p-4 text-white placeholder-gray-500 outline-none"
                                />
                                <input 
                                    type="text" placeholder="N°" value={customerAddress.numero}
                                    onChange={e => setCustomerAddress({...customerAddress, numero: e.target.value})}
                                    className="col-span-1 bg-[#1E293B] border border-gray-700/50 rounded-2xl p-4 text-white placeholder-gray-500 outline-none"
                                />
                                <input 
                                    type="text" placeholder="Colonia o Sector" value={customerAddress.colonia}
                                    onChange={e => setCustomerAddress({...customerAddress, colonia: e.target.value})}
                                    className="col-span-4 bg-[#1E293B] border border-gray-700/50 rounded-2xl p-4 text-white placeholder-gray-500 outline-none"
                                />
                            </div>
                        </section>
                    )}

                    {/* Forma de Pago - UI Mejorada según referencia */}
                    <section className="space-y-5">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Forma de pago</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {paymentMethods?.map(method => (
                                <button
                                    key={method}
                                    onClick={() => { setSelectedPayment(method); setPaymentProof(null); }}
                                    className={`p-4.5 rounded-2xl font-black text-sm transition-all border flex items-center justify-center ${selectedPayment === method ? 'bg-[#00945E] border-[#00945E] text-white shadow-xl shadow-emerald-500/10' : 'bg-[#1E293B] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {/* Contenedor de Datos Bancarios (Animado) */}
                        {selectedPayment && (
                            <div className="animate-in slide-in-from-top-4 duration-500 pt-2">
                                {selectedPayment === 'Pago Móvil' && settings?.payment.pagoMovil && (
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-inner">
                                        <div className="flex items-center gap-3 text-[#5EC278] font-black text-[11px] uppercase tracking-widest border-b border-white/5 pb-4">
                                            <IconInfo className="h-4 w-4"/> Datos para Pago Móvil
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Banco:</span> <span className="font-bold text-gray-100">{settings.payment.pagoMovil.bank}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Teléfono:</span> <span className="font-mono font-bold text-[#5EC278] text-base">{settings.payment.pagoMovil.phone}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Cédula / RIF:</span> <span className="font-bold text-gray-100">{settings.payment.pagoMovil.idNumber}</span></div>
                                        </div>
                                    </div>
                                )}

                                {selectedPayment === 'Transferencia' && settings?.payment.transfer && (
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-inner">
                                        <div className="flex items-center gap-3 text-[#5EC278] font-black text-[11px] uppercase tracking-widest border-b border-white/5 pb-4">
                                            <IconInfo className="h-4 w-4"/> Datos para Transferencia
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Banco:</span> <span className="font-bold text-gray-100">{settings.payment.transfer.bank}</span></div>
                                            <div className="flex flex-col gap-1.5 mt-2"><span className="text-gray-400 text-xs uppercase tracking-wider">Número de Cuenta:</span> <span className="font-mono text-xs bg-black/40 p-3 rounded-xl border border-white/5 break-all select-all">{settings.payment.transfer.accountNumber}</span></div>
                                            <div className="flex justify-between items-center pt-2"><span className="text-gray-400 text-sm">Titular:</span> <span className="font-bold text-gray-100">{settings.payment.transfer.accountHolder}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Rif:</span> <span className="font-bold text-gray-100">{settings.payment.transfer.idNumber}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Subir Capture */}
                                {needsProof && (
                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Adjunta el Capture</h3>
                                            {paymentProof && <button onClick={() => setPaymentProof(null)} className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">Eliminar</button>}
                                        </div>
                                        
                                        {!paymentProof ? (
                                            <label className="flex flex-col items-center justify-center w-full h-44 bg-[#1E293B] border-2 border-dashed border-gray-700 hover:border-[#5EC278] rounded-[2.5rem] cursor-pointer transition-all group overflow-hidden relative">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                                    <IconUpload className="h-10 w-10 text-gray-500 group-hover:text-[#5EC278] mb-3 transition-colors"/>
                                                    <p className="text-sm font-bold text-gray-400 group-hover:text-gray-200">Presiona para subir la captura</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">JPG, PNG o JPEG</p>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                            </label>
                                        ) : (
                                            <div className="relative group animate-in zoom-in-95 duration-300">
                                                <div className="aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden border border-[#5EC278]/30 shadow-2xl shadow-emerald-500/5">
                                                    <img src={paymentProof} className="w-full h-full object-cover" alt="Capture pago" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-5">
                                                        <span className="flex items-center gap-2 text-[#5EC278] font-black text-xs uppercase tracking-widest"><IconCheck className="h-4 w-4"/> Comprobante listo</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0F172A] border-t border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] z-50">
                    <button 
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder || !selectedPayment}
                        className="w-full bg-[#00945E] hover:bg-[#007A4D] disabled:opacity-50 disabled:grayscale text-white py-5 rounded-[2.25rem] font-black text-lg shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                    >
                        {isPlacingOrder ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>Confirmar Orden <IconCheck className="h-6 w-6"/></>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans selection:bg-green-100 overflow-x-hidden">
                <div className="relative">
                    <div className="h-[22rem] w-full overflow-hidden rounded-b-[3.5rem] shadow-md relative">
                        <img 
                            src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                            className="w-full h-full object-cover brightness-90" 
                            alt="Portada"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30"></div>
                    </div>
                    
                    <div className="absolute top-6 right-6 flex gap-2.5 z-20">
                        <button onClick={() => setActiveModal('hours')} className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 active:scale-95 transition-all">
                            <IconClock className="h-5 w-5"/>
                        </button>
                        <button onClick={() => setActiveModal('location')} className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 active:scale-95 transition-all">
                            <IconLocationMarker className="h-5 w-5"/>
                        </button>
                        <button className="p-3 bg-white shadow-xl rounded-full text-gray-800 hover:scale-110 active:scale-95 transition-all">
                            <IconShare className="h-5 w-5"/>
                        </button>
                    </div>

                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10">
                        <div className="w-28 h-28 rounded-full border-[6px] border-white bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                            {settings?.branch.logoUrl ? (
                                <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                            ) : (
                                <span className="text-5xl font-black text-[#5EC278]">{settings?.company.name.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center px-6">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">{settings?.company.name || 'Menú Digital'}</h1>
                    <div className="inline-flex bg-gray-100 p-1 rounded-[1.75rem] mt-5 border border-gray-200/40">
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`px-7 py-2.5 rounded-full text-[13px] font-black transition-all ${orderType === OrderType.Delivery ? 'bg-white text-[#5EC278] shadow-sm' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`px-7 py-2.5 rounded-full text-[13px] font-black transition-all ${orderType === OrderType.TakeAway ? 'bg-white text-[#5EC278] shadow-sm' : 'text-gray-400'}`}>Para recoger</button>
                    </div>
                    <div className="flex justify-center items-center gap-12 mt-8">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Entrega</p>
                            <p className="text-[15px] font-black text-gray-800">{settings?.shipping.deliveryTime.min}-{settings?.shipping.deliveryTime.max}m</p>
                        </div>
                        <div className="w-[1.5px] h-10 bg-gray-100"></div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Envío</p>
                            <p className="text-[15px] font-black text-gray-800">${settings?.shipping.fixedCost || '0'}</p>
                        </div>
                    </div>
                </div>

                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 mt-10">
                    <div className="flex overflow-x-auto px-6 py-4 gap-3 no-scrollbar">
                        <button onClick={() => setSelectedCategory('all')} className={`px-7 py-2.5 rounded-2xl text-[14px] font-black transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#5EC278] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}>Todo</button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-7 py-2.5 rounded-2xl text-[14px] font-black transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-[#5EC278] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'}`}>{cat.name}</button>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-8">
                    <div className="grid grid-cols-1 gap-6">
                        {filteredProducts.map(product => {
                            const { price, promotion } = getDiscountedPrice(product, promotions);
                            return (
                                <div key={product.id} className="bg-white rounded-[2.25rem] border border-gray-50 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-5 flex items-center gap-5 hover:shadow-lg transition-all active:scale-[0.98] relative">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {promotion && <span className="bg-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded-md text-gray-900 uppercase">Oferta</span>}
                                            <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{product.name}</h3>
                                        </div>
                                        <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed mb-4">{product.description}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-900 font-black text-xl">${price.toFixed(0)}</span>
                                            {promotion && <span className="text-gray-300 text-xs line-through">${product.price.toFixed(0)}</span>}
                                        </div>
                                    </div>
                                    <div className="w-32 h-32 rounded-[2rem] overflow-hidden relative shrink-0 bg-gray-50 border border-gray-100 shadow-sm">
                                        <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                        <button onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }} className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-2xl text-[#5EC278] hover:scale-110 active:scale-90 transition-all border border-gray-50"><IconPlus className="h-6 w-6"/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {itemCount > 0 && (
                    <div className="fixed bottom-8 left-6 right-6 z-50 max-w-lg mx-auto">
                        <button onClick={() => setView('cart')} className="w-full bg-[#5EC278] hover:bg-green-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-green-200/50 flex items-center justify-between px-8 transition-all active:scale-[0.97] animate-in slide-in-from-bottom-8">
                            <div className="flex items-center gap-3">
                                 <div className="bg-white/20 px-3 py-1 rounded-xl text-xs font-black">{itemCount}</div>
                                 <span className="uppercase tracking-widest text-sm">Ver pedido</span>
                            </div>
                            <span className="font-black text-2xl">${cartTotal.toFixed(0)}</span>
                        </button>
                    </div>
                )}

                <ReferenceModal title="Horarios" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                        {settings?.schedules[0].days.map(d => (
                            <div key={d.day} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0">
                                <span className="font-black text-gray-800 text-sm uppercase tracking-wider">{d.day}</span>
                                <span className={`text-[12px] ${d.isOpen ? 'text-gray-400 font-bold' : 'text-rose-400 font-black uppercase'}`}>
                                    {d.isOpen ? (d.shifts.length > 0 ? d.shifts.map(s => `${s.start}-${s.end}`).join(', ') : 'Abierto 24h') : 'Cerrado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </ReferenceModal>

                <ReferenceModal title="Nuestra Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-50 text-[#5EC278] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><IconMap className="h-8 w-8"/></div>
                        <p className="text-gray-800 text-sm font-black tracking-tight leading-relaxed mb-10 px-4">{settings?.branch.fullAddress || 'Dirección no configurada.'}</p>
                        <a href={settings?.branch.googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full bg-[#5EC278] text-white py-5 rounded-2xl font-black shadow-2xl shadow-green-100 hover:bg-green-600 transition-all mb-4 text-xs uppercase tracking-widest active:scale-95">Abrir Google Maps <IconExternalLink className="h-4 w-4"/></a>
                    </div>
                </ReferenceModal>
                <Chatbot />
            </div>
        );
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                    <IconCheck className="h-12 w-12 text-emerald-600" />
                </div>
                <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">¡Pedido Enviado!</h1>
                <p className="text-emerald-100 mb-10 max-w-xs mx-auto font-bold leading-relaxed">Te hemos redirigido a WhatsApp para enviar el comprobante. El restaurante confirmará tu orden pronto.</p>
                <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-12 py-5 rounded-[2.5rem] font-black shadow-xl hover:bg-emerald-50 transition-all uppercase text-sm tracking-[0.2em]">Volver al Menú</button>
            </div>
        );
    }

    return null;
}
