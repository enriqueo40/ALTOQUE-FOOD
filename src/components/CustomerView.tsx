
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, AppSettings, OrderType, Promotion, DiscountType, PromotionAppliesTo, Schedule, DaySchedule, PaymentMethod, Customer, Personalization, PersonalizationOption, OrderStatus, Order, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconClock, IconShare, IconX, IconLocationMarker, IconExternalLink, IconMinus, IconCheck, IconStore, IconDelivery, IconArrowLeft, IconSearch, IconMap, IconInfo, IconSparkles, IconUpload, IconReceipt } from '../constants';
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

// --- Sub-componentes Visuales Premium ---

const StatusBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
        {isOpen ? 'Abierto ahora' : 'Cerrado temporalmente'}
    </div>
);

const ReferenceModal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-sm:w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
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
                        className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
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
            const newOrder: Omit<Order, 'id' | 'createdAt'> = {
                customer: {
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress
                },
                items: cartItems,
                total: cartTotal + (orderType === OrderType.Delivery ? (settings.shipping.fixedCost || 0) : 0),
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
                ...cartItems.map(i => `• ${i.quantity}x ${i.name}`),
                `--------------------------`,
                `*Total:* ${currency} ${newOrder.total.toFixed(2)}`,
                `*Pago:* ${selectedPayment}`,
                paymentProof ? `✅ _Comprobante adjuntado en sistema_` : `⏳ _Pendiente por enviar comprobante_`
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

    // --- Views Logic ---
    
    if (view === 'cart') {
        return (
            <div className="min-h-screen bg-[#FDFDFD] pb-32">
                <header className="p-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-50">
                    <button onClick={() => setView('menu')} className="p-2 bg-gray-50 rounded-full text-gray-500"><IconArrowLeft/></button>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Tu Pedido</h2>
                </header>
                <div className="p-6 space-y-4">
                    {cartItems.map(item => (
                        <div key={item.cartItemId} className="bg-white rounded-3xl p-4 flex gap-4 border border-gray-50 shadow-sm">
                            <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{item.name}</h4>
                                <p className="text-emerald-600 font-black">${item.price.toFixed(0)}</p>
                                <div className="flex items-center gap-4 mt-2">
                                    <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="p-1 text-gray-400"><IconMinus className="h-4 w-4"/></button>
                                    <span className="font-black text-gray-800">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 text-emerald-500"><IconPlus className="h-4 w-4"/></button>
                                </div>
                            </div>
                            <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-300"><IconX className="h-5 w-5"/></button>
                        </div>
                    ))}
                    {cartItems.length === 0 && <div className="text-center py-20 text-gray-400 font-medium">No hay productos en tu carrito.</div>}
                </div>
                {cartItems.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
                        <button onClick={() => setView('checkout')} className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl active:scale-[0.98] transition-transform flex justify-between px-10">
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
        
        return (
            <div className="min-h-screen bg-[#0D1117] text-white pb-40">
                <header className="p-6 flex items-center gap-4 border-b border-gray-800 sticky top-0 bg-[#0D1117]/80 backdrop-blur-md z-50">
                    <button onClick={() => setView('cart')} className="p-2 bg-gray-800 rounded-full text-gray-400"><IconArrowLeft/></button>
                    <h2 className="text-xl font-black tracking-tight">Finalizar Compra</h2>
                </header>
                
                <div className="p-6 space-y-10 max-w-lg mx-auto">
                    {/* Datos del Cliente */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Tus Datos</h3>
                        <div className="space-y-3">
                            <input 
                                type="text" placeholder="Nombre completo" 
                                value={customerName} onChange={e => setCustomerName(e.target.value)}
                                className="w-full bg-[#161B22] border border-gray-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                            <input 
                                type="tel" placeholder="WhatsApp / Teléfono" 
                                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full bg-[#161B22] border border-gray-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </section>

                    {/* Dirección (si es Delivery) */}
                    {orderType === OrderType.Delivery && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Dirección de Entrega</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    type="text" placeholder="Calle" value={customerAddress.calle}
                                    onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})}
                                    className="col-span-2 w-full bg-[#161B22] border border-gray-800 rounded-2xl p-4 text-white outline-none"
                                />
                                <input 
                                    type="text" placeholder="No." value={customerAddress.numero}
                                    onChange={e => setCustomerAddress({...customerAddress, numero: e.target.value})}
                                    className="w-full bg-[#161B22] border border-gray-800 rounded-2xl p-4 text-white outline-none"
                                />
                                <input 
                                    type="text" placeholder="Colonia" value={customerAddress.colonia}
                                    onChange={e => setCustomerAddress({...customerAddress, colonia: e.target.value})}
                                    className="w-full bg-[#161B22] border border-gray-800 rounded-2xl p-4 text-white outline-none"
                                />
                            </div>
                        </section>
                    )}

                    {/* Forma de Pago (Mejorada) */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Forma de Pago</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {paymentMethods?.map(method => (
                                <button
                                    key={method}
                                    onClick={() => { setSelectedPayment(method); setPaymentProof(null); }}
                                    className={`p-4 rounded-2xl font-bold text-sm transition-all border ${selectedPayment === method ? 'bg-[#00945E] border-[#00945E] text-white shadow-lg shadow-emerald-900/40' : 'bg-[#161B22] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {/* Detalles del Pago Seleccionado */}
                        {selectedPayment && (
                            <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
                                {selectedPayment === 'Pago Móvil' && settings?.payment.pagoMovil && (
                                    <div className="bg-[#1C2128] border border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-xl">
                                        <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-widest border-b border-gray-800 pb-3">
                                            <IconInfo className="h-4 w-4"/> Datos para Pago Móvil
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Banco:</span> <span className="font-bold">{settings.payment.pagoMovil.bank}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Teléfono:</span> <span className="font-bold">{settings.payment.pagoMovil.phone}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Cédula:</span> <span className="font-bold">{settings.payment.pagoMovil.idNumber}</span></div>
                                        </div>
                                    </div>
                                )}

                                {selectedPayment === 'Transferencia' && settings?.payment.transfer && (
                                    <div className="bg-[#1C2128] border border-gray-800 rounded-[2rem] p-6 space-y-4 shadow-xl">
                                        <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-widest border-b border-gray-800 pb-3">
                                            <IconInfo className="h-4 w-4"/> Datos para Transferencia
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Banco:</span> <span className="font-bold">{settings.payment.transfer.bank}</span></div>
                                            <div className="flex flex-col gap-1 mt-1"><span className="text-gray-500">Cuenta:</span> <span className="font-mono text-[13px] bg-black/30 p-2 rounded-lg break-all">{settings.payment.transfer.accountNumber}</span></div>
                                            <div className="flex justify-between mt-2"><span className="text-gray-500">Titular:</span> <span className="font-bold">{settings.payment.transfer.accountHolder}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Rif:</span> <span className="font-bold">{settings.payment.transfer.idNumber}</span></div>
                                        </div>
                                    </div>
                                )}

                                {selectedPayment !== 'Efectivo' && selectedPayment !== 'Punto de Venta' && (
                                    <div className="mt-8 space-y-4">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Sube tu Comprobante</h3>
                                        {!paymentProof ? (
                                            <label className="flex flex-col items-center justify-center w-full h-40 bg-[#161B22] border-2 border-dashed border-gray-800 rounded-[2rem] cursor-pointer hover:border-emerald-500 hover:bg-[#1C2128] transition-all group">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <IconUpload className="h-10 w-10 text-gray-600 group-hover:text-emerald-500 mb-3"/>
                                                    <p className="text-sm text-gray-500 group-hover:text-gray-300">Click para subir captura de pantalla</p>
                                                    <p className="text-xs text-gray-600 mt-1">PNG, JPG o JPEG</p>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                            </label>
                                        ) : (
                                            <div className="relative group">
                                                <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-emerald-500/50 shadow-lg shadow-emerald-500/10">
                                                    <img src={paymentProof} className="w-full h-full object-cover" />
                                                </div>
                                                <button 
                                                    onClick={() => setPaymentProof(null)}
                                                    className="absolute -top-3 -right-3 p-2 bg-rose-500 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
                                                >
                                                    <IconX className="h-5 w-5"/>
                                                </button>
                                                <p className="text-center text-[11px] font-black text-emerald-500 uppercase tracking-widest mt-2">Imagen Cargada con éxito</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0D1117] border-t border-gray-800">
                    <button 
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder}
                        className="w-full bg-[#00945E] hover:bg-[#007A4D] text-white py-5 rounded-[2.25rem] font-black text-lg shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
                    >
                        {isPlacingOrder ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>Confirmar Pedido <IconCheck className="h-6 w-6"/></>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // --- Render: Menu Principal ---

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans selection:bg-green-100 overflow-x-hidden">
                {/* Header/Cover Section (Already Premium from previous update) */}
                <div className="relative">
                    <div className="h-[24rem] w-full overflow-hidden rounded-b-[4rem] shadow-2xl relative">
                        <img 
                            src={settings?.branch.coverImageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'} 
                            className="w-full h-full object-cover brightness-[0.85]" 
                            alt="Portada"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
                    </div>
                    
                    {/* Botones Flotantes en Portada */}
                    <div className="absolute top-8 right-6 flex flex-col gap-3 z-20">
                        <button onClick={() => setActiveModal('hours')} className="p-3.5 bg-white/95 backdrop-blur-md shadow-2xl rounded-full text-gray-900 hover:scale-110 hover:bg-white transition-all active:scale-95 border border-white/50 group">
                            <IconInfo className="h-6 w-6 text-gray-800 group-hover:text-emerald-500 transition-colors"/>
                        </button>
                        <button onClick={() => setActiveModal('location')} className="p-3.5 bg-white/95 backdrop-blur-md shadow-2xl rounded-full text-gray-900 hover:scale-110 hover:bg-white transition-all active:scale-95 border border-white/50 group">
                            <IconMap className="h-6 w-6 text-gray-800 group-hover:text-emerald-500 transition-colors"/>
                        </button>
                    </div>

                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
                        <div className="w-32 h-32 rounded-full border-[8px] border-white bg-white shadow-[0_25px_50px_rgba(0,0,0,0.15)] overflow-hidden flex items-center justify-center">
                            {settings?.branch.logoUrl ? (
                                <img src={settings.branch.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                            ) : (
                                <span className="text-5xl font-black text-[#5EC278]">{settings?.company.name.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-20 text-center px-6">
                    <div className="flex flex-col items-center gap-2">
                        <StatusBadge isOpen={isOpenNow} />
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight mt-1">{settings?.company.name || 'ALTOQUE FOOD'}</h1>
                        <div className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-[#5EC278] transition-colors cursor-pointer group" onClick={() => setActiveModal('location')}>
                            <IconLocationMarker className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[12px] font-bold tracking-tight uppercase border-b border-transparent group-hover:border-[#5EC278]">
                                {settings?.branch.fullAddress || 'Nuestra Ubicación'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex justify-center mt-8">
                        <div className="inline-flex bg-gray-100/60 p-1.5 rounded-[2rem] border border-gray-100 backdrop-blur-sm">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex items-center gap-2 px-8 py-3 rounded-full text-[13px] font-black transition-all duration-500 ${orderType === OrderType.Delivery ? 'bg-white text-[#5EC278] shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                <IconDelivery className="h-4 w-4" /> Domicilio
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex items-center gap-2 px-8 py-3 rounded-full text-[13px] font-black transition-all duration-500 ${orderType === OrderType.TakeAway ? 'bg-white text-[#5EC278] shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                <IconStore className="h-4 w-4" /> Recoger
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-gray-50 mt-10">
                    <div className="flex overflow-x-auto px-6 py-5 gap-3 no-scrollbar scroll-smooth">
                        <button onClick={() => setSelectedCategory('all')} className={`px-8 py-3 rounded-full text-[13px] font-black transition-all duration-300 whitespace-nowrap border ${selectedCategory === 'all' ? 'bg-[#5EC278] text-white border-[#5EC278] shadow-xl shadow-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                            Menú Completo
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-8 py-3 rounded-full text-[13px] font-black transition-all duration-300 whitespace-nowrap border ${selectedCategory === cat.id ? 'bg-[#5EC278] text-white border-[#5EC278] shadow-xl shadow-green-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-10">
                    <div className="grid grid-cols-1 gap-6">
                        {filteredProducts.map(product => {
                            const { price, promotion } = getDiscountedPrice(product, promotions);
                            return (
                                <div key={product.id} className="group bg-white rounded-[2.5rem] border border-gray-50 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] p-5 flex items-center gap-5 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 relative overflow-hidden">
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {promotion && <span className="bg-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded text-gray-900 uppercase">Oferta</span>}
                                            <h3 className="font-black text-gray-900 text-lg tracking-tight truncate group-hover:text-[#5EC278] transition-colors">{product.name}</h3>
                                        </div>
                                        <p className="text-[12px] text-gray-400 font-medium line-clamp-2 leading-relaxed mb-4">{product.description}</p>
                                        <div className="bg-[#F8FDF9] px-4 py-1 rounded-2xl border border-green-50 shadow-sm inline-block">
                                            <span className="text-[#5EC278] font-black text-lg">${price.toFixed(0)}</span>
                                        </div>
                                    </div>
                                    <div className="w-[8rem] h-[8rem] rounded-[2rem] overflow-hidden relative shrink-0 shadow-lg border border-gray-50 transition-all duration-500 group-hover:scale-105 group-hover:rotate-2">
                                        <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name}/>
                                        <button onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }} className="absolute bottom-2 right-2 bg-white p-2 rounded-xl shadow-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all active:scale-90">
                                            <IconPlus className="h-5 w-5"/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {itemCount > 0 && (
                    <div className="fixed bottom-10 left-6 right-6 z-50 max-w-lg mx-auto">
                        <button onClick={() => setView('cart')} className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-[2rem] font-black text-lg shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] flex items-center justify-between px-10 transition-all active:scale-[0.96] animate-in slide-in-from-bottom-12 duration-500 group">
                            <div className="flex items-center gap-4">
                                 <div className="bg-emerald-500 px-3 py-1 rounded-xl text-[10px] font-black group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">{itemCount}</div>
                                 <span className="tracking-tight uppercase text-xs font-black">Mi Orden</span>
                            </div>
                            <div className="flex items-center gap-3">
                                 <span className="text-gray-500 text-[10px] font-bold tracking-[0.2em]">TOTAL</span>
                                 <span className="font-black text-2xl tracking-tighter text-emerald-400">${cartTotal.toFixed(0)}</span>
                            </div>
                        </button>
                    </div>
                )}

                <ReferenceModal title="Nuestros Horarios" isOpen={activeModal === 'hours'} onClose={() => setActiveModal('none')}>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {settings?.schedules[0].days.map(d => (
                            <div key={d.day} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                <div>
                                    <span className="font-black text-gray-900 text-xs tracking-tight uppercase">{d.day}</span>
                                    <div className="mt-1">
                                        <span className={`text-[9px] uppercase font-black tracking-widest ${d.isOpen ? 'text-[#5EC278]' : 'text-rose-500'}`}>
                                            {d.isOpen ? 'Servicio Activo' : 'Cerrado'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {d.isOpen ? (
                                        d.shifts.length > 0 ? (
                                            d.shifts.map((s, idx) => <div key={idx} className="bg-gray-50 px-3 py-1 rounded-xl border border-gray-100 mt-1"><span className="text-[12px] font-black text-gray-600 tracking-tighter">{s.start} — {s.end}</span></div>)
                                        ) : <span className="text-[12px] font-black text-gray-400 tracking-tighter uppercase">Abierto 24h</span>
                                    ) : <IconX className="h-4 w-4 text-rose-200 ml-auto" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </ReferenceModal>

                <ReferenceModal title="Ubicación" isOpen={activeModal === 'location'} onClose={() => setActiveModal('none')}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-[#5EC278] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100"><IconMap className="h-7 w-7"/></div>
                        <p className="text-gray-800 text-sm font-black tracking-tight leading-relaxed mb-10 px-4">{settings?.branch.fullAddress || 'Dirección no configurada.'}</p>
                        <a href={settings?.branch.googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full bg-[#5EC278] text-white py-5 rounded-2xl font-black shadow-2xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all mb-4 text-[12px] uppercase tracking-widest active:scale-95">Ver en Google Maps <IconExternalLink className="h-4 w-4"/></a>
                    </div>
                </ReferenceModal>
                <Chatbot />
            </div>
        );
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
                    <IconCheck className="h-10 w-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black mb-2 tracking-tighter">¡Pedido Enviado!</h1>
                <p className="text-emerald-100 mb-8 max-w-xs mx-auto font-medium">Te hemos redirigido a WhatsApp para enviar los detalles finales. El restaurante confirmará tu orden en breve.</p>
                <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-50 transition-all uppercase text-sm tracking-widest">Hacer otro pedido</button>
            </div>
        );
    }

    return null;
}
