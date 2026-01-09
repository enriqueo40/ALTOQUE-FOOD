
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconInfo, IconUpload } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Helper Functions ---

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const applicablePromo = promotions.find(p => {
        const now = new Date();
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.endDate ? new Date(p.endDate) : null;
        if(end) end.setHours(23,59,59);
        
        if (start && now < start) return false;
        if (end && now > end) return false;

        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds.includes(product.id);
    });

    if (!applicablePromo) return { price: product.price, promotion: null };

    let discount = 0;
    if (applicablePromo.discountType === DiscountType.Percentage) {
        discount = product.price * (applicablePromo.discountValue / 100);
    } else {
        discount = applicablePromo.discountValue;
    }
    
    return { price: Math.max(0, product.price - discount), promotion: applicablePromo };
};

// --- Sub-Components ---

const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number, comments?: string, options?: PersonalizationOption[]) => void, 
    onClose: () => void,
    personalizations: Personalization[],
    promotions: Promotion[]
}> = ({product, onAddToCart, onClose, personalizations, promotions}) => {
    const [quantity, setQuantity] = useState(1);
    const [comments, setComments] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<{ [personalizationId: string]: PersonalizationOption[] }>({});

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for animation
    };

    const { price: basePrice, promotion } = getDiscountedPrice(product, promotions);

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
        return selectedOptions[pid]?.some(o => o.id === oid);
    };

    const totalOptionsPrice = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, options) => acc + options.reduce((sum, opt) => sum + (opt.price || 0), 0), 0);
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;
    
    const allSelectedOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, val) => acc.concat(val), [] as PersonalizationOption[]);

    const handleAdd = () => {
        onAddToCart({ ...product, price: basePrice }, quantity, comments, allSelectedOptions);
        handleClose();
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20 backdrop-blur-md transition-colors">
                    <IconX className="h-6 w-6" />
                </button>
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute bottom-0 left-0 p-6 w-full text-white bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-3xl font-bold">{product.name}</h2>
                     </div>
                </div>

                <div className="p-6 flex-grow overflow-y-auto bg-white dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{product.description}</p>
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h4 className="font-bold mb-3">{p.name}</h4>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => (
                                        <div key={opt.id} onClick={() => handleOptionToggle(p, opt)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isOptionSelected(p.id, opt.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <span className="text-sm font-medium">{opt.name}</span>
                                            {opt.price > 0 && <span className="text-emerald-600 font-bold">+${opt.price.toFixed(2)}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pb-20">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Instrucciones especiales</label>
                        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 dark:text-white" placeholder="Ej. Sin cebolla..." />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 absolute bottom-0 w-full z-20">
                    <button onClick={handleAdd} className="w-full font-bold py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex justify-between items-center transition-all active:scale-95">
                        <span>Agregar al pedido</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main View Component ---

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
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    
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
            const reader = new FileReader();
            reader.onload = (event) => setPaymentProof(event.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) return alert("Completa tus datos.");
        if (orderType === OrderType.Delivery && !customerAddress.calle) return alert("Ingresa tu dirección.");
        if (!selectedPaymentMethod) return alert("Selecciona forma de pago.");

        setIsPlacingOrder(true);
        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        const finalTotal = cartTotal + shippingCost;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer: { name: customerName, phone: customerPhone, address: customerAddress },
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main',
            orderType,
            tableId: tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
            generalComments,
            paymentStatus: 'pending',
            paymentProof: paymentProof || undefined,
        };

        try {
            await saveOrder(newOrder);
            const line = "━━━━━━━━━━━━━━━━━━━━";
            const messageParts = [
                `*NUEVO PEDIDO WEB* 🛵`,
                line,
                `*Cliente:* ${customerName}`,
                `*Teléfono:* ${customerPhone}`,
                orderType === OrderType.Delivery ? `*Dirección:* ${customerAddress.calle} #${customerAddress.numero}` : `*Tipo:* Para recoger`,
                line,
                `*DETALLE:*`,
                ...cartItems.map(i => `- ${i.quantity}x ${i.name}`),
                line,
                `*TOTAL:* ${settings.company.currency.code} ${finalTotal.toFixed(2)}`,
                `*Pago:* ${selectedPaymentMethod}`,
                paymentProof ? `✅ _Comprobante adjunto_` : ''
            ].filter(Boolean);

            const message = encodeURIComponent(messageParts.join('\n'));
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error al procesar pedido."); } finally { setIsPlacingOrder(false); }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
            <header className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-30 shadow-sm">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tighter">{settings?.branch.alias || 'Nuestro Menú'}</h1>
                    <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><IconSearch className="h-5 w-5"/></button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                    const { price, promotion } = getDiscountedPrice(product, allPromotions);
                    return (
                        <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-3xl p-3 flex gap-4 cursor-pointer border dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
                            <div className="relative w-28 h-28 shrink-0 overflow-hidden rounded-2xl">
                                <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                {promotion && <div className="absolute top-0 left-0 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-br-lg">OFERTA</div>}
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h3 className="font-bold dark:text-white leading-tight">{product.name}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="font-black text-emerald-600 text-lg">${price.toFixed(2)}</span>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600"><IconPlus className="h-5 w-5"/></div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {itemCount > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-40 max-w-lg mx-auto">
                    <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white py-4 rounded-3xl font-black shadow-2xl flex justify-between px-8 hover:bg-emerald-700 transition-all active:scale-95">
                        <span className="uppercase tracking-widest text-xs flex items-center gap-2"><IconStore className="h-4 w-4"/> Ver pedido ({itemCount})</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={addToCart} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="p-4 bg-white dark:bg-gray-800 flex items-center gap-3 border-b dark:border-gray-700 shadow-sm">
                <button onClick={() => setView('menu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><IconArrowLeft/></button>
                <h1 className="font-black dark:text-white uppercase tracking-tighter">Tu Pedido</h1>
            </header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-white dark:bg-gray-800 p-4 rounded-3xl flex gap-4 shadow-sm border dark:border-gray-700">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                        <div className="flex-1">
                            <h4 className="font-bold dark:text-white leading-tight">{item.name}</h4>
                            <p className="text-emerald-600 font-black text-sm mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 self-start text-gray-300 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-2xl rounded-t-3xl">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Total Estimado</span>
                    <span className="text-2xl font-black dark:text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-sm">Continuar</button>
            </div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pb-20">
                <header className="p-4 bg-white dark:bg-gray-800 flex items-center gap-3 border-b dark:border-gray-700 sticky top-0 z-30">
                    <button onClick={() => setView('cart')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><IconArrowLeft/></button>
                    <h1 className="font-black dark:text-white uppercase tracking-tighter">Finalizar Pedido</h1>
                </header>
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* Customer Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 space-y-4">
                        <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest border-b dark:border-gray-700 pb-3">1. Datos del Cliente</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white" />
                            <input type="tel" placeholder="Número de WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white" />
                        </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 space-y-4">
                        <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest border-b dark:border-gray-700 pb-3">2. Forma de Entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 font-bold' : 'dark:border-gray-700 dark:text-gray-400'}`}><IconStore/> Domicilio</button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 font-bold' : 'dark:border-gray-700 dark:text-gray-400'}`}><IconLocationMarker/> Para llevar</button>
                        </div>
                        {orderType === OrderType.Delivery && (
                            <input type="text" placeholder="Dirección Exacta (Calle, Nro, Sector)" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white mt-3" />
                        )}
                    </div>

                    {/* Payment Method - MEJORADO */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 space-y-4">
                        <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest border-b dark:border-gray-700 pb-3">3. Forma de Pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(m => (
                                <button key={m} onClick={() => { setSelectedPaymentMethod(m); setPaymentProof(null); }} className={`p-3 rounded-xl border text-xs font-black uppercase transition-all ${selectedPaymentMethod === m ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-400'}`}>{m}</button>
                            ))}
                        </div>

                        {/* SECCIÓN DE DATOS BANCARIOS CONDICIONALES */}
                        {selectedPaymentMethod === 'Pago Móvil' && settings?.payment.pagoMovil && (
                            <div className="mt-4 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-3">
                                    <IconInfo className="h-4 w-4"/> Datos de Pago Móvil
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1"><span className="text-gray-500">Banco:</span> <span className="font-bold dark:text-white">{settings.payment.pagoMovil.bank}</span></div>
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1"><span className="text-gray-500">Teléfono:</span> <span className="font-black dark:text-white font-mono">{settings.payment.pagoMovil.phone}</span></div>
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1"><span className="text-gray-500">Cédula/RIF:</span> <span className="font-black dark:text-white font-mono">{settings.payment.pagoMovil.idNumber}</span></div>
                                </div>
                            </div>
                        )}

                        {selectedPaymentMethod === 'Transferencia' && settings?.payment.transfer && (
                            <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest mb-3">
                                    <IconInfo className="h-4 w-4"/> Datos para Transferencia
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1"><span className="text-gray-500">Banco:</span> <span className="font-bold dark:text-white">{settings.payment.transfer.bank}</span></div>
                                    <div className="flex flex-col gap-1 border-b dark:border-gray-800 pb-1 mt-1">
                                        <span className="text-[10px] text-gray-500 uppercase font-black">Número de Cuenta:</span>
                                        <span className="font-mono text-xs font-black dark:text-white break-all">{settings.payment.transfer.accountNumber}</span>
                                    </div>
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1 mt-1"><span className="text-gray-500">Titular:</span> <span className="font-bold dark:text-white">{settings.payment.transfer.accountHolder}</span></div>
                                    <div className="flex justify-between border-b dark:border-gray-800 pb-1"><span className="text-gray-500">Rif:</span> <span className="font-black dark:text-white font-mono">{settings.payment.transfer.idNumber}</span></div>
                                </div>
                            </div>
                        )}

                        {/* ÁREA DE CARGA DE COMPROBANTE PARA PAGOS DIGITALES */}
                        {selectedPaymentMethod && selectedPaymentMethod !== 'Efectivo' && selectedPaymentMethod !== 'Punto de Venta' && (
                            <div className="mt-4 pt-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sube tu captura de pantalla</p>
                                {!paymentProof ? (
                                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-emerald-500 transition-all group overflow-hidden">
                                        <div className="flex flex-col items-center justify-center py-5">
                                            <IconUpload className="h-8 w-8 text-gray-400 group-hover:text-emerald-500 mb-2 transition-colors"/>
                                            <p className="text-xs font-black text-gray-500 dark:text-gray-400 group-hover:text-emerald-600">ADJUNTAR COMPROBANTE</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                    </label>
                                ) : (
                                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/50 h-44 animate-in zoom-in-95 duration-300">
                                        <img src={paymentProof} className="w-full h-full object-cover" />
                                        <button onClick={() => setPaymentProof(null)} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><IconTrash className="h-5 w-5"/></button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[10px] font-black text-center py-2 uppercase tracking-tighter">Imagen Cargada Correctamente</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
                        <label className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest block mb-4 border-b dark:border-gray-700 pb-3">Nota Opcional</label>
                        <textarea value={generalComments} onChange={e => setGeneralComments(e.target.value)} placeholder="Ej. Sin cubiertos, llamar al llegar..." className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 resize-none h-24 dark:text-white" />
                    </div>
                </div>

                {/* Footer Flotante de Total */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.2)] rounded-t-[2.5rem] space-y-4 z-40">
                    <div className="flex justify-between items-center text-xl font-black dark:text-white">
                        <span className="uppercase text-xs tracking-widest text-gray-400">Total a Pagar</span>
                        <span className="text-emerald-600 text-2xl">${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    <button onClick={handlePlaceOrder} disabled={isPlacingOrder} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> Enviar Pedido</>}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-700">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce"><IconCheck className="h-14 w-14 text-emerald-600" /></div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">¡LISTO!</h1>
            <p className="mb-12 text-emerald-100 font-bold leading-tight max-w-xs mx-auto">Tu pedido fue enviado correctamente. Serás redirigido a WhatsApp para que el restaurante confirme tu recepción.</p>
            <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-emerald-50 transition-all active:scale-95 uppercase tracking-widest text-xs">Volver al Menú</button>
        </div>
    );
    return null;
}
