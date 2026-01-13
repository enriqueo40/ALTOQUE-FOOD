
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
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>Para recoger</button>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-gray-800 w-full max-w-xs">
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{orderType === OrderType.TakeAway ? "Tiempo recogida" : "Tiempo envío"}</p>
                            <p className="text-white font-medium">{orderType === OrderType.TakeAway ? `${shipping.pickupTime.min} min` : `${shipping.deliveryTime.min}-${shipping.deliveryTime.max} min`}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Costo envío</p>
                            <p className="text-white font-medium">{getShippingCostText()}</p>
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
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate) {
            const end = new Date(p.endDate);
            end.setHours(23, 59, 59, 999);
            if (now > end) return false;
        }
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

const ProductRow: React.FC<{ product: Product; quantityInCart: number; onClick: () => void; currency: string; promotions: Promotion[] }> = ({ product, quantityInCart, onClick, currency, promotions }) => {
    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);
    const hasDiscount = promotion !== undefined;

    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 hover:bg-gray-750 active:scale-[0.99] transition-all cursor-pointer border border-gray-700 shadow-sm group relative overflow-hidden">
            {hasDiscount && (
                <div className="absolute top-0 left-0 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-br-lg z-10 shadow-lg flex flex-col items-center">
                    <span>-{promotion.discountType === DiscountType.Percentage ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}</span>
                    <span className="text-[6px] opacity-80 uppercase -mt-0.5">OFERTA</span>
                </div>
            )}
            <div className="relative h-24 w-24 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                {quantityInCart > 0 && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-gray-900">
                        {quantityInCart}
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h3 className="font-bold text-gray-100 leading-tight group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        {product.name}
                        {hasDiscount && <IconTag className="h-3 w-3 text-rose-500" />}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1 leading-snug">{product.description}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        {hasDiscount && (
                            <span className="text-[10px] text-gray-500 line-through font-medium opacity-60">{currency} ${product.price.toFixed(2)}</span>
                        )}
                        <p className={`font-black text-lg ${hasDiscount ? 'text-rose-500' : 'text-white'}`}>{currency} ${discountedPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-1.5 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                        <IconPlus className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MenuList: React.FC<{
    products: Product[],
    categories: Category[],
    onProductClick: (product: Product) => void, 
    cartItems: CartItem[], 
    currency: string, 
    promotions: Promotion[]
}> = ({ products, categories, onProductClick, cartItems, currency, promotions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');
    
    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].id);
        }
    }, [categories, activeCategory]);

    const productQuantities = useMemo(() => {
        const quantities: { [productId: string]: number } = {};
        cartItems.forEach(item => {
            quantities[item.id] = (quantities[item.id] || 0) + item.quantity;
        });
        return quantities;
    }, [cartItems]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.available && 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const groupedProducts = useMemo(() => {
        const standardGroups = categories
            .map(category => ({
                ...category,
                products: filteredProducts.filter(p => p.categoryId === category.id)
            }))
            .filter(category => category.products.length > 0);

        const categoryIds = new Set(categories.map(c => c.id));
        const orphanedProducts = filteredProducts.filter(p => !categoryIds.has(p.categoryId));

        if (orphanedProducts.length > 0) {
            standardGroups.push({ id: 'uncategorized', name: 'Otros', products: orphanedProducts });
        }
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

    return (
        <div className="pb-24">
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur shadow-lg pt-2">
                <div className="px-4 mb-2">
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                        <input type="text" placeholder="Buscar productos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" />
                    </div>
                </div>
                <div className="flex overflow-x-auto pb-3 pt-1 px-4 gap-2 hide-scrollbar scroll-smooth">
                    {groupedProducts.map(category => (
                         <button key={category.id} onClick={() => handleCategoryClick(category.id)} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${activeCategory === category.id ? 'bg-white text-gray-900 border-white shadow-glow' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}>{category.name}</button>
                    ))}
                </div>
            </div>

            <div className="px-4 mt-4 space-y-8">
                {groupedProducts.length > 0 ? groupedProducts.map(category => (
                    <div key={category.id} id={`category-${category.id}`} className="scroll-mt-40">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">{category.name} <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.products.length}</span></h2>
                        <div className="grid gap-4">
                            {category.products.map(product => (
                                <ProductRow key={product.id} product={product} quantityInCart={productQuantities[product.id] || 0} onClick={() => onProductClick(product)} currency={currency} promotions={promotions} />
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-gray-500"><p>No encontramos productos que coincidan con "{searchTerm}"</p></div>
                )}
            </div>
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};

const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number, comments?: string, options?: PersonalizationOption[]) => void, 
    onClose: () => void,
    personalizations: Personalization[],
    promotions: Promotion[],
    currency: string
}> = ({product, onAddToCart, onClose, personalizations, promotions, currency}) => {
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

    let totalOptionsPrice = 0;
    (Object.values(selectedOptions) as PersonalizationOption[][]).forEach(group => group.forEach(opt => { totalOptionsPrice += Number(opt.price || 0); }));
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20 backdrop-blur-md transition-colors shadow-lg"><IconX className="h-6 w-6" /></button>
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent h-full w-full pointer-events-none"></div>
                     {promotion && <div className="absolute top-6 left-6 bg-rose-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-xl z-10 animate-bounce-short uppercase tracking-wider">¡Super Oferta!</div>}
                </div>
                <div className="p-6 flex-grow overflow-y-auto -mt-12 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-3xl font-black text-white">{product.name}</h2>
                        {promotion && (
                            <div className="text-right">
                                <span className="text-gray-500 line-through text-sm font-medium">{currency} ${product.price.toFixed(2)}</span>
                                <p className="text-rose-500 text-xl font-black">-{promotion.discountType === DiscountType.Percentage ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}</p>
                            </div>
                        )}
                    </div>
                    {promotion && (
                        <div className="mb-4 flex items-center gap-2 bg-rose-900/20 border border-rose-500/30 p-2.5 rounded-xl animate-pulse-subtle">
                            <IconTag className="h-4 w-4 text-rose-500" />
                            <p className="text-xs font-bold text-rose-400">Promoción activa: {promotion.name}</p>
                        </div>
                    )}
                    <p className="text-gray-300 leading-relaxed mb-8">{product.description}</p>
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-white">{p.name}</h4>
                                    <span className="text-xs text-gray-400">{p.maxSelection === 1 ? 'Elige 1' : `Máx ${p.maxSelection || 'ilimitado'}`}</span>
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = (selectedOptions[p.id] || []).some(o => o.id === opt.id);
                                        return (
                                            <div key={opt.id} onClick={() => handleOptionToggle(p, opt)} className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500 ring-1 border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-500'}`}>{isSelected && <IconCheck className="h-3 w-3" />}</div>
                                                    <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{opt.name}</span>
                                                </div>
                                                {opt.price > 0 && <span className="text-sm text-emerald-400">+${opt.price.toFixed(2)}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-3xl sm:rounded-b-2xl safe-bottom">
                    <div className="flex items-center justify-between gap-4 mb-4">
                         <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Cantidad</span>
                         <div className="flex items-center gap-6 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button onClick={() => {
                        const flatOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc: PersonalizationOption[], curr: PersonalizationOption[]) => acc.concat(curr), []);
                        onAddToCart({ ...product, price: basePrice }, quantity, comments, flatOptions);
                    }} className="w-full font-black py-4 px-6 rounded-xl transition-all transform active:scale-[0.98] shadow-2xl flex justify-between items-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/50">
                        <span className="uppercase tracking-tight">Agregar al pedido</span>
                        <span className="text-xl">${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
            <style>{`@keyframes bounce-short { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } } .animate-bounce-short { animation: bounce-short 2s infinite ease-in-out; } @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } } .animate-pulse-subtle { animation: pulse-subtle 3s infinite ease-in-out; }`}</style>
        </div>
    );
}

const FooterBar: React.FC<{ itemCount: number, cartTotal: number, onViewCart: () => void }> = ({ itemCount, cartTotal, onViewCart }) => {
    return (
         <footer className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-20 animate-slide-up">
            <button onClick={onViewCart} className="w-full bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl shadow-emerald-900/50 hover:bg-emerald-400 transition-transform hover:-translate-y-1 active:translate-y-0">
                <div className="flex items-center gap-3"><div className="bg-emerald-700/50 px-3 py-1 rounded-lg text-sm font-extrabold border border-emerald-400/30">{itemCount}</div><span>Ver Pedido</span></div>
                <span className="text-lg">${cartTotal.toFixed(2)}</span>
            </button>
        </footer>
    );
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
        const intervalId = setInterval(fetchMenuData, 30000);
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) { setTableInfo({ table, zone }); setOrderType(OrderType.DineIn); }
        return () => { unsubscribeFromChannel(); clearInterval(intervalId); };
    }, []);

    if (isLoading || !settings) return <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div><p className="animate-pulse">Sincronizando menú...</p></div>;

    return (
        <div className="bg-gray-900 min-h-screen font-sans text-gray-100 selection:bg-emerald-500 selection:text-white">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen shadow-2xl relative pb-24 border-x border-gray-800">
                {view !== 'menu' && <Header title={view === 'cart' ? 'Tu pedido' : view === 'checkout' ? 'Completa tu pedido' : 'Confirmación'} onBack={() => setView(view === 'checkout' ? 'cart' : 'menu')} />}
                {view === 'menu' && <><RestaurantHero settings={settings} tableInfo={tableInfo} orderType={orderType} setOrderType={setOrderType} /><MenuList products={allProducts} categories={allCategories} onProductClick={setSelectedProduct} cartItems={cartItems} currency={settings.company.currency.code} promotions={allPromotions} /></>}
                {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={(p, q, c, o) => { addToCart(p, q, c, o); setSelectedProduct(null); }} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} currency={settings.company.currency.code} />}
                {view === 'menu' && itemCount > 0 && <FooterBar itemCount={itemCount} cartTotal={cartTotal} onViewCart={() => setView('cart')} />}
                <Chatbot />
            </div>
        </div>
    );
}
