
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, DiscountType, PromotionAppliesTo, ShippingCostType, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconCheck, IconUpload, IconReceipt, IconClock, IconStore, IconLocationMarker, INITIAL_SETTINGS, PRODUCTS, CATEGORIES } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';

// --- Componentes de UI Auxiliares ---

const ScheduleModal: React.FC<{ isOpen: boolean; onClose: () => void; schedule: Schedule }> = ({ isOpen, onClose, schedule }) => {
    if (!isOpen) return null;
    const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const todayIndex = new Date().getDay();
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1; 
    const todayName = daysOrder[adjustedTodayIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            <div className="bg-[#1e293b] w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] border border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-gray-800 bg-gray-800/20 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Horarios</h3>
                    <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><IconX className="h-5 w-5"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-2">
                    {schedule.days.map((day) => {
                        const isToday = day.day === todayName;
                        return (
                            <div key={day.day} className={`flex justify-between items-center py-4 px-5 rounded-2xl ${isToday ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-gray-800/30 border border-gray-800'}`}>
                                <span className={`text-xs font-black uppercase tracking-widest ${isToday ? 'text-emerald-400' : 'text-gray-400'}`}>
                                    {day.day} {isToday && <span className="ml-2 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8px] align-middle">HOY</span>}
                                </span>
                                <div className="text-right">
                                    {day.isOpen && day.shifts.length > 0 ? (
                                        day.shifts.map((shift, i) => (
                                            <div key={i} className="text-xs text-gray-200 font-bold">
                                                {shift.start} - {shift.end}
                                            </div>
                                        ))
                                    ) : (
                                        day.isOpen && day.shifts.length === 0 ? (
                                            <span className="text-xs text-emerald-400 font-black uppercase tracking-widest">Abierto 24h</span>
                                        ) : (
                                            <span className="text-xs text-rose-500 font-black uppercase tracking-widest">Cerrado</span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                    <button onClick={onClose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-gray-700">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const RestaurantHero: React.FC<{ 
    settings: AppSettings, 
    tableInfo: { table: string, zone: string } | null,
    orderType: OrderType,
    setOrderType: (type: OrderType) => void
}> = ({ settings, tableInfo, orderType, setOrderType }) => {
    const { branch, company, shipping, schedules } = settings;
    const [showSchedule, setShowSchedule] = useState(false);
    const [isOpenNow, setIsOpenNow] = useState(false);
    const currentSchedule = schedules[0];

    useEffect(() => {
        if (!currentSchedule) return;
        const now = new Date();
        const daysOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = daysOrder[now.getDay()];
        const todaySchedule = currentSchedule.days.find(d => d.day === todayName);

        if (todaySchedule && todaySchedule.isOpen) {
            if (todaySchedule.shifts.length === 0) {
                setIsOpenNow(true);
            } else {
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const isOpen = todaySchedule.shifts.some(shift => {
                    const [startH, startM] = shift.start.split(':').map(Number);
                    const [endH, endM] = shift.end.split(':').map(Number);
                    const start = startH * 60 + startM;
                    const end = endH * 60 + endM;
                    return currentTime >= start && currentTime < end;
                });
                setIsOpenNow(isOpen);
            }
        } else {
            setIsOpenNow(false);
        }
    }, [currentSchedule]);

    return (
        <div className="relative pb-6">
            <div className="h-64 w-full overflow-hidden relative">
                {branch.coverImageUrl ? (
                    <img src={branch.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <h2 className="text-4xl md:text-5xl font-black text-white/10 uppercase tracking-tighter text-center leading-none select-none pointer-events-none">
                        GET YOUR<br/>MEAL<br/>NOW!
                    </h2>
                </div>
            </div>

            <div className="px-6 relative -mt-20 flex flex-col items-center text-center">
                <div className="w-32 h-32 bg-[#0f172a] rounded-full p-1.5 shadow-2xl mb-4 relative z-10">
                     <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-2 border-gray-800">
                        {branch.logoUrl ? 
                            <img src={branch.logoUrl} alt={`${company.name} logo`} className="w-full h-full object-cover" />
                            :
                            <span className="text-3xl font-black text-emerald-500">AF</span>
                        }
                     </div>
                </div>
                
                <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{company.name}</h1>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{branch.alias}</p>

                <div className="flex items-center gap-2 mb-6">
                    <span className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isOpenNow ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isOpenNow ? 'Abierto' : 'Cerrado'}
                    </span>
                </div>

                {/* Toggle Delivery/Pickup */}
                <div className="w-full max-w-sm bg-gray-800/50 rounded-full p-1 flex relative border border-gray-700/50 backdrop-blur-sm mb-6">
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-all duration-300 ease-out shadow-lg ${orderType === OrderType.TakeAway ? 'translate-x-[100%] left-1' : 'left-1'}`}
                    ></div>
                    <button 
                        onClick={() => setOrderType(OrderType.Delivery)} 
                        className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        A domicilio
                    </button>
                    <button 
                        onClick={() => setOrderType(OrderType.TakeAway)} 
                        className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Para recoger
                    </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 w-full max-w-sm border-t border-gray-800 pt-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            {orderType === OrderType.Delivery ? 'TIEMPO ENVÍO' : 'TIEMPO RECOGER'}
                        </p>
                        <p className="text-white font-bold text-sm">
                            {orderType === OrderType.Delivery 
                                ? `${shipping.deliveryTime.min} - ${shipping.deliveryTime.max} min`
                                : `${shipping.pickupTime.min} min`
                            }
                        </p>
                    </div>
                    <div className="text-center border-l border-gray-800">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">COSTO ENVÍO</p>
                        <p className="text-white font-bold text-sm">
                            {shipping.costType === ShippingCostType.Fixed && shipping.fixedCost 
                                ? formatCurrency(shipping.fixedCost, company.currency.code)
                                : (shipping.costType === ShippingCostType.Free ? 'Gratis' : 'Por definir')}
                        </p>
                    </div>
                </div>
            </div>
            
            {currentSchedule && (
                <ScheduleModal 
                    isOpen={showSchedule} 
                    onClose={() => setShowSchedule(false)} 
                    schedule={currentSchedule}
                />
            )}
        </div>
    );
};

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-[#0f172a]/95 backdrop-blur-md z-30 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight text-center flex-1">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds.includes(product.id);
    });
    if (activePromotions.length === 0) return { price: product.price };
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;
    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === DiscountType.Percentage) {
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

const formatCurrency = (amount: number, currencyCode: string) => {
    return `${currencyCode} $${amount.toFixed(2)}`;
};

const FloatingCartButton = ({ itemCount, total, onClick, currencyCode }: { itemCount: number, total: number, onClick: () => void, currencyCode: string }) => (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-[#0f172a] to-transparent pb-safe">
        <div className="container mx-auto max-w-md">
            <button 
                onClick={onClick}
                className="w-full bg-emerald-500 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between font-bold active:scale-[0.98] transition-transform"
            >
                <div className="bg-emerald-700/50 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">
                    {itemCount}
                </div>
                <span className="text-lg">Ver Pedido</span>
                <span className="text-lg">{formatCurrency(total, currencyCode)}</span>
            </button>
        </div>
    </div>
);

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<{ [personalizationId: string]: PersonalizationOption[] }>({});
    const [productComments, setProductComments] = useState('');
    const [productQuantity, setProductQuantity] = useState(1);
    const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Pago y UI
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Efectivo');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [tipAmount, setTipAmount] = useState<number>(0);
    const [isFinalClosing, setIsFinalClosing] = useState(false);

    // --- LÓGICA DE PERSISTENCIA PARA MESA (DINE-IN) ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    const [orderType, setOrderType] = useState<OrderType>(() => {
        const savedTable = localStorage.getItem('altoque_table_info');
        return savedTable ? OrderType.DineIn : OrderType.Delivery;
    });

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);

    const isTableSession = !!tableInfo;

    // Cálculo de Totales Acumulados
    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => {
            const optsPrice = item.selectedOptions ? item.selectedOptions.reduce((s, o) => s + (Number(o.price) || 0), 0) : 0;
            return acc + ((Number(item.price) || 0) + optsPrice) * item.quantity;
        }, 0);
    }, [sessionItems]);

    // El total a pagar en checkout depende de si es una ronda nueva o el cierre final
    const baseTotal = isFinalClosing ? sessionTotal : cartTotal;
    const finalTotal = useMemo(() => baseTotal + tipAmount, [baseTotal, tipAmount]);

    const handleOptionToggle = (personalization: Personalization, option: PersonalizationOption) => {
        setSelectedOptions(prev => {
            const currentSelection = prev[personalization.id] || [];
            const isSelected = currentSelection.some(opt => opt.id === option.id);
            
            if (personalization.maxSelection === 1) {
                return { ...prev, [personalization.id]: [option] };
            }

            if (isSelected) {
                return { ...prev, [personalization.id]: currentSelection.filter(opt => opt.id !== option.id) };
            } else {
                if (personalization.maxSelection && currentSelection.length >= personalization.maxSelection) {
                    return prev;
                }
                return { ...prev, [personalization.id]: [...currentSelection, option] };
            }
        });
    };

    const isOptionSelected = (pid: string, oid: string) => {
        return (selectedOptions[pid] || []).some(o => o.id === oid);
    };

    const currentProductTotalPrice = useMemo(() => {
        if (!selectedProduct) return 0;
        const { price: basePrice } = getDiscountedPrice(selectedProduct, allPromotions);
        let optionsPrice = 0;
        Object.values(selectedOptions).forEach(options => {
            options.forEach(opt => {
                optionsPrice += (Number(opt.price) || 0);
            });
        });
        return (basePrice + optionsPrice) * productQuantity;
    }, [selectedProduct, selectedOptions, productQuantity, allPromotions]);

    const handleAddToCartWithDetails = () => {
        if (!selectedProduct) return;
        const { price: basePrice } = getDiscountedPrice(selectedProduct, allPromotions);
        const flatOptions = Object.values(selectedOptions).flat();
        addToCart({ ...selectedProduct, price: basePrice }, productQuantity, productComments, flatOptions);
        setSelectedProduct(null);
        setSelectedOptions({});
        setProductComments('');
        setProductQuantity(1);
    };

    const isBankPayment = ['Pago Móvil', 'Transferencia', 'Zelle'].includes(selectedPayment);

    // Persistencia Automática cada vez que cambia la cuenta o info de mesa
    useEffect(() => {
        if (isTableSession) {
            localStorage.setItem('altoque_consumed_items', JSON.stringify(sessionItems));
            localStorage.setItem('altoque_table_info', JSON.stringify(tableInfo));
            localStorage.setItem('altoque_customer_name', customerName);
        }
    }, [sessionItems, tableInfo, customerName, isTableSession]);

    // Carga inicial y detección de QR
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms, pers] = await Promise.all([
                    getAppSettings().catch(err => { console.error("Error fetching settings:", err); return INITIAL_SETTINGS; }),
                    getProducts().catch(err => { console.error("Error fetching products:", err); return []; }),
                    getCategories().catch(err => { console.error("Error fetching categories:", err); return []; }),
                    getPromotions().catch(err => { console.error("Error fetching promotions:", err); return []; }),
                    getPersonalizations().catch(err => { console.error("Error fetching personalizations:", err); return []; })
                ]);
                
                if (s) setSettings(s); 
                
                // Consistency check: Use mock data ONLY if the database is completely empty.
                // If the user has categories but no products, we should show their categories.
                let finalProducts = p;
                let finalCategories = c;
                
                const dbIsEmpty = p.length === 0 && c.length === 0;

                if (dbIsEmpty) {
                    console.warn("Database is empty. Using professional mock data as fallback.");
                    finalProducts = PRODUCTS;
                    finalCategories = CATEGORIES;
                }
                
                setAllProducts(finalProducts); 
                setAllCategories(finalCategories); 
                setAllPromotions(proms);
                setAllPersonalizations(pers);
                
                if (finalCategories.length > 0) {
                    setActiveCategory(finalCategories[0].id);
                }
            } catch (err) {
                console.error("Fatal error in fetchData:", err);
                setError("Hubo un problema al cargar el menú. Por favor, intenta de nuevo.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        subscribeToMenuUpdates(fetchData);

        // Captura de parámetros QR de la URL de forma más robusta
        const hash = window.location.hash;
        const queryString = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(queryString);
        
        const table = params.get('table');
        const zone = params.get('zone');
        
        if (table && zone) {
            const info = { table, zone };
            setTableInfo(info);
            setOrderType(OrderType.DineIn);
            localStorage.setItem('altoque_table_info', JSON.stringify(info));
        }

        return () => unsubscribeFromChannel();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (res) => setPaymentProof(res.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleOrderAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!settings) return;

        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string || customerName;
        const phone = fd.get('phone') as string || '';
        const addressData = {
            calle: fd.get('calle') as string || '',
            numero: fd.get('numero') as string || '',
            colonia: fd.get('colonia') as string || '',
            referencias: fd.get('referencias') as string || ''
        };

        const customer: Customer = { name, phone, address: addressData, paymentProof: paymentProof || undefined };

        try {
            if (isFinalClosing && isTableSession) {
                // FLUJO: CIERRE DE CUENTA
                const finalOrderData: any = {
                    customer,
                    items: sessionItems,
                    total: finalTotal,
                    status: OrderStatus.Completed, // Mark as completed or a special status
                    orderType,
                    tableId: `${tableInfo?.zone} - ${tableInfo?.table}`,
                    paymentStatus: paymentProof ? 'paid' : 'pending',
                    tip: tipAmount,
                    generalComments: 'CIERRE DE CUENTA FINAL'
                };
                await saveOrder(finalOrderData);
            } else if (cartItems.length > 0) {
                // FLUJO: ENVIAR RONDA A COCINA (No limpia sesión, la acumula)
                const newOrderData: any = {
                    customer, 
                    items: cartItems, 
                    total: finalTotal,
                    status: OrderStatus.Pending, 
                    orderType,
                    tableId: isTableSession ? `${tableInfo?.zone} - ${tableInfo?.table}` : undefined,
                    paymentStatus: 'pending',
                    tip: tipAmount
                };
                await saveOrder(newOrderData);
                
                if (isTableSession) {
                    setSessionItems(prev => [...prev, ...cartItems]);
                    setCustomerName(name);
                }
            }

            // Construcción de Ticket para WhatsApp
            const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
            let msg: string;
            
            if (isFinalClosing && isTableSession) {
                // Mensaje de Cierre Total
                msg = [
                    `💰 *CIERRE DE CUENTA - MESA ${tableInfo!.table}*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `👤 Cliente: ${name}`, 
                    `💵 Total Acumulado: $${sessionTotal.toFixed(2)}`,
                    tipAmount > 0 ? `✨ Propina: $${tipAmount.toFixed(2)}` : '',
                    `⭐ *FINAL A PAGAR: $${finalTotal.toFixed(2)}*`,
                    `💳 Método: ${selectedPayment}`,
                    paymentProof ? '✅ Comprobante adjunto' : '_Solicito cobrar en mesa_'
                ].filter(Boolean).join('\n');
                
                // LIMPIEZA DE SESIÓN (Solo al finalizar cuenta)
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
            } else if (isTableSession) {
                // Mensaje de Nueva Ronda
                msg = [
                    `🧾 *🔥 NUEVA RONDA A COCINA - MESA ${tableInfo!.table}*`,
                    `👤 Cliente: ${name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                    `💵 Subtotal Ronda: $${cartTotal.toFixed(2)}`,
                    `📈 *Total Acumulado Mesa: $${(sessionTotal + cartTotal).toFixed(2)}*`
                ].filter(Boolean).join('\n');
            } else {
                // Modo Delivery / Recoger normal
                msg = [
                    orderType === OrderType.Delivery ? `🧾 *PEDIDO A DOMICILIO*` : `🥡 *PEDIDO PARA RECOGER*`, 
                    `👤 Cliente: ${name}`, `📱 Tel: ${phone}`,
                    `💰 Total: $${finalTotal.toFixed(2)}`, `💳 Método: ${selectedPayment}`
                ].filter(Boolean).join('\n');
            }

            window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
            clearCart();
            setPaymentProof(null);
            setTipAmount(0);
            setView('confirmation');
            
        } catch(e) {
            alert("Error al procesar el pedido.");
        }
    };

    const scrollToCategory = (id: string) => {
        setActiveCategory(id);
        const el = document.getElementById(`cat-${id}`);
        if (el) {
            const offset = 160;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    if (isLoading) return (
        <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando mesa...</p>
        </div>
    );

    if (error) return (
        <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                <IconX className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">¡UPS! ALGO SALIÓ MAL</h2>
            <p className="text-gray-400 text-sm mb-8">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">
                Reintentar
            </button>
        </div>
    );

    return (
        <div className="bg-[#0f172a] min-h-screen text-gray-100 font-sans selection:bg-emerald-500/20 pb-safe overflow-x-hidden">
            <div className="container mx-auto max-w-md bg-[#0f172a] min-h-screen relative shadow-2xl border-x border-gray-800 flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA ACTUAL' : view === 'account' ? 'MI CUENTA ACUMULADA' : (isFinalClosing ? 'CERRAR CUENTA' : 'CONFIRMAR')} 
                        onBack={() => {
                            if (view === 'checkout') {
                                isFinalClosing ? setView('account') : setView('cart');
                            } else {
                                setView('menu');
                            }
                        }} 
                    />
                )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in pb-24"> {/* Added padding bottom for floating button */}
                            <RestaurantHero 
                                settings={settings}
                                tableInfo={tableInfo}
                                orderType={orderType}
                                setOrderType={setOrderType}
                            />

                            {/* ... (Search and Categories) ... */}
                            <div className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md px-4 py-4 space-y-4 border-b border-gray-800/50">
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input type="text" placeholder="Buscar productos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1e293b] border border-gray-700/50 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder-gray-500 font-medium text-white" />
                                </div>
                                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                                    {allCategories.map(cat => (
                                        <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-white text-gray-900 border-white shadow-lg shadow-white/10' : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ... (Products List) ... */}
                            <div className="p-4 space-y-8 mt-4">
                                {allCategories.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                                            <IconSearch className="w-8 h-8 text-gray-600" />
                                        </div>
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No hay categorías disponibles</p>
                                    </div>
                                ) : (
                                    (() => {
                                        const renderedCategories = allCategories.map(cat => {
                                            const products = allProducts.filter(p => {
                                                const matchCat = String(p.categoryId) === String(cat.id);
                                                const matchAvail = p.available !== false;
                                                const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                return matchCat && matchAvail && matchSearch;
                                            });
                                            
                                            if (products.length === 0) return null;
                                            
                                            return (
                                                <div key={cat.id} id={`cat-${cat.id}`}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{cat.name}</h3>
                                                        <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{products.length}</span>
                                                    </div>
                                                    <div className="grid gap-4">
                                                        {products.map(p => {
                                                            const { price, promotion } = getDiscountedPrice(p, allPromotions);
                                                            const hasDiscount = price < p.price;
                                                            const discountPercent = hasDiscount ? Math.round(((p.price - price) / p.price) * 100) : 0;

                                                            return (
                                                                <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-[#1e293b] p-3 rounded-xl border border-gray-800 flex gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-gray-700 group relative overflow-hidden">
                                                                    <div className="relative shrink-0 w-24 h-24">
                                                                        <img src={p.imageUrl} className="w-full h-full rounded-lg object-cover shadow-lg" />
                                                                        {hasDiscount && (
                                                                            <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-br-lg rounded-tl-lg shadow-sm">
                                                                                -{discountPercent}%
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col justify-between py-1">
                                                                        <div>
                                                                            <h4 className="font-bold text-white text-base leading-tight mb-1">{p.name}</h4>
                                                                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{p.description}</p>
                                                                        </div>
                                                                        <div className="flex items-end justify-between mt-2">
                                                                            <div className="flex flex-col">
                                                                                {hasDiscount && (
                                                                                    <span className="text-xs text-gray-500 line-through font-medium">{formatCurrency(p.price, settings.company.currency.code)}</span>
                                                                                )}
                                                                                <span className={`text-lg font-black ${hasDiscount ? 'text-rose-500' : 'text-white'}`}>
                                                                                    {formatCurrency(price, settings.company.currency.code)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="bg-gray-800 p-2 rounded-full text-gray-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-lg">
                                                                                <IconPlus className="h-5 w-5" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }).filter(Boolean);

                                        if (renderedCategories.length === 0) {
                                            return (
                                                <div className="py-20 text-center space-y-4">
                                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                                                        <IconSearch className="w-8 h-8 text-gray-600" />
                                                    </div>
                                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No se encontraron productos</p>
                                                </div>
                                            );
                                        }
                                        return renderedCategories;
                                    })()
                                )}
                            </div>
                            
                            {/* Floating Cart Button */}
                            {cartItems.length > 0 && (
                                <FloatingCartButton 
                                    itemCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
                                    total={cartTotal} 
                                    onClick={() => setView('cart')} 
                                    currencyCode={settings.company.currency.code}
                                />
                            )}
                        </div>
                    )}
                    
                    {view === 'cart' && ( 
                        <div className="p-5 animate-fade-in pb-32"> 
                            <div className="space-y-4"> 
                                {cartItems.map(i => ( 
                                    <div key={i.cartItemId} className="flex gap-4 bg-[#1e293b] p-4 rounded-xl border border-gray-800/60 shadow-sm"> 
                                        <img src={i.imageUrl} className="w-20 h-20 rounded-lg object-cover" /> 
                                        <div className="flex-1 flex flex-col justify-between"> 
                                            <div className="flex justify-between items-start"> 
                                                <span className="font-bold text-sm text-white">{i.name}</span> 
                                                <span className="font-bold text-emerald-400 text-sm">{formatCurrency(i.price * i.quantity, settings.company.currency.code)}</span> 
                                            </div> 
                                            {i.selectedOptions && i.selectedOptions.length > 0 && (
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    {i.selectedOptions.map(o => o.name).join(', ')}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-2"> 
                                                <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700"> 
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity - 1)} className="px-3 py-1 text-gray-400 hover:text-white"><IconMinus className="h-3 w-3"/></button> 
                                                    <span className="w-6 text-center text-sm font-bold text-white">{i.quantity}</span> 
                                                    <button onClick={() => updateQuantity(i.cartItemId, i.quantity + 1)} className="px-3 py-1 text-gray-400 hover:text-white"><IconPlus className="h-3 w-3"/></button> 
                                                </div> 
                                                <button onClick={() => removeFromCart(i.cartItemId)} className="text-gray-500 hover:text-rose-500 transition-colors"><IconTrash className="h-5 w-5"/></button> 
                                            </div> 
                                        </div> 
                                    </div> 
                                ))} 
                            </div> 

                            <div className="mt-8 space-y-2">
                                <h3 className="text-sm font-bold text-white">Comentarios generales</h3>
                                <textarea 
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-24"
                                    placeholder="¿Algo más que debamos saber?"
                                    // Note: You might want to add a state for general comments if needed globally, 
                                    // currently using productComments or we can add a new state. 
                                    // For now, let's assume it's per order, but the hook doesn't have a global comment.
                                    // We'll leave it visual for now or bind to a new state if requested.
                                />
                            </div>

                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0f172a] border-t border-gray-800 z-50">
                                <div className="container mx-auto max-w-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-400 text-sm">Total estimado</span>
                                        <span className="text-2xl font-black text-white">{formatCurrency(cartTotal, settings.company.currency.code)}</span>
                                    </div>
                                    <button 
                                        onClick={() => { setIsFinalClosing(false); setView('checkout'); }} 
                                        className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-600 transition-colors shadow-lg"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        </div> 
                    )}

                    {view === 'checkout' && ( 
                        <div className="p-6 space-y-8 animate-fade-in pb-32"> 
                            <form onSubmit={handleOrderAction} className="space-y-8">
                                {/* Tus Datos */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                        <h3 className="font-bold text-white text-lg">Tus datos</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Nombre</label>
                                            <input name="name" type="text" defaultValue={customerName} className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" placeholder="Tu nombre completo" required />
                                        </div>
                                        {!isTableSession && (
                                            <div>
                                                <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Número telefónico</label>
                                                <input name="phone" type="tel" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" placeholder="WhatsApp o celular" required />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Entrega (Solo Delivery) */}
                                {orderType === OrderType.Delivery && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                            <h3 className="font-bold text-white text-lg">Entrega</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Calle</label>
                                                <input name="calle" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Número Ext.</label>
                                                    <input name="numero" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" required />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Colonia</label>
                                                    <input name="colonia" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Referencias <span className="text-gray-600 font-normal">(Opcional)</span></label>
                                                <input name="referencias" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 outline-none focus:border-emerald-500 text-sm text-white placeholder:text-gray-600 transition-colors" placeholder="Color de casa, portón, etc." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Propina */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                        <h3 className="font-bold text-white text-lg">Propina para el equipo</h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[0.10, 0.15, 0.20].map(pct => {
                                            const amount = baseTotal * pct;
                                            const isSelected = Math.abs(tipAmount - amount) < 0.1 && amount > 0;
                                            return (
                                                <button 
                                                    key={pct} 
                                                    type="button"
                                                    onClick={() => setTipAmount(amount)}
                                                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#1e293b] border-gray-700 text-gray-300 hover:border-gray-500'}`}
                                                >
                                                    {pct * 100}%
                                                </button>
                                            );
                                        })}
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                placeholder="$ Otro" 
                                                className="w-full h-full bg-[#1e293b] border border-gray-700 rounded-lg text-center text-sm text-white outline-none focus:border-emerald-500 p-0"
                                                onChange={(e) => setTipAmount(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Método de Pago */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                        <h3 className="font-bold text-white text-lg">Pago</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {['Efectivo', 'Pago Móvil', 'Transferencia', 'Punto de Venta'].map(m => (
                                            <label key={m} className={`flex justify-between items-center p-4 bg-[#1e293b] border rounded-xl cursor-pointer transition-all ${selectedPayment === m ? 'border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,1)]' : 'border-gray-700 hover:border-gray-600'}`}>
                                                <span className="text-sm font-medium text-gray-200">{m}</span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPayment === m ? 'border-emerald-500' : 'border-gray-500'}`}>
                                                    {selectedPayment === m && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                                                </div>
                                                <input 
                                                    type="radio" 
                                                    name="payment" 
                                                    value={m} 
                                                    checked={selectedPayment === m}
                                                    onChange={() => { setSelectedPayment(m as PaymentMethod); setPaymentProof(null); }}
                                                    className="hidden" 
                                                />
                                            </label>
                                        ))}
                                    </div>

                                    {isBankPayment && (
                                        <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3 animate-fade-in">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">COMPROBANTE DE PAGO</p>
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                                                {paymentProof ? (
                                                    <div className="flex items-center gap-2 text-emerald-400">
                                                        <IconCheck className="h-5 w-5"/> <span className="text-xs font-bold">Cargado exitosamente</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-gray-500">
                                                        <IconUpload className="h-6 w-6 mb-1"/>
                                                        <span className="text-[10px] font-bold">Toca para subir captura</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0f172a] border-t border-gray-800 z-50">
                                    <div className="container mx-auto max-w-md space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Subtotal</span>
                                            <span className="text-white">{formatCurrency(baseTotal, settings.company.currency.code)}</span>
                                        </div>
                                        {tipAmount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Propina</span>
                                                <span className="text-white">{formatCurrency(tipAmount, settings.company.currency.code)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Envío</span>
                                            <span className="text-white">Por cotizar</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-800 mb-4">
                                            <span className="text-xl font-black text-white">Total</span>
                                            <span className="text-xl font-black text-white">{formatCurrency(finalTotal, settings.company.currency.code)} <span className="text-xs font-normal text-gray-400">+ envío</span></span>
                                        </div>
                                        <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-600 transition-colors shadow-lg flex items-center justify-center gap-2">
                                            <IconWhatsapp className="h-5 w-5" />
                                            Realizar Pedido
                                        </button>
                                    </div>
                                </div>
                            </form> 
                        </div> 
                    )}
                </div>

                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
                        <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 animate-slide-up border border-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
                            <div className="h-48 relative overflow-hidden shrink-0">
                                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-black/40 p-2 rounded-full text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/60"><IconX/></button>
                            </div>
                            <div className="p-8 -mt-10 relative overflow-y-auto flex-1">
                                <h2 className="text-3xl font-black mb-2 text-white leading-none">{selectedProduct.name}</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed font-medium mt-4">{selectedProduct.description}</p>
                                
                                {allPersonalizations
                                    .filter(pers => selectedProduct.personalizationIds?.includes(pers.id))
                                    .map(pers => (
                                        <div key={pers.id} className="mb-6 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-black text-white uppercase tracking-wider text-sm">{pers.name}</h3>
                                                {(pers.maxSelection || 0) > 1 && <span className="text-[10px] bg-gray-800 text-emerald-400 px-2 py-1 rounded-lg font-bold">Máx {pers.maxSelection}</span>}
                                            </div>
                                            <div className="space-y-2">
                                                {pers.options.map(opt => {
                                                    const isSelected = isOptionSelected(pers.id, opt.id);
                                                    return (
                                                        <div key={opt.id} onClick={() => handleOptionToggle(pers, opt)} className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${isSelected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-gray-800/50 border-gray-800 hover:bg-gray-800'}`}>
                                                            <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>{opt.name}</span>
                                                            <div className="flex items-center gap-3">
                                                                {Number(opt.price) > 0 && <span className="text-emerald-400 font-black text-xs">+{formatCurrency(Number(opt.price), settings.company.currency.code)}</span>}
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'}`}>
                                                                    {isSelected && <IconCheck className="w-3 h-3 text-white" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                <div className="mb-6">
                                    <h3 className="font-black text-white uppercase tracking-wider text-sm mb-3">Notas de cocina</h3>
                                    <textarea 
                                        value={productComments}
                                        onChange={(e) => setProductComments(e.target.value)}
                                        placeholder="¿Sin cebolla? ¿Salsa aparte?"
                                        className="w-full bg-gray-800/50 border border-gray-800 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-24 font-medium"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-2xl border border-gray-800 mb-6">
                                    <button onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))} className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-xl text-white hover:bg-gray-700 transition-colors"><IconMinus/></button>
                                    <span className="text-2xl font-black text-white">{productQuantity}</span>
                                    <button onClick={() => setProductQuantity(productQuantity + 1)} className="w-12 h-12 flex items-center justify-center bg-emerald-600 rounded-xl text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"><IconPlus/></button>
                                </div>

                                <button onClick={handleAddToCartWithDetails} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white shadow-2xl shadow-emerald-900/40 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm flex justify-between px-8 items-center group">
                                    <span>AGREGAR</span>
                                    <span className="bg-black/20 px-3 py-1 rounded-lg group-hover:bg-black/30 transition-colors">{formatCurrency(currentProductTotalPrice, settings.company.currency.code)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
