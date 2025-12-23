
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
// Corrección de importación: Se agrega IconDelivery y IconReceipt
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown, IconDelivery, IconReceipt } from '../constants';
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
    
    // Form States
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState({ colonia: '', calle: '', numero: '', referencias: '' });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
    const [generalComments, setGeneralComments] = useState('');

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const fetchMenuData = useCallback(async () => {
        try {
            const [appSettings, fetchedPromotions, fetchedPersonalizations, fetchedProducts, fetchedCategories] = await Promise.all([
                getAppSettings(),
                getPromotions(),
                getPersonalizations(),
                getProducts(),
                getCategories()
            ]);
            setSettings(appSettings);
            setAllPromotions(fetchedPromotions);
            setAllPersonalizations(fetchedPersonalizations);
            setAllProducts(fetchedProducts);
            setAllCategories(fetchedCategories);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenuData();
        // Sincronización Realtime: Cuando el admin cambia app_settings, el cliente actualiza costos de envío.
        subscribeToMenuUpdates(fetchMenuData);
        return () => { unsubscribeFromChannel(); };
    }, [fetchMenuData]);

    const shippingCost = useMemo(() => {
        if (!settings || orderType !== OrderType.Delivery) return 0;
        if (settings.shipping.costType === ShippingCostType.Fixed) {
            return settings.shipping.fixedCost || 0;
        }
        return 0;
    }, [settings, orderType]);

    const handlePlaceOrder = async () => {
        if (!settings) return;
        if (!customerName || !customerPhone) { alert("Completa tus datos básicos."); return; }
        if (orderType === OrderType.Delivery && (!customerAddress.calle || !customerAddress.colonia)) { alert("Completa tu dirección."); return; }
        if (!selectedPaymentMethod) { alert("Selecciona método de pago."); return; }

        const finalTotal = cartTotal + shippingCost;
        const customer: Customer = {
            name: customerName,
            phone: customerPhone,
            address: orderType === OrderType.Delivery ? customerAddress : { colonia: '', calle: '', numero: '', referencias: '' }
        };

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments,
            orderType: orderType,
            paymentStatus: 'pending'
        };

        try {
            await saveOrder(newOrder);
            // WhatsApp build...
            const message = encodeURIComponent(`NUEVO PEDIDO WEB\nCliente: ${customerName}\nTotal: $${finalTotal.toFixed(2)}`);
            window.open(`https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) { alert("Error al guardar pedido."); }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (view === 'checkout') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
                <header className="bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center gap-3 sticky top-0 z-30">
                    <button onClick={() => setView('cart')} className="p-2 hover:bg-gray-100 rounded-full"><IconArrowLeft className="h-6 w-6"/></button>
                    <h1 className="font-black text-xl uppercase tracking-tighter">Finalizar Pedido</h1>
                </header>

                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* Delivery Method Selection */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-black mb-4 uppercase text-xs tracking-widest text-gray-400">Tipo de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center gap-2 transition-all ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>
                                <IconDelivery className="h-7 w-7"/> DOMICILIO
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center gap-2 transition-all ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>
                                <IconStore className="h-7 w-7"/> RECOGER
                            </button>
                        </div>
                    </div>

                    {/* Customer Form */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="font-black uppercase text-xs tracking-widest text-gray-400">Tus Datos</h3>
                        <input type="text" placeholder="Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                        <input type="tel" placeholder="WhatsApp / Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                        
                        {orderType === OrderType.Delivery && (
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="text" placeholder="Calle" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="col-span-2 w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                                    <input type="text" placeholder="N°" value={customerAddress.numero} onChange={e => setCustomerAddress({...customerAddress, numero: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                                </div>
                                <input type="text" placeholder="Colonia / Sector" value={customerAddress.colonia} onChange={e => setCustomerAddress({...customerAddress, colonia: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                            </div>
                        )}
                    </div>
                </div>

                {/* MODIFICACIÓN: Resumen de pago con costo de envío dinámico */}
                <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 space-y-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-t-3xl">
                    <div className="flex justify-between text-gray-500 font-bold uppercase text-xs">
                        <span>Subtotal de productos</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Visualización del costo de envío si es domicilio y precio fijo */}
                    {orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed && (
                        <div className="flex justify-between text-emerald-600 font-black animate-in fade-in zoom-in duration-300">
                            <span className="flex items-center gap-2 uppercase text-xs tracking-tighter">
                                <div className="p-1 bg-emerald-100 dark:bg-emerald-900 rounded-md">
                                    <IconDelivery className="h-4 w-4"/>
                                </div>
                                Cargo por envío
                            </span>
                            <span>+${shippingCost.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-2xl font-black pt-3 border-t dark:border-gray-700 items-center">
                        <span className="text-sm uppercase tracking-tighter text-gray-400">Total a pagar</span>
                        <span className="text-emerald-600">${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    
                    <button onClick={handlePlaceOrder} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-3">
                        <IconWhatsapp className="h-6 w-6"/> CONFIRMAR PEDIDO
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                    <IconCheck className="h-12 w-12 text-emerald-600" />
                </div>
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">¡Pedido Enviado!</h1>
                <p className="text-emerald-50 mb-10 font-bold">Te hemos redirigido a WhatsApp para procesar tu orden. El restaurante te contactará en breve.</p>
                <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-colors uppercase tracking-widest text-sm">
                    Hacer otro pedido
                </button>
            </div>
        )
    }

    // Default simplified view logic to avoid overwhelming changes
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 font-sans">
             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                <IconStore className="h-10 w-10"/>
             </div>
             <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Menú de {settings?.company.name}</h2>
             <button onClick={() => setView('cart')} className="mt-6 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">Abrir Carrito ({itemCount})</button>
             <Chatbot />
        </div>
    );
}
