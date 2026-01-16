
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconDuplicate, IconUpload } from '../constants';
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
                    {schedule.days.map((day, index) => {
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

    const getShippingCostText = () => {
        if (orderType === OrderType.TakeAway) return "Gratis";
        if (shipping.costType === ShippingCostType.ToBeQuoted) return "Por definir";
        if (shipping.costType === ShippingCostType.Free) return "Gratis";
        if (shipping.costType === ShippingCostType.Fixed) {
             const cost = shipping.fixedCost != null ? shipping.fixedCost : 0;
             return `$${cost.toFixed(2)}`;
        }
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
                            <img src={branch.logoUrl} alt={`${company.name} logo`} className="w-full h-full object-cover" />
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
                    <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative mb-4 shadow-inner">
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-transform duration-300 ease-out ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400'}`}>Para recoger</button>
                    </div>
                    </>
                )}
            </div>
            {currentSchedule && <ScheduleModal isOpen={showSchedule} onClose={() => setShowSchedule(false)} schedule={currentSchedule} />}
        </div>
    );
};

const ProductRow: React.FC<{ product: Product; quantityInCart: number; onClick: () => void; currency: string; promotions: Promotion[] }> = ({ product, quantityInCart, onClick, currency, promotions }) => {
    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);
    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 border border-gray-700 hover:bg-gray-750 transition-all cursor-pointer group">
            <div className="relative h-24 w-24 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                {quantityInCart > 0 && <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">{quantityInCart}</div>}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h3 className="font-bold text-gray-100 leading-tight">{product.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">{product.description}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <p className="font-bold text-white">{currency} ${discountedPrice.toFixed(2)}</p>
                    <div className="bg-gray-700 p-1.5 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <IconPlus className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        return p.appliesTo === PromotionAppliesTo.AllProducts || p.productIds.includes(product.id);
    });
    if (activePromotions.length === 0) return { price: product.price };
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;
    activePromotions.forEach(promo => {
        let currentPrice = promo.discountType === DiscountType.Percentage ? product.price * (1 - promo.discountValue / 100) : Math.max(0, product.price - promo.discountValue);
        if (currentPrice < bestPrice) { bestPrice = currentPrice; bestPromo = promo; }
    });
    return { price: bestPrice, promotion: bestPromo };
};

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [generalComments, setGeneralComments] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [app, promos, pers, prods, cats] = await Promise.all([getAppSettings(), getPromotions(), getPersonalizations(), getProducts(), getCategories()]);
                setSettings(app); setAllPromotions(promos); setAllPersonalizations(pers); setAllProducts(prods); setAllCategories(cats);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchData();
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        if (params.get('table')) { setTableInfo({ table: params.get('table')!, zone: params.get('zone')! }); setOrderType(OrderType.DineIn); }
    }, []);

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tip: number = 0, proof: string | null = null) => {
        if (!settings) return;
        const shipping = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (Number(settings.shipping.fixedCost) || 0) : 0;
        const total = cartTotal + shipping + tip;
        
        await saveOrder({ customer, items: cartItems, total, status: OrderStatus.Pending, branchId: 'main', generalComments: generalComments + (tip > 0 ? ` | Propina: $${tip.toFixed(2)}` : ''), orderType, tableId: tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined, paymentProof: proof || undefined });

        // TICKET WHATSAPP
        const line = "━━━━━━━━━━━━━━━━━━━━";
        const itemsText = cartItems.map(i => `▪️ ${i.quantity}x ${i.name}${i.selectedOptions?.map(o => `\n   + ${o.name}`).join('') || ''}`).join('\n');
        const messageParts = [
            `🧾 *RECIBO DE PEDIDO*`, `📍 *${settings.company.name}*`, line,
            `👤 Cliente: ${customer.name}`,
            `🏷️ Tipo: ${orderType}${tableInfo ? ` (Mesa ${tableInfo.table})` : ''}`,
            orderType === OrderType.Delivery ? `📍 Dir: ${customer.address.calle} #${customer.address.numero}, ${customer.address.colonia}` : '',
            line, `🛒 *DETALLE:*`, itemsText, line,
            `💰 *RESUMEN:*`, `Subtotal: $${cartTotal.toFixed(2)}`,
            shipping > 0 ? `Envío: $${shipping.toFixed(2)}` : '',
            tip > 0 ? `Propina: $${tip.toFixed(2)}` : '',
            `*TOTAL: $${total.toFixed(2)}*`,
            line, `💳 Pago: ${paymentMethod}`, `✅ Estado: PENDIENTE`
        ];

        // LIMPIEZA DE NÚMERO (Solo dígitos)
        const rawNumber = settings.branch.whatsappNumber || '';
        const cleanPhone = rawNumber.replace(/\D/g, ''); 
        
        const whatsappMessage = encodeURIComponent(messageParts.filter(p => p).join('\n'));
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;
        
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            window.location.href = whatsappUrl;
        }
        setView('confirmation');
    };

    if (isLoading || !settings) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Cargando...</div>;

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 pb-24">
            {view !== 'menu' && <Header title={view === 'cart' ? 'Tu Pedido' : 'Cierre'} onBack={() => setView('menu')} />}
            {view === 'menu' && (
                <>
                    <RestaurantHero settings={settings} tableInfo={tableInfo} orderType={orderType} setOrderType={setOrderType} />
                    <div className="p-4 space-y-4">
                        {allCategories.map(cat => (
                            <div key={cat.id}>
                                <h2 className="text-xl font-bold mb-3">{cat.name}</h2>
                                <div className="grid gap-3">
                                    {allProducts.filter(p => p.categoryId === cat.id && p.available).map(prod => (
                                        <ProductRow key={prod.id} product={prod} quantityInCart={cartItems.find(i => i.id === prod.id)?.quantity || 0} onClick={() => setSelectedProduct(prod)} currency={settings.company.currency.code} promotions={allPromotions} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {view === 'cart' && <CartSummaryView cartItems={cartItems} cartTotal={cartTotal} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} generalComments={generalComments} onGeneralCommentsChange={setGeneralComments} onProceedToCheckout={() => setView('checkout')} />}
            {view === 'checkout' && <CheckoutView cartTotal={cartTotal} onPlaceOrder={handlePlaceOrder} settings={settings} orderType={orderType} />}
            {view === 'confirmation' && <OrderConfirmation onNewOrder={() => { clearCart(); setView('menu'); }} settings={settings} />}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={(p, q, c, o) => { addToCart(p, q, c, o); setSelectedProduct(null); }} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
            {view === 'menu' && itemCount > 0 && <FooterBar itemCount={itemCount} cartTotal={cartTotal} onViewCart={() => setView('cart')} />}
        </div>
    );
}

const FooterBar: React.FC<{ itemCount: number, cartTotal: number, onViewCart: () => void }> = ({ itemCount, cartTotal, onViewCart }) => (
    <footer className="fixed bottom-4 left-4 right-4 z-20">
        <button onClick={onViewCart} className="w-full bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl">
            <div className="flex items-center gap-3"><div className="bg-emerald-700/50 px-3 py-1 rounded-lg">{itemCount}</div><span>Ver Pedido</span></div>
            <span className="text-lg">${cartTotal.toFixed(2)}</span>
        </button>
    </footer>
);

function OrderConfirmation({ onNewOrder, settings }: any) {
    return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-[70vh]">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"><IconCheck className="w-10 h-10 text-emerald-500"/></div>
            <h3 className="text-2xl font-bold mb-2">¡Pedido Enviado!</h3>
            <p className="text-gray-400 mb-8">Te redirigimos a WhatsApp para confirmar.</p>
            <button onClick={onNewOrder} className="w-full max-w-xs bg-gray-800 py-4 rounded-xl font-bold">Volver al Inicio</button>
        </div>
    );
}

const CartSummaryView: React.FC<any> = ({ cartItems, cartTotal, onUpdateQuantity, onRemoveItem, generalComments, onGeneralCommentsChange, onProceedToCheckout }) => (
    <div className="p-4 space-y-4">
        {cartItems.map((item: any) => (
            <div key={item.cartItemId} className="flex gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover"/>
                <div className="flex-grow flex flex-col justify-between">
                    <div className="flex justify-between">
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="font-bold text-emerald-400">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-2 border border-gray-700">
                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="p-1"><IconMinus className="h-4 w-4"/></button>
                            <span className="font-bold">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="p-1"><IconPlus className="h-4 w-4"/></button>
                        </div>
                        <button onClick={() => onRemoveItem(item.cartItemId)} className="text-gray-500"><IconTrash className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
        ))}
        <div className="pt-4"><button onClick={onProceedToCheckout} className="w-full bg-emerald-500 py-4 rounded-xl font-bold">Continuar (${cartTotal.toFixed(2)})</button></div>
    </div>
);

const CheckoutView: React.FC<any> = ({ cartTotal, onPlaceOrder, settings, orderType }) => {
    const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '' } });
    const availableMethods = orderType === OrderType.Delivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods;
    const [method, setMethod] = useState(availableMethods[0] || 'Efectivo');
    
    return (
        <form onSubmit={e => { e.preventDefault(); onPlaceOrder(customer, method); }} className="p-4 space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-800 space-y-4">
                <h3 className="font-bold text-lg">Tus Datos</h3>
                <input type="text" placeholder="Nombre completo" required className="w-full p-3 bg-gray-700 rounded-xl outline-none" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                <input type="tel" placeholder="Número de WhatsApp" required className="w-full p-3 bg-gray-700 rounded-xl outline-none" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-green-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2"><IconWhatsapp/> Realizar Pedido</button>
        </form>
    );
};

const ProductDetailModal: React.FC<any> = ({ product, onAddToCart, onClose, personalizations, promotions }) => {
    const [quantity, setQuantity] = useState(1);
    const { price } = getDiscountedPrice(product, promotions);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 w-full max-w-md rounded-t-3xl p-6 space-y-6" onClick={e => e.stopPropagation()}>
                <img src={product.imageUrl} className="w-full h-48 object-cover rounded-2xl mb-4" />
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 bg-gray-800 rounded-full px-4 py-2">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><IconMinus/></button>
                        <span className="font-bold text-xl">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)}><IconPlus/></button>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">${(price * quantity).toFixed(2)}</p>
                </div>
                <button onClick={() => onAddToCart(product, quantity)} className="w-full bg-emerald-500 py-4 rounded-xl font-bold">Agregar al Pedido</button>
            </div>
        </div>
    );
};
