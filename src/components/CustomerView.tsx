
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown } from '../constants';
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
            
            // If single selection (Radio behavior)
            if (personalization.maxSelection === 1) {
                return { ...prev, [personalization.id]: [option] };
            }

            // Multi selection (Checkbox behavior)
            if (isSelected) {
                return { ...prev, [personalization.id]: currentSelection.filter(opt => opt.id !== option.id) };
            } else {
                if (personalization.maxSelection && currentSelection.length >= personalization.maxSelection) {
                    return prev; // Max reached
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
                 
                 {/* Close Button */}
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20 backdrop-blur-md transition-colors">
                    <IconX className="h-6 w-6" />
                </button>

                {/* Image */}
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent h-full w-full pointer-events-none"></div>
                     {promotion && (
                        <div className="absolute top-4 left-4 z-20">
                            <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 border border-yellow-500">
                                <IconSparkles className="w-3 h-3" />
                                {promotion.name}
                            </div>
                        </div>
                     )}
                     <div className="absolute bottom-0 left-0 p-6 w-full text-white">
                        <h2 className="text-3xl font-bold drop-shadow-md">{product.name}</h2>
                        {promotion && (basePrice < product.price) && (
                            <div className="mt-1 inline-block bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold shadow-lg">
                                Ahorras ${(product.price - basePrice).toFixed(2)}
                            </div>
                        )}
                     </div>
                </div>

                <div className="p-6 flex-grow overflow-y-auto relative z-10 bg-white dark:bg-gray-900 -mt-4 rounded-t-3xl">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{product.description}</p>
                    
                    {/* Personalizations */}
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{p.name}</h4>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md">
                                        {p.maxSelection === 1 ? 'Elige 1' : `Máx ${p.maxSelection || 'ilimitado'}`}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = isOptionSelected(p.id, opt.id);
                                        const isSingleSelect = p.maxSelection === 1;
                                        
                                        return (
                                            <div 
                                                key={opt.id} 
                                                onClick={() => handleOptionToggle(p, opt)}
                                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all duration-200 group 
                                                    ${isSelected 
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-sm' 
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Selection Indicator */}
                                                    <div className={`
                                                        w-5 h-5 flex items-center justify-center border transition-all duration-200 flex-shrink-0
                                                        ${isSingleSelect ? 'rounded-full' : 'rounded-md'}
                                                        ${isSelected 
                                                            ? 'border-emerald-500 bg-emerald-500 text-white' 
                                                            : 'border-gray-300 dark:border-gray-500 bg-transparent'}
                                                    `}>
                                                        {isSelected && (
                                                            isSingleSelect 
                                                                ? <div className="w-2 h-2 bg-white rounded-full shadow-sm" /> 
                                                                : <IconCheck className="h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                    
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {opt.name}
                                                    </span>
                                                </div>
                                                
                                                {opt.price > 0 && (
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        +${opt.price.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Section */}
                    {allSelectedOptions.length > 0 && (
                        <div className="mt-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider flex justify-between items-center">
                                Resumen de extras
                                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                                    {allSelectedOptions.length} seleccionados
                                </span>
                            </h4>
                            <div className="space-y-2 mb-3">
                                {allSelectedOptions.map((opt, idx) => (
                                    <div key={`${opt.id}-${idx}`} className="flex justify-between text-sm items-center">
                                        <span className="text-gray-700 dark:text-gray-300">{opt.name}</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                                            {opt.price > 0 ? `+$${opt.price.toFixed(2)}` : 'Gratis'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Total extras</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">+${totalOptionsPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pb-20">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Instrucciones especiales</label>
                        <textarea 
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                            placeholder="Ej. Sin cebolla, salsa aparte..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-3xl sm:rounded-b-2xl safe-bottom absolute bottom-0 w-full z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-between gap-4 mb-4">
                         <span className="text-gray-500 dark:text-gray-400 font-medium">Cantidad</span>
                         <div className="flex items-center gap-6 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 border border-gray-200 dark:border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-gray-900 dark:text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="w-full font-bold py-4 px-6 rounded-xl transition-all transform active:scale-[0.98] shadow-lg flex justify-between items-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/20"
                    >
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
    
    // Data States
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

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();

    const fetchMenuData = async () => {
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
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
        subscribeToMenuUpdates(() => {
            console.log("Menu updated from admin (Realtime), refreshing...");
            fetchMenuData();
        });
        const intervalId = setInterval(() => fetchMenuData(), 30000);

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

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return allProducts.filter(p => p.available);
        return allProducts.filter(p => p.categoryId === selectedCategory && p.available);
    }, [allProducts, selectedCategory]);

    const handlePlaceOrder = async () => {
        if (!settings) return;
        
        if (!customerName || !customerPhone) {
            alert("Por favor completa tu nombre y teléfono.");
            return;
        }
        if (orderType === OrderType.Delivery && (!customerAddress.calle || !customerAddress.colonia)) {
            alert("Por favor completa tu dirección.");
            return;
        }
        if (!selectedPaymentMethod) {
            alert("Selecciona un método de pago.");
            return;
        }

        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) 
            ? (settings.shipping.fixedCost ?? 0) 
            : 0;

        const finalTotal = cartTotal + shippingCost; // Add tip logic if needed

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
            tableId: orderType === OrderType.DineIn && tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
            paymentStatus: 'pending'
        };

        try {
            await saveOrder(newOrder);
            
            // Build WhatsApp Message
            const lineSeparator = "━━━━━━━━━━━━━━━━━━━━";
            const currency = settings.company.currency.code;
            
            const itemDetails = cartItems.map(item => {
                let detail = `▪️ ${item.quantity}x ${item.name}`;
                if (item.selectedOptions && item.selectedOptions.length > 0) {
                    detail += `\n   ${item.selectedOptions.map(opt => `+ ${opt.name}`).join(', ')}`;
                }
                if (item.comments) detail += `\n   _Nota: ${item.comments}_`;
                return detail;
            });

            const messageParts = [
                `*NUEVO PEDIDO WEB* ${orderType === OrderType.Delivery ? '🛵' : orderType === OrderType.DineIn ? '🍽️' : '🛍️'}`,
                lineSeparator,
                `*Cliente:* ${customer.name}`,
                `*Teléfono:* ${customer.phone}`,
                orderType === OrderType.Delivery ? `*Dirección:* ${customer.address.calle} #${customer.address.numero}, ${customer.address.colonia}` : '',
                orderType === OrderType.Delivery && customer.address.referencias ? `(Ref: ${customer.address.referencias})` : '',
                orderType === OrderType.DineIn ? `*Mesa:* ${tableInfo?.zone} - ${tableInfo?.table}` : '',
                lineSeparator,
                `*PEDIDO:*`,
                ...itemDetails,
                lineSeparator,
                `*Subtotal:* ${currency} ${cartTotal.toFixed(2)}`,
                settings.shipping.costType === ShippingCostType.Fixed && orderType === OrderType.Delivery ? `*Envío:* ${currency} ${shippingCost.toFixed(2)}` : '',
                `*TOTAL A PAGAR:* ${currency} ${finalTotal.toFixed(2)}`,
                `*Método de pago:* ${selectedPaymentMethod}`,
                generalComments ? `\n*Nota:* ${generalComments}` : ''
            ].filter(Boolean);

            const message = encodeURIComponent(messageParts.join('\n'));
            const whatsappUrl = `https://wa.me/${settings.branch.whatsappNumber.replace(/\D/g, '')}?text=${message}`;
            
            window.open(whatsappUrl, '_blank');
            clearCart();
            setView('confirmation');
        } catch(e) {
            console.error("Failed to save order", e);
            alert("Hubo un error al guardar tu pedido. Por favor, intenta de nuevo.");
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-medium animate-pulse">Cargando menú...</p>
            </div>
        </div>;
    }

    // --- Render: Menu View ---
    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
                {/* Hero / Header */}
                <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30">
                    <div className="px-4 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                         <div className="flex items-center gap-3">
                             {settings?.branch.logoUrl ? (
                                <img src={settings.branch.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                             ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                                    {settings?.company.name.charAt(0)}
                                </div>
                             )}
                             <div>
                                 <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{settings?.branch.alias || 'Nuestro Menú'}</h1>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">{settings?.company.name}</p>
                             </div>
                         </div>
                         <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                             <IconSearch className="h-5 w-5"/>
                         </button>
                    </div>
                    
                    {/* Categories Scroll */}
                    <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar bg-white dark:bg-gray-800">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            Todo
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map(product => {
                        const { price, promotion } = getDiscountedPrice(product, allPromotions);
                        return (
                            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all flex flex-row h-32 sm:flex-col sm:h-auto group">
                                {/* Image */}
                                <div className="w-32 sm:w-full sm:h-48 flex-shrink-0 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     {promotion && (
                                        <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                            OFERTA
                                        </div>
                                     )}
                                </div>
                                {/* Content */}
                                <div className="p-3 flex flex-col flex-1 justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 sm:line-clamp-2 text-sm sm:text-base">{product.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{product.description}</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <div className="flex flex-col">
                                            {promotion && <span className="text-xs text-gray-400 line-through">${product.price.toFixed(2)}</span>}
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">${price.toFixed(2)}</span>
                                        </div>
                                        <button className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-2 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors">
                                            <IconPlus className="h-5 w-5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <IconStore className="h-16 w-16 mb-4 opacity-20"/>
                        <p>No hay productos en esta categoría.</p>
                    </div>
                )}

                {/* Floating Cart Button */}
                {itemCount > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
                        <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold shadow-xl shadow-emerald-600/30 flex justify-between items-center px-6 hover:bg-emerald-700 transition-transform active:scale-[0.98]">
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-800 px-2 py-0.5 rounded text-xs">{itemCount}</span>
                                <span>Ver pedido</span>
                            </div>
                            <span>${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                
                {selectedProduct && (
                    <ProductDetailModal 
                        product={selectedProduct} 
                        onAddToCart={addToCart} 
                        onClose={() => setSelectedProduct(null)}
                        personalizations={allPersonalizations}
                        promotions={allPromotions}
                    />
                )}
                
                <Chatbot />
            </div>
        );
    }

    // --- Render: Cart View ---
    if (view === 'cart') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <header className="bg-white dark:bg-gray-800 p-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
                    <button onClick={() => setView('menu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><IconArrowLeft/></button>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white">Tu Pedido</h1>
                </header>
                
                <div className="flex-1 p-4 overflow-y-auto">
                    {cartItems.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <p>Tu carrito está vacío</p>
                            <button onClick={() => setView('menu')} className="mt-4 text-emerald-600 font-bold underline">Volver al menú</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cartItems.map(item => (
                                <div key={item.cartItemId} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4">
                                    <img src={item.imageUrl} className="w-20 h-20 rounded-lg object-cover bg-gray-200" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h4>
                                            <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-400 hover:text-red-500"><IconTrash className="h-4 w-4"/></button>
                                        </div>
                                        <p className="text-emerald-600 font-bold text-sm mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                {item.selectedOptions.map(o => o.name).join(', ')}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-3">
                                            <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><IconMinus className="h-4 w-4"/></button>
                                            <span className="font-bold w-6 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><IconPlus className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 dark:text-gray-400">Total</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">${cartTotal.toFixed(2)}</span>
                        </div>
                        <button onClick={() => setView('checkout')} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg">
                            Continuar
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // --- Render: Checkout View ---
    if (view === 'checkout') {
        const shippingCost = (orderType === OrderType.Delivery && settings?.shipping.costType === ShippingCostType.Fixed) ? (settings.shipping.fixedCost ?? 0) : 0;
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <header className="bg-white dark:bg-gray-800 p-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
                    <button onClick={() => setView('cart')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><IconArrowLeft/></button>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white">Finalizar Pedido</h1>
                </header>

                <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    {/* Order Type */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold mb-3 text-gray-900 dark:text-white">Tipo de entrega</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOrderType(OrderType.Delivery)} className={`p-3 rounded-lg border font-medium flex flex-col items-center gap-2 ${orderType === OrderType.Delivery ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700 dark:text-gray-300'}`}>
                                <IconStore className="h-6 w-6"/> Domicilio
                            </button>
                            <button onClick={() => setOrderType(OrderType.TakeAway)} className={`p-3 rounded-lg border font-medium flex flex-col items-center gap-2 ${orderType === OrderType.TakeAway ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700 dark:text-gray-300'}`}>
                                <IconLocationMarker className="h-6 w-6"/> Para llevar
                            </button>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Tus datos</h3>
                        <input type="text" placeholder="Tu Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                        <input type="tel" placeholder="Tu Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                        
                        {orderType === OrderType.Delivery && (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="text" placeholder="Calle" value={customerAddress.calle} onChange={e => setCustomerAddress({...customerAddress, calle: e.target.value})} className="col-span-2 w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                                    <input type="text" placeholder="No." value={customerAddress.numero} onChange={e => setCustomerAddress({...customerAddress, numero: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <input type="text" placeholder="Colonia / Sector" value={customerAddress.colonia} onChange={e => setCustomerAddress({...customerAddress, colonia: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                                <input type="text" placeholder="Referencia (Color casa, frente a...)" value={customerAddress.referencias} onChange={e => setCustomerAddress({...customerAddress, referencias: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500" />
                            </>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold mb-3 text-gray-900 dark:text-white">Forma de pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {settings?.payment[orderType === OrderType.Delivery ? 'deliveryMethods' : 'pickupMethods'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setSelectedPaymentMethod(method)}
                                    className={`p-3 text-sm rounded-lg border text-center transition-all ${selectedPaymentMethod === method ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-300'}`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <label className="font-bold mb-2 block text-gray-900 dark:text-white">Nota para el restaurante (Opcional)</label>
                        <textarea 
                            value={generalComments} 
                            onChange={e => setGeneralComments(e.target.value)} 
                            placeholder="Ej. Servilletas extra, timbre no sirve..."
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-none focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                        />
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom space-y-3">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    {shippingCost > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Envío</span>
                            <span>${shippingCost.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>${(cartTotal + shippingCost).toFixed(2)}</span>
                    </div>
                    <button onClick={handlePlaceOrder} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-colors">
                        Confirmar Pedido por WhatsApp
                    </button>
                </div>
            </div>
        )
    }

    if (view === 'confirmation') {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
                    <IconCheck className="h-10 w-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-bold mb-2">¡Pedido Enviado!</h1>
                <p className="text-emerald-100 mb-8 max-w-xs mx-auto">Te hemos redirigido a WhatsApp para enviar los detalles. El restaurante confirmará tu pedido en breve.</p>
                <button onClick={() => setView('menu')} className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-50 transition-colors">
                    Hacer otro pedido
                </button>
            </div>
        )
    }

    return null;
}
