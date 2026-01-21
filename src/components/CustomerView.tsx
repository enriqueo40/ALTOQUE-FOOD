
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconCheck, IconDuplicate, IconUpload, Skeleton } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// Sub-components definitions
const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800 transition-all">
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
                    <img src={branch.coverImageUrl} alt="Cover" className="w-full h-full object-cover transition-opacity duration-500" />
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
                        <p className="font-medium text-emerald-200 text-sm">Estás en la mesa <span className="font-bold text-white">{tableInfo.table}</span> ({tableInfo.zone})</p>
                    </div>
                ) : (
                    <>
                    <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative mb-4 shadow-inner">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-transform duration-300 ease-out shadow-sm ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}
                        ></div>
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400'}`}>Para recoger</button>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-gray-800 w-full max-w-xs">
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{orderType === OrderType.TakeAway ? "Tiempo recogida" : "Tiempo envío"}</p>
                            <p className="text-white font-medium">{orderType === OrderType.TakeAway ? `${shipping.pickupTime.min} min` : `${shipping.deliveryTime.min} - ${shipping.deliveryTime.max} min`}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Costo envío</p>
                            <p className="text-white font-medium">{getShippingCostText()}</p>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};

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
        if (promo.discountType === DiscountType.Percentage) currentPrice = product.price * (1 - promo.discountValue / 100);
        else currentPrice = Math.max(0, product.price - promo.discountValue);
        if (currentPrice < bestPrice) { bestPrice = currentPrice; bestPromo = promo; }
    });
    return { price: bestPrice, promotion: bestPromo };
};

const ProductRow = React.memo<{ product: Product; quantityInCart: number; onClick: () => void; currency: string; promotions: Promotion[] }>(({ product, quantityInCart, onClick, currency, promotions }) => {
    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);
    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 hover:bg-gray-750 active:scale-[0.99] transition-all cursor-pointer border border-gray-700 shadow-sm group relative overflow-hidden h-32">
            {promotion && (
                <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">
                    -{promotion.discountType === DiscountType.Percentage ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}
                </div>
            )}
            <div className="relative h-24 w-24 flex-shrink-0 self-center">
                <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full rounded-lg object-cover bg-gray-700" />
                {quantityInCart > 0 && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-gray-900">
                        {quantityInCart}
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h3 className="font-bold text-gray-100 leading-tight group-hover:text-emerald-400 transition-colors line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1 leading-snug">{product.description}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        {promotion && <span className="text-xs text-gray-500 line-through">{currency} ${product.price.toFixed(2)}</span>}
                        <p className={`font-bold ${promotion ? 'text-rose-400' : 'text-white'}`}>{currency} ${discountedPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-1.5 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <IconPlus className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
});

const MenuList: React.FC<{
    products: Product[],
    categories: Category[],
    onProductClick: (product: Product) => void, 
    cartItems: CartItem[], 
    currency: string, 
    promotions: Promotion[],
    isLoading: boolean
}> = ({ products, categories, onProductClick, cartItems, currency, promotions, isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');
    
    useEffect(() => {
        if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0].id);
    }, [categories, activeCategory]);

    const productQuantities = useMemo(() => {
        const quantities: { [productId: string]: number } = {};
        cartItems.forEach(item => { quantities[item.id] = (quantities[item.id] || 0) + item.quantity; });
        return quantities;
    }, [cartItems]);

    const filteredProducts = products.filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const groupedProducts = useMemo(() => {
        const standardGroups = categories
            .map(category => ({ ...category, products: filteredProducts.filter(p => p.categoryId === category.id) }))
            .filter(category => category.products.length > 0);
        const categoryIds = new Set(categories.map(c => c.id));
        const orphanedProducts = filteredProducts.filter(p => !categoryIds.has(p.categoryId));
        if (orphanedProducts.length > 0) standardGroups.push({ id: 'uncategorized', name: 'Otros', products: orphanedProducts });
        return standardGroups;
    }, [filteredProducts, categories]);

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = document.getElementById(`category-${categoryId}`);
        if (element) {
            const y = element.getBoundingClientRect().top + window.pageYOffset - 140; 
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (isLoading) return <div className="px-4 mt-20 space-y-8 animate-pulse">{[1, 2].map(i => <div key={i}><Skeleton className="h-8 w-48 mb-4 bg-gray-800" /><div className="space-y-4">{[1, 2, 3].map(j => <div key={j} className="h-32 bg-gray-800 rounded-xl" />)}</div></div>)}</div>;

    return (
        <div className="pb-24">
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur shadow-lg pt-2">
                <div className="px-4 mb-2">
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                        <input type="text" placeholder="Buscar productos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
                <div className="flex overflow-x-auto pb-3 pt-1 px-4 gap-2 hide-scrollbar">
                    {groupedProducts.map(category => (
                         <button key={category.id} onClick={() => handleCategoryClick(category.id)} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${activeCategory === category.id ? 'bg-white text-gray-900 border-white shadow-glow' : 'bg-transparent text-gray-400 border-gray-700'}`}>
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-4 mt-4 space-y-8">
                {groupedProducts.map(category => (
                    <div key={category.id} id={`category-${category.id}`} className="scroll-mt-40">
                        <h2 className="text-xl font-bold text-white mb-4">{category.name}</h2>
                        <div className="grid gap-4">
                            {category.products.map(product => (
                                <ProductRow key={product.id} product={product} quantityInCart={productQuantities[product.id] || 0} onClick={() => onProductClick(product)} currency={currency} promotions={promotions} />
                            ))}
                        </div>
                    </div>
                ))}
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
    const [selectedOptions, setSelectedOptions] = useState<{ [personalizationId: string]: PersonalizationOption[] }>({});

    const { price: basePrice } = getDiscountedPrice(product, promotions);
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

    let totalOptionsPrice = 0;
    Object.values(selectedOptions).forEach((group: PersonalizationOption[]) => {
        group.forEach(opt => { totalOptionsPrice += Number(opt.price || 0); });
    });
    
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative animate-slide-up">
                 <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white z-10"><IconX className="h-6 w-6" /></button>
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                </div>
                <div className="p-6 flex-grow overflow-y-auto -mt-12 relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-300 mb-6">{product.description}</p>
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white mb-3">{p.name}</h4>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = (selectedOptions[p.id] || []).some(o => o.id === opt.id);
                                        return (
                                            <div key={opt.id} onClick={() => handleOptionToggle(p, opt)} className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700'}`}>
                                                <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{opt.name}</span>
                                                {opt.price > 0 && <span className="text-sm text-emerald-400">+${opt.price.toFixed(2)}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500" placeholder="Instrucciones especiales..." />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-3xl sm:rounded-b-2xl">
                    <div className="flex items-center justify-between mb-4">
                         <span className="text-gray-400">Cantidad</span>
                         <div className="flex items-center gap-6 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full text-white"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full text-white"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button onClick={() => onAddToCart({ ...product, price: basePrice }, quantity, comments, (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, curr) => acc.concat(curr), []))} className="w-full font-bold py-4 px-6 rounded-xl bg-emerald-500 text-white flex justify-between items-center shadow-lg">
                        <span>Agregar al pedido</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const CartSummaryView: React.FC<{
    cartItems: CartItem[], 
    cartTotal: number,
    onUpdateQuantity: (id: string, q: number) => void, 
    onRemoveItem: (id: string) => void,
    generalComments: string,
    onGeneralCommentsChange: (c: string) => void,
    onProceedToCheckout: () => void
}> = ({ cartItems, cartTotal, onUpdateQuantity, onRemoveItem, generalComments, onGeneralCommentsChange, onProceedToCheckout }) => {
    if (cartItems.length === 0) return <div className="p-8 text-center h-[calc(100vh-80px)] flex flex-col items-center justify-center text-gray-400"><h2>Tu carrito está vacío</h2></div>;
    return (
        <div className="p-4 pb-40">
            <div className="space-y-4">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="flex gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover"/>
                        <div className="flex-grow">
                            <div className="flex justify-between"><h3 className="font-bold text-gray-100">{item.name}</h3></div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-1 border border-gray-700">
                                    <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.cartItemId, item.quantity - 1) : onRemoveItem(item.cartItemId)} className="p-1.5 text-gray-300"><IconMinus className="h-4 w-4"/></button>
                                    <span className="font-bold w-4 text-center text-sm text-white">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="p-1.5 text-gray-300"><IconPlus className="h-4 w-4"/></button>
                                </div>
                                <button onClick={() => onRemoveItem(item.cartItemId)} className="text-gray-500"><IconTrash className="h-5 w-5"/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-8">
                <textarea value={generalComments} onChange={(e) => onGeneralCommentsChange(e.target.value)} rows={2} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white" placeholder="Comentarios generales..." />
            </div>
             <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 p-4 safe-bottom z-30">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-gray-400">Total</span>
                    <span className="font-bold text-2xl text-white">${cartTotal.toFixed(2)}</span>
                </div>
                 <button onClick={onProceedToCheckout} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl">Continuar</button>
            </div>
        </div>
    )
}

const CheckoutView: React.FC<{
    cartTotal: number, 
    onPlaceOrder: (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => void, 
    settings: AppSettings, 
    orderType: OrderType 
}> = ({ cartTotal, onPlaceOrder, settings, orderType }) => {
    const [customer, setCustomer] = useState<Customer>({
        name: '', phone: '', address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '', googleMapsLink: '' }
    });
    const [tipAmount, setTipAmount] = useState<number>(0);
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    
    const isDelivery = orderType === OrderType.Delivery;
    const availablePaymentMethods = isDelivery ? settings.payment.deliveryMethods : settings.payment.pickupMethods;
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(availablePaymentMethods[0] || 'Efectivo');

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert("Tu navegador no soporta geolocalización.");
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setCustomer(prev => ({ 
                    ...prev, 
                    address: { 
                      ...prev.address, 
                      googleMapsLink: link 
                    } 
                }));
                setIsLocating(false);
                alert("📍 Ubicación GPS capturada correctamente.");
            },
            (error) => {
                console.error(error);
                alert("Error al capturar ubicación. Por favor permite el acceso al GPS en tu navegador.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setPaymentProof(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const finalTotal = cartTotal + (isDelivery && settings.shipping.fixedCost ? settings.shipping.fixedCost : 0) + tipAmount;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onPlaceOrder(customer, selectedPaymentMethod, tipAmount, paymentProof); }} className="p-4 space-y-6 pb-44 animate-fade-in">
            <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                    Tus datos
                </h3>
                <input type="text" value={customer.name} onChange={e => setCustomer(c => ({...c, name: e.target.value}))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre completo" required />
                {orderType !== OrderType.DineIn && <input type="tel" value={customer.phone} onChange={e => setCustomer(c => ({...c, phone: e.target.value}))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="WhatsApp" required />}
            </div>

            {isDelivery && (
                <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                            Entrega
                        </h3>
                        <button 
                            type="button" 
                            onClick={handleGetLocation} 
                            disabled={isLocating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${customer.address.googleMapsLink ? 'bg-emerald-500 text-white scale-105 shadow-emerald-900/40' : 'bg-white text-gray-900 hover:bg-emerald-50 active:scale-95'}`}
                        >
                            {isLocating ? <div className="h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> : <IconLocationMarker className="h-4 w-4"/>}
                            {customer.address.googleMapsLink ? '📍 GPS Listo ✓' : 'Compartir mi Ubicación Exacta'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="calle" value={customer.address.calle} onChange={handleAddressChange} className="col-span-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Calle" required />
                        <input type="text" name="numero" value={customer.address.numero} onChange={handleAddressChange} className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Número Ext" required />
                        <input type="text" name="colonia" value={customer.address.colonia} onChange={handleAddressChange} className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Colonia" required />
                    </div>
                    <input type="text" name="referencias" value={customer.address.referencias} onChange={handleAddressChange} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Referencias (color casa, portón, etc)" />
                </div>
            )}

            <div className="space-y-3 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                 <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                    Pago
                 </h3>
                 <div className="space-y-2">
                    {availablePaymentMethods.map(method => (
                        <label key={method} className={`flex justify-between items-center p-4 rounded-xl cursor-pointer border transition-all ${selectedPaymentMethod === method ? 'bg-emerald-900/20 border-emerald-500' : 'bg-gray-800 border-gray-700'}`}>
                            <span className="text-white font-medium">{method}</span>
                            <input type="radio" name="payment" value={method} checked={selectedPaymentMethod === method} onChange={() => setSelectedPaymentMethod(method)} className="h-5 w-5 accent-emerald-500" />
                        </label>
                    ))}
                    {(selectedPaymentMethod === 'Pago Móvil' || selectedPaymentMethod === 'Transferencia') && (
                         <div className="mt-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 animate-slide-up text-center">
                             <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Subir comprobante de pago</p>
                             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-500 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                                <IconUpload className="w-8 h-8 text-gray-400 mb-1"/>
                                <p className="text-xs text-gray-400 font-medium">Toca para cargar captura</p>
                                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                             </label>
                             {paymentProof && <img src={paymentProof} className="mt-4 h-48 w-full object-contain rounded border border-emerald-500 shadow-lg" alt="Comprobante" />}
                         </div>
                    )}
                 </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 p-4 z-30 shadow-2xl">
                 <div className="flex justify-between font-bold text-xl text-white mb-4 px-2"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div>
                 <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-900/30 transition-transform active:scale-95">
                    <IconWhatsapp className="h-6 w-6" /> Realizar Pedido
                </button>
            </div>
        </form>
    )
}

const OrderConfirmation: React.FC<{ onNewOrder: () => void, settings: AppSettings }> = ({ onNewOrder, settings }) => (
    <div className="p-6 text-center flex flex-col items-center justify-center h-[80vh] animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 className="text-3xl font-bold mb-3 text-white">¡Pedido Enviado!</h3>
        <p className="text-gray-400 mb-8 text-lg leading-relaxed">Te redirigimos a WhatsApp con los detalles de tu orden. El equipo de {settings.company.name} confirmará tu pedido en breve.</p>
        <button onClick={onNewOrder} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-700 transition-colors border border-gray-700">
            Volver al Inicio
        </button>
    </div>
);

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [generalComments, setGeneralComments] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string | null>(null);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    const fetchMenuData = async () => {
        try {
            const [appSettings, fetchedPromotions, fetchedPersonalizations, fetchedProducts, fetchedCategories] = await Promise.all([
                getAppSettings(), getPromotions(), getPersonalizations(), getProducts(), getCategories()
            ]);
            setSettings(appSettings); setAllPromotions(fetchedPromotions); setAllPersonalizations(fetchedPersonalizations); setAllProducts(fetchedProducts); setAllCategories(fetchedCategories);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMenuData();
        subscribeToMenuUpdates(fetchMenuData);
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        if (params.get('table')) { setTableInfo({ table: params.get('table')!, zone: params.get('zone')! }); setOrderType(OrderType.DineIn); }
        return unsubscribeFromChannel;
    }, []);

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => {
        if (!settings) return;
        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.fixedCost) || 0;
        const finalTotal = cartTotal + shippingCost + tipAmount;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer, items: cartItems, total: finalTotal, status: OrderStatus.Pending, branchId: 'main-branch',
            generalComments: generalComments + (tipAmount > 0 ? ` | Propina: $${tipAmount.toFixed(2)}` : ''),
            orderType, tableId: tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined, paymentProof: paymentProof || undefined,
        };

        try { await saveOrder(newOrder); } catch(e) { return alert("Error guardando pedido."); }

        let messageParts = [
            `🧾 *PEDIDO - ${settings.company.name.toUpperCase()}*`,
            `👤 Cliente: ${customer.name}`,
            `🏷️ Tipo: ${orderType}`,
            orderType === OrderType.Delivery ? `🏠 Dirección: ${customer.address.calle} #${customer.address.numero}, ${customer.address.colonia}` : '',
            customer.address.googleMapsLink ? `📍 *UBICACIÓN GPS:* ${customer.address.googleMapsLink}` : '',
            `-------------------`,
            ...cartItems.map(i => `• ${i.quantity}x ${i.name}`),
            `-------------------`,
            `*TOTAL A PAGAR: ${settings.company.currency.code} $${finalTotal.toFixed(2)}*`,
            `💳 Método: ${paymentMethod}`
        ];

        const whatsappUrl = `https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(messageParts.filter(p => p !== '').join('\n'))}`;
        window.open(whatsappUrl, '_blank');
        setLastWhatsappUrl(whatsappUrl); setView('confirmation');
    };

    if (isLoading || !settings) return <div className="h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-t-2 border-emerald-500 rounded-full" /></div>;

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative pb-24 border-x border-gray-800 shadow-2xl">
                {view !== 'menu' && <Header title={view === 'cart' ? 'Tu carrito' : 'Finalizar pedido'} onBack={() => setView(view === 'checkout' ? 'cart' : 'menu')} />}
                {view === 'menu' && (
                    <>
                        <RestaurantHero settings={settings} tableInfo={tableInfo} orderType={orderType} setOrderType={setOrderType} />
                        <MenuList products={allProducts} categories={allCategories} onProductClick={setSelectedProduct} cartItems={cartItems} currency={settings.company.currency.code} promotions={allPromotions} isLoading={isLoading} />
                    </>
                )}
                {view === 'cart' && <CartSummaryView cartItems={cartItems} cartTotal={cartTotal} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} generalComments={generalComments} onGeneralCommentsChange={setGeneralComments} onProceedToCheckout={() => setView('checkout')} />}
                {view === 'checkout' && <CheckoutView cartTotal={cartTotal} onPlaceOrder={handlePlaceOrder} settings={settings} orderType={orderType} />}
                {view === 'confirmation' && <OrderConfirmation onNewOrder={() => { clearCart(); setView('menu'); }} settings={settings} />}
                {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={(p, q, c, o) => { addToCart(p, q, c, o); setSelectedProduct(null); }} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
                {view === 'menu' && itemCount > 0 && <footer className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-20"><button onClick={() => setView('cart')} className="w-full bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex justify-between shadow-2xl transition-transform active:scale-95"><span>Ver Pedido ({itemCount})</span><span>${cartTotal.toFixed(2)}</span></button></footer>}
                <Chatbot />
            </div>
        </div>
    );
}
