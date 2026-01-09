
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconSearch, IconLocationMarker, IconStore, IconCheck, IconInfo, IconUpload } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

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
    const totalPrice = (product.price + totalOptionsPrice) * quantity;
    const allSelectedOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, val) => acc.concat(val), [] as PersonalizationOption[]);

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20"><IconX className="h-6 w-6" /></button>
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
                    <button onClick={() => { onAddToCart(product, quantity, comments, allSelectedOptions); handleClose(); }} className="w-full font-bold py-4 rounded-xl flex justify-between items-center bg-emerald-600 text-white px-6">
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
        if (!selectedPaymentMethod) return alert("Selecciona método de pago.");
        
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
            const message = encodeURIComponent(`*NUEVO PEDIDO*\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}\nPago: ${selectedPaymentMethod}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error al guardar pedido."); } finally { setIsPlacingOrder(false); }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'menu') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            <header className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-30 shadow-sm border-b dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black dark:text-white uppercase tracking-tighter">{settings?.branch.alias || 'Nuestro Menú'}</h1>
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full"><IconSearch className="h-5 w-5 text-gray-500"/></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Todo</button>
                    {allCategories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{cat.name}</button>)}
                </div>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-3xl p-3 flex gap-4 cursor-pointer border dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <img src={product.imageUrl} className="w-24 h-24 rounded-2xl object-cover" />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <h3 className="font-bold dark:text-white text-sm">{product.name}</h3>
                            <div className="flex justify-between items-end">
                                <span className="font-black text-emerald-600 text-lg">${product.price.toFixed(2)}</span>
                                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-600"><IconPlus className="h-5 w-5"/></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {itemCount > 0 && <button onClick={() => setView('cart')} className="fixed bottom-6 left-6 right-6 bg-emerald-600 text-white p-5 rounded-3xl font-black flex justify-between shadow-2xl z-40 active:scale-95 transition-transform uppercase text-xs tracking-widest"><span>Mi Pedido ({itemCount})</span><span>${cartTotal.toFixed(2)}</span></button>}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={addToCart} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
            <Chatbot />
        </div>
    );

    if (view === 'cart') return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="p-4 bg-white dark:bg-gray-800 flex items-center gap-3 border-b dark:border-gray-700"><button onClick={() => setView('menu')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><IconArrowLeft/></button><h1 className="font-black dark:text-white uppercase tracking-tighter">Tu Pedido</h1></header>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="bg-white dark:bg-gray-800 p-4 rounded-3xl flex gap-4 shadow-sm border dark:border-gray-700">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                        <div className="flex-1">
                            <h4 className="font-bold dark:text-white">{item.name}</h4>
                            <p className="text-emerald-600 font-black">${(item.price * item.quantity).toFixed(2)}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl"><IconMinus className="h-4 w-4"/></button>
                                <span className="font-black dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl"><IconPlus className="h-4 w-4"/></button>
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><IconTrash className="h-5 w-5"/></button>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-2xl rounded-t-[2.5rem]"><button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm">Continuar Pago</button></div>
        </div>
    );

    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        
        // Lógica simplificada: Es digital si NO es Efectivo y NO es Punto de Venta
        const isDigital = selectedPaymentMethod && selectedPaymentMethod !== 'Efectivo' && selectedPaymentMethod !== 'Punto de Venta';

        return (
            <div className="min-h-screen bg-[#0f1115] flex flex-col text-gray-200">
                <header className="p-4 bg-[#1a1c23] flex items-center gap-3 border-b border-gray-800 sticky top-0 z-30">
                    <button onClick={() => setView('cart')} className="p-2 bg-[#2a2e38] rounded-full"><IconArrowLeft/></button>
                    <h1 className="font-black uppercase tracking-tighter">Finalizar Pedido</h1>
                </header>
                
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* TIPO DE ENTREGA */}
                    <div className="bg-[#1a1c23] p-5 rounded-3xl border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">Tipo de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-gray-800 text-gray-600'}`}><IconStore/> Domicilio</button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-gray-800 text-gray-600'}`}><IconLocationMarker/> Para llevar</button>
                        </div>
                    </div>

                    {/* TUS DATOS */}
                    <div className="bg-[#1a1c23] p-5 rounded-3xl border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">Tus Datos</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Tu Nombre Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium" />
                            <input type="tel" placeholder="Tu Teléfono (WhatsApp)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono" />
                            {orderType === OrderType.Delivery && <input type="text" placeholder="Dirección de entrega" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all" />}
                        </div>
                    </div>

                    {/* FORMA DE PAGO */}
                    <div className="bg-[#1a1c23] p-5 rounded-3xl border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">Forma de pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(m => (
                                <button key={m} onClick={() => { setSelectedPaymentMethod(m); setPaymentProof(null); }} className={`p-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${selectedPaymentMethod === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-[#0f1115] border-gray-800 text-gray-600'}`}>{m}</button>
                            ))}
                        </div>

                        {/* ESTA SECCIÓN APARECE OBLIGATORIAMENTE PARA PAGOS DIGITALES */}
                        {isDigital && (
                            <div className="mt-4 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                <div className="p-5 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20">
                                    <div className="flex items-center gap-2 text-emerald-400 font-black text-[9px] uppercase tracking-[0.3em] mb-4"><IconInfo className="h-4 w-4"/> Datos de Pago</div>
                                    <div className="space-y-3 text-sm">
                                        {(selectedPaymentMethod.includes('Móvil') || selectedPaymentMethod.includes('movil')) ? (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800/50 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-emerald-100">{settings?.payment.pagoMovil?.bank || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between border-b border-gray-800/50 pb-2"><span className="text-gray-500">Teléfono:</span> <span className="font-mono font-bold text-emerald-400">{settings?.payment.pagoMovil?.phone || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Cédula/RIF:</span> <span className="font-mono font-bold">{settings?.payment.pagoMovil?.idNumber || 'Ver en WhatsApp'}</span></div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between border-b border-gray-800/50 pb-2"><span className="text-gray-500">Banco:</span> <span className="font-bold text-emerald-100">{settings?.payment.transfer?.bank || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex flex-col gap-1 border-b border-gray-800/50 pb-2"><span className="text-gray-500 text-[10px] uppercase font-bold">Cuenta:</span> <span className="font-mono font-bold text-emerald-400 text-xs break-all">{settings?.payment.transfer?.accountNumber || 'Ver en WhatsApp'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Titular:</span> <span className="font-bold text-emerald-100">{settings?.payment.transfer?.accountHolder || 'Ver en WhatsApp'}</span></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Sube tu captura de pantalla (Obligatorio)</p>
                                    {!paymentProof ? (
                                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-800 rounded-[2rem] bg-[#0f1115] cursor-pointer hover:border-emerald-500 transition-colors group">
                                            <IconUpload className="h-10 w-10 text-gray-700 group-hover:text-emerald-500 mb-3 transition-transform group-hover:-translate-y-1"/>
                                            <span className="text-xs text-gray-600 font-black uppercase tracking-widest">Adjuntar Comprobante</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-2 border-emerald-500 group animate-in zoom-in-95">
                                            <img src={paymentProof} className="w-full h-56 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                            <button onClick={() => setPaymentProof(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-transform"><IconTrash className="h-5 w-5"/></button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[10px] font-black text-center py-2 uppercase tracking-[0.2em]">Comprobante cargado con éxito</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NOTA OPCIONAL */}
                    <div className="bg-[#1a1c23] p-5 rounded-3xl border border-gray-800 shadow-xl space-y-4">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">Nota Adicional (Opcional)</h3>
                        <textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={3} className="w-full p-4 bg-[#0f1115] border border-gray-800 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none text-sm" placeholder="Ej. Por favor picar a la mitad, llamar al llegar..." />
                    </div>
                </div>

                {/* FOOTER TOTAL FIJO */}
                <div className="p-6 bg-[#1a1c23] border-t border-gray-800 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] rounded-t-[2.5rem] space-y-4 z-40">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Total a pagar</span>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handlePlaceOrder} 
                        disabled={isPlacingOrder || (isDigital && !paymentProof)}
                        className={`w-full py-5 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm ${isPlacingOrder || (isDigital && !paymentProof) ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}
                    >
                        {isPlacingOrder ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><IconWhatsapp className="h-6 w-6"/> Enviar Pedido por WhatsApp</>}
                    </button>
                    {isDigital && !paymentProof && <p className="text-[9px] text-center text-red-500 font-bold uppercase animate-pulse">Sube tu comprobante para habilitar el botón</p>}
                </div>
            </div>
        );
    }

    if (view === 'confirmation') return (
        <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce"><IconCheck className="h-12 w-12 text-emerald-600" /></div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">¡LISTO!</h1>
            <p className="mb-10 text-emerald-100 font-bold max-w-xs leading-tight">Tu pedido fue procesado. Te hemos enviado a WhatsApp para que confirmes los detalles finales.</p>
            <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black shadow-2xl hover:bg-emerald-50 transition-all uppercase text-xs tracking-widest">Hacer otro pedido</button>
        </div>
    );
    return null;
}
