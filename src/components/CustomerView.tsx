
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, Schedule, ShippingCostType, DaySchedule, Address } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles, IconClock, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Helpers de Horario ---
const getStoreStatus = (schedules: Schedule[]): { isOpen: boolean; message: string } => {
    if (!schedules || schedules.length === 0) {
        return { isOpen: true, message: 'Abierto' };
    }
    const mainSchedule = schedules[0];
    const now = new Date();
    const dayOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const todaySchedule = mainSchedule.days.find(d => d.day === dayOfWeek);

    if (!todaySchedule || !todaySchedule.isOpen) return { isOpen: false, message: 'Cerrado Ahora' };
    if (todaySchedule.shifts.length === 0) return { isOpen: true, message: 'Abierto Ahora' };

    for (const shift of todaySchedule.shifts) {
        if (currentTime >= shift.start && currentTime < shift.end) return { isOpen: true, message: `Abierto Ahora` };
    }

    return { isOpen: false, message: 'Cerrado Ahora' };
};


// --- Sub-componentes ---

const ScheduleModal: React.FC<{ isOpen: boolean; onClose: () => void; schedules: Schedule[] }> = ({ isOpen, onClose, schedules }) => {
    if (!isOpen || !schedules || schedules.length === 0) return null;
    
    const mainSchedule = schedules[0];
    const daysOrder: DaySchedule['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const sortedDays = mainSchedule.days.sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><IconClock className="h-5 w-5 text-emerald-400"/> Nuestros Horarios</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><IconX/></button>
                </div>
                <div className="space-y-3">
                    {sortedDays.map(day => (
                        <div key={day.day} className="flex justify-between items-center text-sm border-b border-gray-800 pb-3 last:border-0">
                            <span className="font-semibold text-gray-300">{day.day}</span>
                            <div className="text-right">
                                {!day.isOpen || day.shifts.length === 0 ? (
                                    <span className="text-rose-400 font-medium">Cerrado</span>
                                ) : (
                                    day.shifts.map((shift, index) => (
                                        <span key={index} className="block text-gray-400 font-mono">{shift.start} - {shift.end}</span>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur-md z-30 border-b border-gray-800 shadow-sm">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const PairingAI: React.FC<{ items: CartItem[], allProducts: Product[], isTableSession: boolean }> = ({ items, allProducts, isTableSession }) => {
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const consumedItemsRaw = isTableSession ? localStorage.getItem('altoque_consumed_items') : null;
        const hasConsumedItems = consumedItemsRaw && JSON.parse(consumedItemsRaw).length > 0;

        if (items.length > 0 || hasConsumedItems) {
            setLoading(true);
            getPairingSuggestion(items, allProducts).then(res => {
                if (isMounted) {
                    setSuggestion(res);
                    setLoading(false);
                }
            });
        } else {
            setSuggestion("");
        }
        return () => { isMounted = false; };
    }, [items, allProducts, isTableSession]);

    if (!suggestion && !loading) return null;

    return (
        <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl flex items-start gap-3 animate-fade-in shadow-lg shadow-indigo-500/10">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <IconSparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">MARIDAJE (IA)</p>
                {loading ? (
                    <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-1"></div>
                ) : (
                    <p className="text-sm text-gray-200 italic leading-snug font-medium">"{suggestion}"</p>
                )}
            </div>
        </div>
    );
};

// --- Helper de Precio ---
const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.appliesTo === 'all_products') return true;
        return p.productIds.includes(product.id);
    });

    if (activePromotions.length === 0) return { price: product.price };

    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;

    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === 'percentage') {
            currentPrice = product.price * (1 - promo.discountValue / 100);
        } else {
            currentPrice = Math.max(0, product.price - promo.discountValue);
        }
        if (currentPrice < bestPrice) {
            bestPrice = currentPrice;
            bestPromo = promo;
        }
    });

    return { price: bestPrice, promotion: bestPromo };
};

// --- Vista Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);
    
    // --- ESTADO PERSISTENTE DE MESA ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [orderType, setOrderType] = useState<OrderType>(() => {
        return localStorage.getItem('altoque_table_info') ? OrderType.DineIn : OrderType.Delivery;
    });

    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        if (!localStorage.getItem('altoque_table_info')) return [];
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => {
        if (!localStorage.getItem('altoque_table_info')) return '';
        return localStorage.getItem('altoque_customer_name') || ''
    });

    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);

    const isTableSession = orderType === OrderType.DineIn && !!tableInfo;

    const sessionTotal = useMemo(() => {
        if (!isTableSession) return 0;
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems, isTableSession]);
    
    const [paysWith, setPaysWith] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // --- Sincronización con LocalStorage (SOLO PARA SESIÓN DE MESA) ---
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
        }
    }, [sessionItems, isTableSession]);

    useEffect(() => {
        if (tableInfo) {
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            setOrderType(OrderType.DineIn);
        } else {
            localStorage.removeItem('altoque_table_info');
            if (orderType === OrderType.DineIn) {
                setOrderType(OrderType.Delivery);
            }
        }
    }, [tableInfo]);

    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [customerName, isTableSession]);

    // --- Inicialización y Carga de Datos ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms, pers] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions(), getPersonalizations()
                ]);
                setSettings(s); setAllProducts(p); setAllCategories(c); setAllPromotions(proms); setAllPersonalizations(pers);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone) {
            const newInfo = { table, zone };
            setTableInfo(newInfo);
        }

        return () => unsubscribeFromChannel();
    }, []);
    
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("La geolocalización no es compatible con este navegador.");
            return;
        }
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const link = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                
                const addressForm = document.getElementById('address-form') as HTMLFormElement;
                if (addressForm) {
                    (addressForm.elements.namedItem('googleMapsLink') as HTMLInputElement).value = link;
                }
                alert("Ubicación capturada con éxito.");
                setIsGettingLocation(false);
            },
            () => {
                alert("No se pudo obtener la ubicación. Asegúrate de haber concedido los permisos.");
                setIsGettingLocation(false);
            }
        );
    };

    // --- Lógica Central de Pedidos ---
    const handleOrderAction = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => {
        if (!settings) return;
        
        const orderId = `#${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');

        try {
            if (isTableSession) {
                 if (isFinalClosing) {
                    const msg = [ `💰 *SOLICITUD DE CIERRE DE CUENTA*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, `💵 *TOTAL A PAGAR: $${sessionTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}`, paymentProof ? `✅ Comprobante adjunto` : '', `_Cliente solicita la cuenta para retirarse._` ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    setSessionItems([]); setTableInfo(null); setCustomerName('');
                    localStorage.removeItem('altoque_consumed_items'); localStorage.removeItem('altoque_table_info'); localStorage.removeItem('altoque_customer_name');
                    clearCart(); setView('confirmation');
                 } else {
                    const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, tableId: `${tableInfo?.zone} - ${tableInfo?.table}`, paymentStatus: 'pending' };
                    await saveOrder(newOrderData);
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(customer.name);
                    const msg = [ `🔥 *NUEVA RONDA A COCINA*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `🪑 MESA: ${tableInfo.table} (${tableInfo.zone})`, `👤 Cliente: ${customer.name}`, `--------------------------------`, itemsStr, `--------------------------------`, `💰 Ronda Actual: $${cartTotal.toFixed(2)}`, (sessionItems.length > 0) ? `📈 *Total Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : '', ].filter(Boolean).join('\n');
                    window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                    clearCart(); setView('confirmation');
                 }
            } else {
                const newOrderData: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, paymentStatus: 'pending', generalComments: paysWith ? `Cliente pagará con $${paysWith}` : undefined };
                await saveOrder(newOrderData);
                let msg: string;
                if(orderType === OrderType.Delivery) {
                     msg = [ `*${orderId}*`, `*Nombre:* ${customer.name}`, `*Celular:* ${customer.phone}`, `---`, `📍 *Dirección*`, `· *Calle:* ${customer.address.calle}`, `· *Número:* ${customer.address.numero}`, `· *Colonia:* ${customer.address.colonia}`, customer.address.referencias ? `· *Referencias:* ${customer.address.referencias}` : '', customer.address.googleMapsLink ? `· *Ubicación:* ${customer.address.googleMapsLink}` : '', `---`, `💵 *Resumen*`, `· *Productos:* $${cartTotal.toFixed(2)}`, `· *Envío:* 🎈 Por definir 🎈`, `· *Total:* $${cartTotal.toFixed(2)} + envío en ${paymentMethod}`, paysWith ? `· *Cliente pagará con $${paysWith}*` : '' ].filter(Boolean).join('\n');
                } else {
                     msg = [ `🥡 *NUEVO PEDIDO PARA RECOGER*`, `*${orderId}*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`, `👤 Cliente: ${customer.name}`, `📱 Contacto: ${customer.phone}`,`--------------------------------`, itemsStr, `--------------------------------`, `💰 *Total Pedido: $${cartTotal.toFixed(2)}*`, `💳 Método: ${paymentMethod}` ].filter(Boolean).join('\n');
                }
                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart(); setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar el pedido. Intente de nuevo.");
        }
    };

    const filteredAndGroupedProducts = useMemo(() => {
        return allCategories
            .map(cat => {
                const categoryProducts = allProducts.filter(p => 
                    p.categoryId === cat.id && 
                    p.available &&
                    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     p.description.toLowerCase().includes(searchTerm.toLowerCase()))
                );
                return { ...cat, products: categoryProducts };
            })
            .filter(cat => cat.products.length > 0);
    }, [allCategories, allProducts, searchTerm]);
    
    const scrollToCategory = (index: number) => {
        categoryRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Cargando menú...</p>
        </div>
    );
    
    const headerTitle = view === 'cart' ? 'MI PEDIDO' : 'CONFIRMAR PEDIDO';
    const confirmationTitle = '¡PEDIDO ENVIADO!';
    const confirmationText = `Tu pedido para ${orderType === OrderType.Delivery ? 'domicilio' : 'recoger'} ha sido enviado. Recibirás una confirmación por WhatsApp.`;
    const confirmationButtonText = 'HACER OTRO PEDIDO';
    const storeStatus = getStoreStatus(settings.schedules);
    const currencyCode = settings.company.currency.code;

    return (
        <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && ( <Header title={headerTitle} onBack={() => view === 'checkout' ? setView('cart') : setView('menu')} /> )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="relative pb-6">
                                <div className="px-6 pt-6 flex flex-col items-center text-center relative z-10">
                                    <div className="w-20 h-20 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 border-2 border-gray-700 overflow-hidden">
                                        {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-black text-emerald-500 text-3xl bg-gray-700">{settings.company.name.slice(0,2)}</div>}
                                    </div>
                                    <h2 className="text-3xl font-black text-white">{settings.company.name}</h2>
                                    <p className="text-sm text-gray-400 mb-3">{settings.branch.alias}</p>
                                    <div className="flex items-center gap-2 text-xs mb-3">
                                        <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                                        <span className={storeStatus.isOpen ? 'text-emerald-400 font-semibold' : 'text-gray-400 font-medium'}>{storeStatus.message}</span>
                                    </div>
                                    {isTableSession && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                            <IconTableLayout className="h-5 w-5"/>
                                            Estás en la mesa {tableInfo.table} ({tableInfo.zone})
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="sticky top-0 bg-gray-900 z-20 px-4 py-3 border-y border-gray-800">
                                <div className="relative mb-3">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input 
                                        type="search" 
                                        placeholder="Buscar productos..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-full pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none placeholder-gray-500"
                                    />
                                </div>
                                <div className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
                                    {filteredAndGroupedProducts.map((cat, index) => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => scrollToCategory(index)}
                                            className="px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                        >
                                            {cat.name.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 space-y-8 mt-4">
                                {filteredAndGroupedProducts.map((cat, index) => (
                                    <div key={cat.id} ref={el => categoryRefs.current[index] = el}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="text-lg font-black text-gray-200 uppercase tracking-wide">{cat.name}</h3>
                                            <span className="bg-gray-700 text-gray-400 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{cat.products.length}</span>
                                        </div>
                                        <div className="grid gap-4">
                                            {cat.products.map(p => {
                                                const { price: displayPrice, promotion } = getDiscountedPrice(p, allPromotions);
                                                return (
                                                    <div key={p.id} className="bg-gray-800/50 p-3 rounded-2xl border border-gray-800/60 flex gap-4 transition-all group">
                                                        <div className="relative shrink-0">
                                                            <img src={p.imageUrl} onClick={() => setSelectedProduct(p)} className="w-28 h-28 rounded-xl object-cover shadow-lg cursor-pointer" />
                                                            {promotion && (
                                                                <div className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
                                                                    {promotion.discountType === 'fixed' ? `-$${promotion.discountValue.toFixed(2)}` : `-${promotion.discountValue}%`}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-between" onClick={() => setSelectedProduct(p)}>
                                                            <div>
                                                                <h4 className="font-bold text-gray-100 leading-tight">{p.name}</h4>
                                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.description}</p>
                                                            </div>
                                                            <div className="flex justify-between items-end">
                                                                <div className="flex items-baseline gap-2">
                                                                    {promotion ? (
                                                                        <>
                                                                            <span className="font-bold text-lg text-rose-400">{currencyCode} ${displayPrice.toFixed(2)}</span>
                                                                            <span className="text-xs text-gray-500 line-through">{currencyCode} ${p.price.toFixed(2)}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="font-bold text-lg text-emerald-400">{currencyCode} ${displayPrice.toFixed(2)}</span>
                                                                    )}
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); addToCart(p, 1); }} className="bg-gray-700/80 p-2.5 rounded-full shadow-md active:scale-90 transition-transform">
                                                                    <IconPlus className="h-4 w-4 text-white"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {view === 'confirmation' && ( <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in"><div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20"><IconCheck className="w-12 h-12 text-emerald-500"/></div><div className="space-y-4"><h2 className="text-4xl font-black text-white">{confirmationTitle}</h2><p className="text-gray-500 text-sm">{confirmationText}</p></div><button onClick={() => setView('menu')} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold">{confirmationButtonText}</button></div> )}
                    {view === 'cart' && ( <div className="p-5 animate-fade-in"> <PairingAI items={cartItems} allProducts={allProducts} isTableSession={isTableSession}/> <h2 className="text-xl font-black text-white mb-6">Resumen de tu Pedido</h2> <div className="space-y-4"> {cartItems.map(i => ( <div key={i.cartItemId} className="flex gap-4"> <img src={i.imageUrl} className="w-20 h-20 rounded-xl object-cover" /> <div className="flex-1"> <div className="flex justify-between"> <span className="font-bold">{i.name}</span> <span>${(i.price * i.quantity).toFixed(2)}</span> </div> <div className="flex items-center justify-between mt-2"> <div className="flex items-center bg-gray-800 rounded-lg"> <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="p-2"><IconMinus className="h-4 w-4"/></button> <span className="w-8 text-center text-sm font-bold">{i.quantity}</span> <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="p-2"><IconPlus className="h-4 w-4"/></button> </div> <button onClick={() => removeFromCart(i.cartItemId)} className="text-rose-500"><IconTrash/></button> </div> </div> </div> ))} </div> <div className="mt-8 pt-6 border-t border-gray-800"> <div className="flex justify-between font-bold text-xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button disabled={cartItems.length === 0} onClick={() => setView('checkout')} className="w-full bg-emerald-600 py-4 rounded-lg font-bold disabled:opacity-50">IR A PAGAR</button> </div> </div> )}
                    {view === 'checkout' && ( <form id="address-form" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const customer: Customer = { name: fd.get('name') as string, phone: fd.get('phone') as string, address: { calle: fd.get('calle') as string, numero: fd.get('numero') as string, colonia: fd.get('colonia') as string, referencias: fd.get('referencias') as string, googleMapsLink: fd.get('googleMapsLink') as string || undefined }}; handleOrderAction(customer, (fd.get('payment') as PaymentMethod) || 'Efectivo', 0); }} className="p-6 space-y-6 animate-fade-in"> <input type="hidden" name="googleMapsLink" /> <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">TUS DATOS</h3> <input name="name" type="text" className="w-full bg-gray-800 rounded p-3" placeholder="Nombre" required /> <input name="phone" type="tel" className="w-full bg-gray-800 rounded p-3" placeholder="WhatsApp de contacto" required /> </div> {orderType === OrderType.Delivery && ( <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">DIRECCIÓN DE ENTREGA</h3> <input name="calle" className="w-full bg-gray-800 rounded p-3" placeholder="Calle / Avenida" required /> <input name="numero" className="w-full bg-gray-800 rounded p-3" placeholder="Nro Casa/Apto" required /> <input name="colonia" className="w-full bg-gray-800 rounded p-3" placeholder="Colonia / Sector" required /> <textarea name="referencias" className="w-full bg-gray-800 rounded p-3" placeholder="Referencias (ej. casa amarilla)"></textarea> <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-lg font-bold disabled:opacity-50"><IconLocationMarker className="h-5 w-5"/> {isGettingLocation ? 'Obteniendo...' : 'Usar mi ubicación actual'}</button> </div> )} <div className="space-y-4 p-6 bg-gray-800/30 rounded-xl"> <h3 className="font-bold">MÉTODO DE PAGO</h3> {(orderType === OrderType.Delivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods).map(m => ( <label key={m} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"> <input type="radio" name="payment" value={m} defaultChecked={m === 'Efectivo'} className="accent-emerald-500 h-5 w-5" /> <span>{m}</span> </label> ))} <input type="text" name="paysWith" onChange={e => setPaysWith(e.target.value)} className="w-full bg-gray-800 rounded p-3 mt-2" placeholder="¿Con cuánto pagas? (Para cambio)" /> </div> <div className="pt-4"> <div className="flex justify-between font-bold text-2xl mb-6"> <span>TOTAL</span> <span>${cartTotal.toFixed(2)}</span> </div> <button type="submit" className="w-full bg-emerald-600 py-4 rounded-lg font-bold flex items-center justify-center gap-3"><IconWhatsapp className="h-5 w-5" /> ENVIAR PEDIDO</button> </div> </form> )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-gray-800">
                            <div className="h-64 relative"><img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /><button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white"><IconX/></button></div>
                            <div className="p-8">
                                <h2 className="text-3xl font-black mb-2 text-white">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-8">{selectedProduct.description}</p>
                                <button onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }} className="w-full bg-emerald-600 py-5 rounded-xl font-black text-white flex justify-between px-6 items-center">
                                    <span>AÑADIR AL PEDIDO</span>
                                    <span>${getDiscountedPrice(selectedProduct, allPromotions).price.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'menu' && itemCount > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
                        <button 
                            onClick={() => setView('cart')} 
                            className="w-full bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl shadow-emerald-900/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-800 px-3 py-1 rounded-lg font-bold">{itemCount}</div>
                                <span className="uppercase text-sm font-black">VER PEDIDO</span>
                            </div>
                            <span className="font-black text-xl">${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                <Chatbot />
                <ScheduleModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} schedules={settings.schedules} />
            </div>
             <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
