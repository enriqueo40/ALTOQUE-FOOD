

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// Main View Manager
export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [generalComments, setGeneralComments] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    // State for Order Type (Delivery, TakeAway, DineIn)
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    // Global data for the menu
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    const fetchMenuData = async () => {
        try {
            // Parallel data fetching for speed
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
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
        
        // Subscribe to real-time updates for the menu (Admin changes)
        subscribeToMenuUpdates(() => {
            console.log("Menu updated from admin (Realtime), refreshing...");
            fetchMenuData();
        });

        // Polling fallback: Check for updates every 30 seconds to ensure sync
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing menu data (Polling)...");
            fetchMenuData();
        }, 30000);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }

        return () => {
            unsubscribeFromChannel();
            clearInterval(intervalId);
        };
    }, []);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handleAddToCart = (product: Product, quantity: number, comments?: string, options: PersonalizationOption[] = []) => {
        addToCart(product, quantity, comments, options);
        setSelectedProduct(null);
    };

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0) => {
        if (!settings) return;

        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) 
            ? (settings.shipping.fixedCost ?? 0) 
            : 0;

        const finalTotal = cartTotal + shippingCost + tipAmount;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments + (tipAmount > 0 ? ` | Propina: ${settings.company.currency.code} ${tipAmount.toFixed(2)}` : ''),
            orderType: orderType,
            tableId: orderType === OrderType.DineIn && tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
        };

        try {
            await saveOrder(newOrder);
        } catch(e) {
            console.error("Failed to save order", e);
            alert("Hubo un error al guardar tu pedido. Por favor, intenta de nuevo.");
            return; // Stop if saving fails
        }

        // Helper to format options string
        const formatOptions = (item: CartItem) => {
            if (!item.selectedOptions || item.selectedOptions.length === 0) return '';
            return item.selectedOptions.map(opt => `    + ${opt.name}`).join('\n');
        };

        let messageParts: string[];

        const itemDetails = cartItems.map(item => {
            let detail = `*${item.quantity}x ${item.name}*`;
            const optionsStr = formatOptions(item);
            if (optionsStr) detail += `\n${optionsStr}`;
            if (item.comments) detail += `\n  - _Nota: ${item.comments}_`;
            return detail;
        });

        const currency = settings.company.currency.code;

        if (orderType === OrderType.DineIn) {
            messageParts = [
                `*🛎️ Nuevo Pedido en Mesa de ${settings.company.name.toUpperCase()}*`,
                `---------------------------------`,
                `*MESA:* ${tableInfo?.zone} - ${tableInfo?.table}`,
                 `*CLIENTE:* ${customer.name}`,
                `---------------------------------`,
                `*DETALLES DEL PEDIDO:*`,
                ...itemDetails,
                ``,
                generalComments ? `*Comentarios Generales:*\n_${generalComments}_` : '',
                `---------------------------------`,
                `*Subtotal:* ${currency} $${cartTotal.toFixed(2)}`,
                tipAmount > 0 ? `*Propina:* ${currency} $${tipAmount.toFixed(2)}` : '',
                `*Total a Pagar:* ${currency} $${finalTotal.toFixed(2)}`,
                `*Método de pago:* ${paymentMethod}`,
            ];
        } else if (orderType === OrderType.TakeAway) {
             messageParts = [
                `*🛍️ Nuevo Pedido Para Recoger - ${settings.company.name.toUpperCase()}*`,
                `---------------------------------`,
                `*CLIENTE:*`,
                `*Nombre:* ${customer.name}`,
                `*Teléfono:* ${customer.phone}`,
                `---------------------------------`,
                `*TIPO:* Para llevar (Recoger en tienda)`,
                `---------------------------------`,
                `*DETALLES DEL PEDIDO:*`,
                ...itemDetails,
                ``,
                generalComments ? `*Comentarios Generales:*\n_${generalComments}_` : '',
                `---------------------------------`,
                `*Subtotal:* ${currency} $${cartTotal.toFixed(2)}`,
                tipAmount > 0 ? `*Propina:* ${currency} $${tipAmount.toFixed(2)}` : '',
                `*Total a Pagar:* ${currency} $${finalTotal.toFixed(2)}`,
                `*Método de pago:* ${paymentMethod}`,
            ];
        } else {
            // Delivery
            messageParts = [
                `*⭐ Nuevo Pedido a Domicilio - ${settings.company.name.toUpperCase()}*`,
                `---------------------------------`,
                `*CLIENTE:*`,
                `*Nombre:* ${customer.name}`,
                `*Teléfono:* ${customer.phone}`,
                `---------------------------------`,
                `*DIRECCIÓN DE ENTREGA:*`,
                `*Colonia:* ${customer.address.colonia}`,
                `*Calle:* ${customer.address.calle}`,
                `*Número:* ${customer.address.numero}`,
                customer.address.entreCalles ? `*Entre Calles:* ${customer.address.entreCalles}` : '',
                customer.address.referencias ? `*Referencias:* ${customer.address.referencias}` : '',
                `---------------------------------`,
                `*DETALLES DEL PEDIDO:*`,
                ...itemDetails,
                ``,
                generalComments ? `*Comentarios Generales:*\n_${generalComments}_` : '',
                `---------------------------------`,
                `*Subtotal:* ${currency} $${cartTotal.toFixed(2)}`,
                `*Envío:* ${shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Por cotizar'}`,
                tipAmount > 0 ? `*Propina:* ${currency} $${tipAmount.toFixed(2)}` : '',
                `*Total Estimado:* ${currency} $${finalTotal.toFixed(2)}`,
                `*Método de pago:* ${paymentMethod}`,
            ];
        }


        const whatsappMessage = encodeURIComponent(messageParts.filter(p => p !== '').join('\n'));
        const whatsappUrl = `https://wa.me/${settings.branch.whatsappNumber}?text=${whatsappMessage}`;
        
        window.open(whatsappUrl, '_blank');
        setView('confirmation');
    };

    const handleStartNewOrder = () => {
        clearCart();
        setGeneralComments('');
        setView('menu');
        // Do not clear tableInfo, as the customer is likely still at the same table.
    };

    const getHeaderTitle = () => {
        switch(view) {
            case 'cart': return 'Tu pedido';
            case 'checkout': return 'Completa tu pedido';
            case 'confirmation': return 'Confirmación';
            default: return '';
        }
    };
    
    const canGoBack = view === 'cart' || view === 'checkout';
    const handleBack = () => {
        if (view === 'checkout') setView('cart');
        else if (view === 'cart') setView('menu');
    }
    
    if (isLoading || !settings) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                <p className="animate-pulse">Sincronizando menú...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 min-h-screen font-sans text-gray-100 selection:bg-emerald-500 selection:text-white">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen shadow-2xl relative pb-24 border-x border-gray-800">
                
                {view !== 'menu' && <Header title={getHeaderTitle()} onBack={canGoBack ? handleBack : undefined} />}

                {view === 'menu' && (
                    <>
                        <RestaurantHero 
                            settings={settings} 
                            tableInfo={tableInfo} 
                            orderType={orderType}
                            setOrderType={setOrderType}
                        />
                        <MenuList 
                            products={allProducts}
                            categories={allCategories}
                            onProductClick={handleProductClick} 
                            cartItems={cartItems} 
                            currency={settings.company.currency.code}
                            promotions={allPromotions}
                        />
                    </>
                )}

                {view === 'cart' && (
                    <CartSummaryView 
                        cartItems={cartItems}
                        cartTotal={cartTotal}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeFromCart}
                        generalComments={generalComments}
                        onGeneralCommentsChange={setGeneralComments}
                        onProceedToCheckout={() => setView('checkout')}
                    />
                )}
                
                {view === 'checkout' && (
                    <CheckoutView 
                        cartTotal={cartTotal}
                        onPlaceOrder={handlePlaceOrder}
                        settings={settings}
                        orderType={orderType}
                    />
                )}

                {view === 'confirmation' && (
                    <OrderConfirmation onNewOrder={handleStartNewOrder} settings={settings} />
                )}

                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onAddToCart={handleAddToCart}
                        onClose={() => setSelectedProduct(null)}
                        personalizations={allPersonalizations}
                        promotions={allPromotions}
                    />
                )}

                {view === 'menu' && itemCount > 0 && (
                    <FooterBar 
                        itemCount={itemCount} 
                        cartTotal={cartTotal}
                        onViewCart={() => setView('cart')} 
                    />
                )}
                <Chatbot />
            </div>
        </div>
    );
}

// Sub-components
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
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday
    // Adjust to match array (0 = Monday in my array)
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
                                        // If it's open but no shifts, it implies 24h, otherwise closed
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

    // Use the first schedule as default
    const currentSchedule = schedules[0];

    useEffect(() => {
        // Check manual override first
        if (settings.branch.isOpen === false) {
            setIsOpenNow(false);
            return;
        }

        // Determine if open based on schedule
        if (!currentSchedule) return;
        const now = new Date();
        const daysOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = daysOrder[now.getDay()];
        const todaySchedule = currentSchedule.days.find(d => d.day === todayName);

        if (todaySchedule && todaySchedule.isOpen) {
            // If shifts exist, check time. If empty, it means 24h open (syncs with admin logic)
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
    }, [currentSchedule, settings.branch.isOpen]);

    // ... [rest of component]
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

    const getTimeLabel = () => {
        return orderType === OrderType.TakeAway ? "Tiempo recogida" : "Tiempo envío";
    };

    const getTimeText = () => {
        if (orderType === OrderType.TakeAway) {
             return `${shipping.pickupTime.min} min`;
        }
        return `${shipping.deliveryTime.min} - ${shipping.deliveryTime.max} min`;
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: company.name,
                text: `¡Mira el menú de ${company.name}!`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Enlace copiado al portapapeles");
        }
    };
    
    return (
        <div className="relative">
            {/* Cover Image Background */}
            <div className="h-48 w-full overflow-hidden relative">
                {branch.coverImageUrl ? (
                    <img src={branch.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
                
                {/* Top Actions - Removed non-functional icons as requested */}
            </div>

            <div className="px-6 relative -mt-16 flex flex-col items-center text-center pb-6 border-b border-gray-800">
                 {/* Logo */}
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
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                        {branch.alias}
                    </p>
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
                    <div className="w-full p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl flex items-center justify-center gap-3 animate-fade-in">
                        <IconTableLayout className="h-5 w-5 text-emerald-400" />
                        <p className="font-medium text-emerald-200 text-sm">Estás en la mesa <span className="font-bold text-white">{tableInfo.table}</span> ({tableInfo.zone})</p>
                    </div>
                ) : (
                    <>
                    <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative mb-4 shadow-inner">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-transform duration-300 ease-out shadow-sm ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}
                        ></div>
                        <button 
                            onClick={() => setOrderType(OrderType.Delivery)} 
                            className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            A domicilio
                        </button>
                        <button 
                            onClick={() => setOrderType(OrderType.TakeAway)} 
                            className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Para recoger
                        </button>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-gray-800 w-full max-w-xs">
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{getTimeLabel()}</p>
                            <p className="text-white font-medium">{getTimeText()}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Costo envío</p>
                            <p className="text-white font-medium">{getShippingCostText()}</p>
                        </div>
                    </div>
                    </>
                )}
            </div>
            
            {/* Schedule Modal */}
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

// ... [Rest of CustomerView remains unchanged]
