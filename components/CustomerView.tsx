
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconDuplicate, IconUpload, IconTag } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// Sub-components definitions
const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-bold text-white capitalize">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const ScheduleModal: React.FC<{ isOpen: boolean; onClose: () => void; schedule: Schedule }> = ({ isOpen, onClose, schedule }) => {
    if (!isOpen) return null;
    const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const todayIndex = new Date().getDay(); 
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1; 
    const todayName = daysOrder[adjustedTodayIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div className="bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 bg-gray-800/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Horarios de Atención</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><IconX className="h-5 w-5"/></button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {schedule.days.map((day) => {
                        const isToday = day.day === todayName;
                        return (
                            <div key={day.day} className={`flex justify-between items-center py-3 px-4 rounded-xl mb-2 ${isToday ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-gray-800/50 border border-gray-800'}`}>
                                <span className={`font-medium ${isToday ? 'text-emerald-400' : 'text-gray-300'}`}>
                                    {day.day} {isToday && <span className="text-[10px] ml-2 bg-emerald-500 text-white px-1.5 py-0.5 rounded-full align-middle">HOY</span>}
                                </span>
                                <div className="text-right">
                                    {day.isOpen && day.shifts.length > 0 ? (
                                        day.shifts.map((shift, i) => (
                                            <div key={i} className="text-sm text-gray-200 font-mono">
                                                {shift.start} - {shift.end}
                                            </div>
                                        ))
                                    ) : (
                                        day.isOpen && day.shifts.length === 0 ? (
                                            <span className="text-sm text-emerald-400 font-medium">Abierto 24h</span>
                                        ) : (
                                            <span className="text-sm text-rose-400 font-medium">Cerrado</span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button onClick={onClose} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors border border-gray-700">
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
                    return currentTime >= (startH * 60 + startM) && currentTime < (endH * 60 + endM);
                });
                setIsOpenNow(isOpen);
            }
        } else {
            setIsOpenNow(false);
        }
    }, [currentSchedule]);

    const getShippingCostText = () => {
        if (orderType === OrderType.TakeAway) return "Gratis";
        if (shipping.costType === ShippingCostType.Free) return "Gratis";
        if (shipping.costType === ShippingCostType.Fixed) return `$${shipping.fixedCost?.toFixed(2)}`;
        return "Por definir";
    };

    return (
        <div className="relative">
            <div className="h-48 w-full overflow-hidden relative">
                {branch.coverImageUrl ? (
                    <img src={branch.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
            </div>

            <div className="px-6 relative -mt-16 flex flex-col items-center text-center pb-6 border-b border-gray-800">
                <div className="w-28 h-28 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 relative z-10">
                     <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
                        {branch.logoUrl ? 
                            <img src={branch.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            :
                            <span className="text-2xl font-bold text-emerald-500">{company.name.substring(0,2).toUpperCase()}</span>
                        }
                     </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{company.name}</h1>
                <div className="flex flex-col items-center gap-1 mb-4">
                    <p className="text-sm text-gray-400">{branch.alias}</p>
                    {currentSchedule && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
                            <button onClick={() => setShowSchedule(true)} className={`text-xs font-bold ${isOpenNow ? 'text-emerald-400' : 'text-rose-400'} hover:underline`}>
                                {isOpenNow ? 'Abierto Ahora' : 'Cerrado'}
                            </button>
                        </div>
                    )}
                </div>

                {tableInfo ? (
                    <div className="w-full p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl flex items-center justify-center gap-3">
                        <IconTableLayout className="h-5 w-5 text-emerald-400" />
                        <p className="font-medium text-emerald-200 text-sm">Mesa <span className="font-bold text-white">{tableInfo.table}</span> ({tableInfo.zone})</p>
                    </div>
                ) : (
                    <>
                    <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative mb-4">
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400'}`}>Para recoger</button>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-800 w-full max-w-xs">
                        <div className="text-center px-4">
                            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Entrega</p>
                            <p className="text-white font-medium text-sm">{orderType === OrderType.TakeAway ? `${shipping.pickupTime.min} min` : `${shipping.deliveryTime.min}-${shipping.deliveryTime.max} min`}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Envío</p>
                            <p className="text-white font-medium text-sm">{getShippingCostText()}</p>
                        </div>
                    </div>
                    </>
                )}
            </div>
            {currentSchedule && <ScheduleModal isOpen={showSchedule} onClose={() => setShowSchedule(false)} schedule={currentSchedule} />}
        </div>
    );
};

const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const activePromotions = promotions.filter(p => p.appliesTo === PromotionAppliesTo.AllProducts || p.productIds.includes(product.id));
    if (activePromotions.length === 0) return { price: product.price };
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;
    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === DiscountType.Percentage) currentPrice = product.price * (1 - promo.discountValue / 100);
        else currentPrice = Math.max(0, product.price - promo.discountValue);
        if (currentPrice < bestPrice) { bestPrice = currentPrice; bestPromo = promo; }
    });
    return { price: bestPrice, promotion: bestPromo };
};

const ProductRow: React.FC<{ product: Product; quantityInCart: number; onClick: () => void; currency: string; promotions: Promotion[] }> = ({ product, quantityInCart, onClick, currency, promotions }) => {
    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);
    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 hover:bg-gray-750 transition-all cursor-pointer border border-gray-700 shadow-sm relative overflow-hidden">
            {promotion && (
                <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">OFERTA</div>
            )}
            <div className="relative h-20 w-20 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                {quantityInCart > 0 && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-gray-900">{quantityInCart}</div>
                )}
            </div>
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-gray-100 text-sm">{product.name}</h3>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        {promotion && <span className="text-[10px] text-gray-500 line-through">${product.price.toFixed(2)}</span>}
                        <p className={`font-bold text-sm ${promotion ? 'text-rose-400' : 'text-emerald-400'}`}>${discountedPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-1 rounded-full text-emerald-400"><IconPlus className="h-4 w-4" /></div>
                </div>
            </div>
        </div>
    );
};

const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number, comments?: string, options?: PersonalizationOption[]) => void, 
    onClose: () => void,
    personalizations: Personalization[],
    promotions: Promotion[]
}> = ({product, onAddToCart, onClose, personalizations, promotions}) => {
    const [quantity, setQuantity] = useState(1);
    const [comments, setComments] = useState('');
    const [selectedOptions, setSelectedOptions] = useState<{ [id: string]: PersonalizationOption[] }>({});
    const { price: basePrice } = getDiscountedPrice(product, promotions);

    const handleOptionToggle = (p: Personalization, opt: PersonalizationOption) => {
        setSelectedOptions(prev => {
            const current = prev[p.id] || [];
            if (p.maxSelection === 1) return { ...prev, [p.id]: [opt] };
            const exists = current.some(o => o.id === opt.id);
            if (exists) return { ...prev, [p.id]: current.filter(o => o.id !== opt.id) };
            if (p.maxSelection && current.length >= p.maxSelection) return prev;
            return { ...prev, [p.id]: [...current, opt] };
        });
    };

    // Fix: Explicitly type the reduce function parameters to avoid 'unknown' and operator + errors.
    const totalOptionsPrice = Object.values(selectedOptions).flat().reduce((acc: number, opt: any) => acc + (Number(opt.price) || 0), 0);
    const finalPrice = (basePrice + totalOptionsPrice) * quantity;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white z-10"><IconX className="h-6 w-6" /></button>
                <div className="h-56 w-full flex-shrink-0"><img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" /></div>
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-400 text-sm mb-6">{product.description}</p>
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white text-sm mb-3">{p.name}</h4>
                                <div className="space-y-2">
                                    {p.options.map(opt => {
                                        const isSel = selectedOptions[p.id]?.some(o => o.id === opt.id);
                                        return (
                                            <div key={opt.id} onClick={() => handleOptionToggle(p, opt)} className={`flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer ${isSel ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700'}`}>
                                                <span className="text-sm text-gray-200">{opt.name}</span>
                                                {opt.price > 0 && <span className="text-xs text-emerald-400">+${opt.price.toFixed(2)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} className="w-full mt-6 p-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm" placeholder="Instrucciones especiales..." />
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900 safe-bottom">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-4 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 text-white"><IconMinus className="h-4 w-4"/></button>
                            <span className="font-bold text-white">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 text-white"><IconPlus className="h-4 w-4"/></button>
                        </div>
                        <span className="text-xl font-bold text-white">${finalPrice.toFixed(2)}</span>
                    </div>
                    <button onClick={() => { onAddToCart(product, quantity, comments, Object.values(selectedOptions).flat()); onClose(); }} className="w-full bg-emerald-500 py-4 rounded-xl font-bold text-white shadow-lg">Agregar al pedido</button>
                </div>
            </div>
        </div>
    );
};

const CartSummaryView: React.FC<{
    cartItems: CartItem[], 
    cartTotal: number,
    onUpdateQuantity: (id: string, q: number) => void, 
    onRemoveItem: (id: string) => void,
    onProceed: () => void
}> = ({ cartItems, cartTotal, onUpdateQuantity, onRemoveItem, onProceed }) => {
    if (cartItems.length === 0) return <div className="p-12 text-center text-gray-500">Tu carrito está vacío</div>;
    return (
        <div className="p-4 pb-32 animate-fade-in">
            <div className="space-y-4">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="flex gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover"/>
                        <div className="flex-grow">
                            <div className="flex justify-between"><h3 className="font-bold text-sm text-white">{item.name}</h3><span className="font-bold text-emerald-400 text-sm">${(item.price * item.quantity).toFixed(2)}</span></div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 bg-gray-800 rounded px-1">
                                    <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="p-1 text-gray-400"><IconMinus className="h-3 w-3"/></button>
                                    <span className="text-xs font-bold text-white">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 text-gray-400"><IconPlus className="h-3 w-3"/></button>
                                </div>
                                <button onClick={() => onRemoveItem(item.cartItemId)} className="text-rose-500"><IconTrash className="h-4 w-4"/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-900 border-t border-gray-800 z-30">
                <div className="flex justify-between mb-4"><span className="text-gray-400">Total</span><span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span></div>
                <button onClick={onProceed} className="w-full bg-emerald-500 py-4 rounded-xl font-bold text-white">Continuar al pago</button>
            </div>
        </div>
    );
};

const CheckoutView: React.FC<{ 
    cartTotal: number, 
    onPlaceOrder: (c: Customer, pm: PaymentMethod) => void, 
    orderType: OrderType, 
    settings: AppSettings 
}> = ({ cartTotal, onPlaceOrder, orderType, settings }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [calle, setCalle] = useState('');
    const [numero, setNumero] = useState('');
    const [colonia, setColonia] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('Efectivo');
    const isDelivery = orderType === OrderType.Delivery;

    return (
        <form onSubmit={e => { e.preventDefault(); onPlaceOrder({ name, phone, address: { calle, numero, colonia } }, method); }} className="p-4 space-y-6 pb-32">
            <div className="space-y-4 bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-white border-b border-gray-800 pb-2">Tus Datos</h3>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-800 rounded-xl text-white text-sm" placeholder="Nombre completo" />
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-gray-800 rounded-xl text-white text-sm" placeholder="WhatsApp" />
            </div>
            {isDelivery && (
                <div className="space-y-4 bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
                    <h3 className="font-bold text-white border-b border-gray-800 pb-2">Dirección de Entrega</h3>
                    <input required value={calle} onChange={e => setCalle(e.target.value)} className="w-full p-3 bg-gray-800 rounded-xl text-white text-sm" placeholder="Calle" />
                    <div className="flex gap-4"><input required value={numero} onChange={e => setNumero(e.target.value)} className="flex-1 p-3 bg-gray-800 rounded-xl text-white text-sm" placeholder="Número" /><input required value={colonia} onChange={e => setColonia(e.target.value)} className="flex-1 p-3 bg-gray-800 rounded-xl text-white text-sm" placeholder="Colonia" /></div>
                </div>
            )}
            <div className="space-y-4 bg-gray-800/30 p-5 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-white border-b border-gray-800 pb-2">Método de Pago</h3>
                <div className="grid grid-cols-2 gap-2">
                    {settings.payment.deliveryMethods.map(m => (
                        <button key={m} type="button" onClick={() => setMethod(m)} className={`p-3 rounded-xl border text-xs font-bold ${method === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>{m}</button>
                    ))}
                </div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-900 border-t border-gray-800 z-30">
                <button type="submit" className="w-full bg-green-600 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"><IconWhatsapp className="h-5 w-5" /> Enviar por WhatsApp</button>
            </div>
        </form>
    );
};

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [tableInfo, setTableInfo] = useState<{ table: string, zone: string } | null>(null);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const fetchMenuData = async () => {
        try {
            const [appSettings, promoData, persData, prodData, catData] = await Promise.all([
                getAppSettings(), getPromotions(), getPersonalizations(), getProducts(), getCategories()
            ]);
            setSettings(appSettings); setPromotions(promoData); setPersonalizations(persData);
            setAllProducts(prodData); setAllCategories(catData);
            if (catData.length > 0) setActiveCategory(catData[0].id);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMenuData();
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table'); const zone = params.get('zone');
        if (table && zone) { setTableInfo({ table, zone }); setOrderType(OrderType.DineIn); }
        subscribeToMenuUpdates(fetchMenuData);
        return () => unsubscribeFromChannel();
    }, []);

    const filteredProducts = useMemo(() => 
        allProducts.filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase())), [allProducts, searchTerm]);

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod) => {
        if (!settings) return;
        const newOrder: any = { customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType, tableId: tableInfo ? `${tableInfo.zone} ${tableInfo.table}` : undefined, paymentStatus: 'pending' };
        await saveOrder(newOrder);
        const msg = encodeURIComponent(`Nuevo Pedido de ${customer.name}\n\n${cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}\n\nTotal: $${cartTotal.toFixed(2)}`);
        window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${msg}`, '_blank');
        clearCart(); setView('confirmation');
    };

    if (isLoading || !settings) return <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white"><div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div><p>Sincronizando...</p></div>;

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 font-sans max-w-md mx-auto border-x border-gray-800 selection:bg-emerald-500">
            {view !== 'menu' && <Header title={view === 'cart' ? 'Tu Carrito' : view === 'checkout' ? 'Pago' : 'Confirmación'} onBack={() => setView(view === 'cart' ? 'menu' : view === 'checkout' ? 'cart' : 'menu')} />}
            
            {view === 'menu' && (
                <>
                    <RestaurantHero settings={settings} tableInfo={tableInfo} orderType={orderType} setOrderType={setOrderType} />
                    <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-2 px-4 space-y-3">
                        <div className="relative"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5"/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-800 pl-10 pr-4 py-2 rounded-xl text-sm" placeholder="Buscar plato..." /></div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {allCategories.map(cat => (
                                <button key={cat.id} onClick={() => { setActiveCategory(cat.id); const el = document.getElementById(cat.id); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{cat.name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 space-y-8 pb-32">
                        {allCategories.map(cat => {
                            const products = filteredProducts.filter(p => p.categoryId === cat.id);
                            if (products.length === 0) return null;
                            return (
                                <div key={cat.id} id={cat.id} className="scroll-mt-32">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">{cat.name}<span className="h-1 flex-1 bg-gray-800 rounded-full"></span></h2>
                                    <div className="grid gap-4">{products.map(p => <ProductRow key={p.id} product={p} currency={settings.company.currency.code} promotions={promotions} quantityInCart={cartItems.filter(i => i.id === p.id).reduce((s, i) => s + i.quantity, 0)} onClick={() => setSelectedProduct(p)}/>)}</div>
                                </div>
                            );
                        })}
                    </div>
                    {itemCount > 0 && (
                        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-20">
                            <button onClick={() => setView('cart')} className="w-full bg-emerald-500 py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl animate-slide-up"><span className="flex items-center gap-2"><span className="bg-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{itemCount}</span>Ver Pedido</span><span className="font-bold">${cartTotal.toFixed(2)}</span></button>
                        </div>
                    )}
                </>
            )}

            {view === 'cart' && <CartSummaryView cartItems={cartItems} cartTotal={cartTotal} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onProceed={() => setView('checkout')} />}
            {view === 'checkout' && <CheckoutView cartTotal={cartTotal} onPlaceOrder={handlePlaceOrder} orderType={orderType} settings={settings} />}
            {view === 'confirmation' && (
                <div className="p-12 text-center flex flex-col items-center justify-center h-[80vh] space-y-4">
                    <div className="bg-emerald-500/20 p-6 rounded-full"><IconCheck className="h-12 w-12 text-emerald-500" /></div>
                    <h2 className="text-3xl font-bold">¡Pedido Enviado!</h2>
                    <p className="text-gray-400">Te enviamos a WhatsApp para confirmar los detalles. ¡Gracias por tu compra!</p>
                    <button onClick={() => setView('menu')} className="bg-gray-800 px-8 py-3 rounded-xl font-bold mt-4">Regresar al Menú</button>
                </div>
            )}

            {selectedProduct && <ProductDetailModal product={selectedProduct} personalizations={personalizations.filter(p => p.options.length > 0)} promotions={promotions} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} />}
            <Chatbot />
        </div>
    );
}
