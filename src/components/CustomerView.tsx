
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload } from '../constants';
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
        setTimeout(onClose, 300);
    };

    const { price: basePrice, promotion } = getDiscountedPrice(product, promotions);

    const handleOptionToggle = (personalization: Personalization, option: PersonalizationOption) => {
        setSelectedOptions(prev => {
            const currentSelection = prev[personalization.id] || [];
            const isSelected = currentSelection.some(opt => opt.id === option.id);
            if (personalization.maxSelection === 1) return { ...prev, [personalization.id]: [option] };
            if (isSelected) return { ...prev, [personalization.id]: currentSelection.filter(opt => opt.id !== option.id) };
            if (personalization.maxSelection && currentSelection.length >= personalization.maxSelection) return prev;
            return { ...prev, [personalization.id]: [...currentSelection, option] };
        });
    };

    const isOptionSelected = (pid: string, oid: string) => selectedOptions[pid]?.some(o => o.id === oid);
    const totalOptionsPrice = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, options) => acc + options.reduce((sum, opt) => sum + (opt.price || 0), 0), 0);
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;
    const allSelectedOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, val) => acc.concat(val), [] as PersonalizationOption[]);

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white z-20"><IconX className="h-6 w-6" /></button>
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl" />
                     <div className="absolute bottom-0 left-0 p-6 w-full text-white bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-3xl font-bold">{product.name}</h2>
                     </div>
                </div>
                <div className="p-6 flex-grow overflow-y-auto bg-white dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{product.description}</p>
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                <h4 className="font-bold mb-3">{p.name}</h4>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => (
                                        <div key={opt.id} onClick={() => handleOptionToggle(p, opt)} className={`flex justify-between p-3 rounded-lg border cursor-pointer ${isOptionSelected(p.id, opt.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <span>{opt.name}</span>
                                            {opt.price > 0 && <span className="text-emerald-600 font-bold">+${opt.price.toFixed(2)}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pb-24">
                        <label className="block text-sm font-bold text-gray-500 mb-2">NOTAS ADICIONALES</label>
                        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 dark:text-white" placeholder="Ej. Sin cebolla..." />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 absolute bottom-0 w-full shadow-lg">
                    <button onClick={() => { onAddToCart({ ...product, price: basePrice }, quantity, comments, allSelectedOptions); handleClose(); }} className="w-full font-bold py-4 rounded-xl flex justify-between items-center bg-emerald-600 text-white px-6">
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
        if (!selectedPaymentMethod) return alert("Selecciona un método de pago.");
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
                tableId: tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
                generalComments,
                paymentStatus: 'pending',
                paymentProof: paymentProof || undefined,
            });
            const message = encodeURIComponent(`*NUEVO PEDIDO*\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}\nPago: ${selectedPaymentMethod}${paymentProof ? '\n✅ Comprobante adjunto' : ''}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error al guardar pedido."); } finally { setIsPlacingOrder(false); }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            <header className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-30 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold dark:text-white">{settings?.branch.alias || 'Nuestro Menú'}</h1>
                    <IconSearch className="h-6 w-6 text-gray-400"/>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex gap-4 cursor-pointer border dark:border-gray-700 shadow-sm">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-xl object-cover" />
                        <div className="flex-1 flex flex-col justify-between">
                            <h3 className="font-bold dark:text-white">{product.name}</h3>
                            <p className="text-emerald-600 font-bold">${product.price.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && <button onClick={() => setView('cart')} className="fixed bottom-4 left-4 right-4 bg-emerald-600 text-white p-4 rounded-2xl font-bold flex justify-between shadow-xl"><span>Ver pedido ({itemCount})</span><span>${cartTotal.toFixed(2)}</span></button>}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={addToCart} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="p-4 bg-white dark:bg-gray-800 flex items-center gap-3"><button onClick={() => setView('menu')}><IconArrowLeft/></button><h1 className="font-bold dark:text-white">Tu Carrito</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex gap-4 shadow-sm">
                        <img src={item.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1">
                            <h4 className="font-bold dark:text-white">{item.name}</h4>
                            <p className="text-emerald-600 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="p-1 bg-gray-100 dark:bg-gray-700 rounded"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-bold dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 bg-emerald-100 text-emerald-700 rounded"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)}><IconTrash className="h-5 w-5 text-gray-400"/></button>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-xl"><button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg">Continuar Pedido</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        
        // Función para saber si el método es digital y requiere comprobante
        const isDigitalPayment = (method: string) => {
            const m = method.toLowerCase();
            return m.includes('móvil') || m.includes('pago movil') || m.includes('transferencia') || m.includes('zelle');
        };

        return (
            <div className="min-h-screen bg-[#1a1c23] flex flex-col text-gray-200">
                <header className="p-4 bg-[#242631] flex items-center gap-3 border-b border-gray-700">
                    <button onClick={() => setView('cart')}><IconArrowLeft/></button>
                    <h1 className="font-bold">Finalizar Pedido</h1>
                </header>
                
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* TIPO DE ENTREGA */}
                    <div className="bg-[#242631] p-5 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Tipo de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-700 text-gray-500'}`}><IconStore/> Domicilio</button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-700 text-gray-500'}`}><IconLocationMarker/> Para llevar</button>
                        </div>
                    </div>

                    {/* TUS DATOS */}
                    <div className="bg-[#242631] p-5 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Tus Datos</h3>
                        <input type="text" placeholder="Tu Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#1a1c23] border border-gray-700 rounded-xl outline-none focus:border-emerald-500 transition-all" />
                        <input type="tel" placeholder="Tu Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#1a1c23] border border-gray-700 rounded-xl outline-none focus:border-emerald-500 transition-all" />
                        {orderType === OrderType.Delivery && <input type="text" placeholder="Dirección Completa" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#1a1c23] border border-gray-700 rounded-xl outline-none focus:border-emerald-500 transition-all" />}
                    </div>

                    {/* FORMA DE PAGO */}
                    <div className="bg-[#242631] p-5 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Forma de pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(m => (
                                <button key={m} onClick={() => { setSelectedPaymentMethod(m); setPaymentProof(null); }} className={`p-4 rounded-xl border font-bold transition-all ${selectedPaymentMethod === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-[#1a1c23] border-gray-700 text-gray-400'}`}>{m}</button>
                            ))}
                        </div>

                        {/* DETALLES DE PAGO DINÁMICOS */}
                        {selectedPaymentMethod && isDigitalPayment(selectedPaymentMethod) && (
                            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="p-4 bg-[#1a1c23] rounded-2xl border border-emerald-500/30">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-3"><IconInfo className="h-4 w-4"/> Datos bancarios</div>
                                    <div className="space-y-2 text-sm">
                                        {(selectedPaymentMethod.toLowerCase().includes('móvil') || selectedPaymentMethod.toLowerCase().includes('pago movil')) ? (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800 pb-1"><span className="text-gray-500">Banco:</span> <span className="font-bold">{settings?.payment.pagoMovil?.bank || 'Ver WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800 pb-1"><span className="text-gray-500">Teléfono:</span> <span className="font-mono font-bold text-emerald-400">{settings?.payment.pagoMovil?.phone || 'Ver WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800 pb-1"><span className="text-gray-500">Cédula/RIF:</span> <span className="font-mono font-bold">{settings?.payment.pagoMovil?.idNumber || 'Ver WhatsApp'}</span></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800 pb-1"><span className="text-gray-500">Banco:</span> <span className="font-bold">{settings?.payment.transfer?.bank || 'Ver WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 border-b border-gray-800 pb-1"><span className="text-gray-500 text-xs">Cuenta:</span> <span className="font-mono font-bold break-all text-emerald-400 text-xs">{settings?.payment.transfer?.accountNumber || 'Ver WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span> <span className="font-bold">{settings?.payment.transfer?.accountHolder || 'Ver WhatsApp'}</span></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sube tu comprobante (Capture)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-2xl bg-[#1a1c23] cursor-pointer hover:border-emerald-500 transition-colors group">
                                            <IconUpload className="h-8 w-8 text-gray-500 group-hover:text-emerald-500 mb-2"/>
                                            <span className="text-sm text-gray-500 font-bold uppercase tracking-tighter">Adjuntar imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-emerald-500 group">
                                            <img src={paymentProof} className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg"><IconX className="h-4 w-4"/></button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[10px] font-black text-center py-1 uppercase">Imagen cargada con éxito</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NOTA PARA EL RESTAURANTE */}
                    <div className="bg-[#242631] p-5 rounded-2xl border border-gray-700 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Nota para el restaurante (Opcional)</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={3} className="w-full p-4 bg-[#1a1c23] border border-gray-700 rounded-xl outline-none focus:border-emerald-500 transition-all resize-none" placeholder="Ej. Por favor picar a la mitad, sin cubiertos..." />
                    </div>
                </div>

                {/* FOOTER TOTAL */}
                <div className="p-6 bg-[#242631] border-t border-gray-700 shadow-2xl rounded-t-3xl">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Total a pagar</span>
                        <span className="text-3xl font-black text-emerald-500">${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder}
                        className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
                    >
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> Confirmar por WhatsApp</>}
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce"><IconCheck className="h-10 w-10 text-emerald-600" /></div>
            <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter">¡Pedido Enviado!</h1>
            <p className="mb-10 text-emerald-100">Serás redirigido a WhatsApp para finalizar la comunicación.</p>
            <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-bold shadow-lg">Hacer otro pedido</button>
        </div>
    );
    return null;
}
