
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

/**
 * Helper para calcular el precio final basándose en promociones activas
 */
const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filtrar promociones activas para la fecha de hoy
    const activePromos = promotions.filter(p => {
        const isDateActive = (!p.startDate || todayStr >= p.startDate) && (!p.endDate || todayStr <= p.endDate);
        if (!isDateActive) return false;

        // Si aplica a todos o si el producto está en la lista
        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds?.includes(product.id);
    });

    if (activePromos.length === 0) return { price: product.price };

    // Buscar la promoción que otorgue el mejor descuento
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;

    activePromos.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === DiscountType.Percentage) {
            currentPrice = product.price * (1 - (promo.discountValue / 100));
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
    const { price: finalPrice, promotion } = getDiscountedPrice(product, promotions);
    const hasDiscount = promotion !== undefined;

    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 hover:bg-gray-750 active:scale-[0.99] transition-all cursor-pointer border border-gray-700 shadow-sm group relative overflow-hidden">
            {/* Listón de Oferta */}
            {hasDiscount && (
                <div className="absolute top-0 left-0 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-br-lg z-10 shadow-lg flex items-center gap-1">
                    <IconTag className="h-3 w-3" />
                    <span>-{promotion.discountType === DiscountType.Percentage ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}</span>
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
                    <h3 className="font-bold text-gray-100 leading-tight group-hover:text-emerald-400 transition-colors">{product.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1 leading-snug">{product.description}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        {hasDiscount && (
                            <span className="text-[10px] text-gray-500 line-through mb-0.5">
                                {currency} ${product.price.toFixed(2)}
                            </span>
                        )}
                        <p className={`font-black text-lg ${hasDiscount ? 'text-rose-500' : 'text-white'}`}>
                            {currency} ${finalPrice.toFixed(2)}
                        </p>
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

    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);

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

    const isOptionSelected = (pid: string, oid: string) => {
        return (selectedOptions[pid] || []).some(o => o.id === oid);
    };

    let totalOptionsPrice = 0;
    (Object.values(selectedOptions) as PersonalizationOption[][]).forEach(group => group.forEach(opt => { totalOptionsPrice += Number(opt.price || 0); }));
    const totalPrice = (discountedPrice + totalOptionsPrice) * quantity;

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20 backdrop-blur-md transition-colors shadow-lg">
                    <IconX className="h-6 w-6" />
                </button>

                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent h-full w-full pointer-events-none"></div>
                     {promotion && (
                        <div className="absolute top-6 left-6 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-xl z-10 flex items-center gap-1.5 animate-pulse">
                            <IconTag className="h-3 w-3" />
                            OFERTA ACTIVA
                        </div>
                     )}
                </div>

                <div className="p-6 flex-grow overflow-y-auto -mt-12 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-3xl font-black text-white">{product.name}</h2>
                    </div>
                    {promotion && (
                        <div className="mb-4 flex items-center gap-2 bg-rose-900/20 border border-rose-500/30 p-2.5 rounded-xl">
                            <p className="text-xs font-bold text-rose-400">Promoción activa: {promotion.name}</p>
                        </div>
                    )}
                    <p className="text-gray-300 leading-relaxed mb-8">{product.description}</p>
                    
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-white">{p.name}</h4>
                                    <span className="text-xs text-gray-400">
                                        {p.maxSelection === 1 ? 'Elige 1' : `Máx ${p.maxSelection || 'ilimitado'}`}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = isOptionSelected(p.id, opt.id);
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

                    <div className="mt-8">
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Instrucciones especiales</label>
                        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full p-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none shadow-inner" placeholder="Ej. Sin cebolla, salsa aparte..." />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-3xl sm:rounded-b-2xl safe-bottom">
                    <div className="flex items-center justify-between gap-4 mb-4">
                         <div className="flex flex-col">
                            {promotion && (
                                <span className="text-xs text-gray-500 line-through">
                                    {currency} ${product.price.toFixed(2)}
                                </span>
                            )}
                            <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Total Unitario: <span className={promotion ? 'text-rose-400' : 'text-emerald-400'}>${(totalPrice / quantity).toFixed(2)}</span></span>
                         </div>
                         <div className="flex items-center gap-6 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button onClick={() => {
                        const flatOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc: PersonalizationOption[], curr: PersonalizationOption[]) => acc.concat(curr), []);
                        // Pasar el producto con el precio descontado al carrito
                        onAddToCart({ ...product, price: discountedPrice }, quantity, comments, flatOptions);
                    }} className="w-full font-black py-4 px-6 rounded-xl transition-all transform active:scale-[0.98] shadow-2xl flex justify-between items-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/50">
                        <span className="uppercase tracking-tight">Agregar al pedido</span>
                        <span className="text-xl">${totalPrice.toFixed(2)}</span>
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
    
    if (cartItems.length === 0) {
        return (
            <div className="p-8 text-center h-[calc(100vh-80px)] flex flex-col items-center justify-center text-gray-400">
                 <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <IconClock className="h-10 w-10 opacity-50" />
                 </div>
                 <h2 className="text-2xl font-bold mb-2 text-white">Tu carrito está vacío</h2>
                 <p className="mb-8">¿Hambre? Explora nuestro menú y encuentra algo delicioso.</p>
                 <button onClick={() => window.history.back()} className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors">Ir al Menú</button>
            </div>
        )
    }

    return (
        <div className="p-4 pb-40 animate-fade-in">
            <div className="space-y-4">
                {cartItems.map(item => {
                    const options: PersonalizationOption[] = item.selectedOptions || [];
                    let optionsTotal = 0;
                    for (const o of options) {
                        optionsTotal += Number(o.price || 0);
                    }
                    const itemTotal = (Number(item.price || 0) + optionsTotal) * item.quantity;

                    return (
                        <div key={item.cartItemId} className="flex gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover"/>
                            <div className="flex-grow flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-100">{item.name}</h3>
                                    <p className="font-bold text-emerald-400">${itemTotal.toFixed(2)}</p>
                                </div>
                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                        {item.selectedOptions.map((opt, idx) => (
                                            <span key={idx} className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-md border border-gray-700">
                                                {opt.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {item.comments && <p className="text-xs text-gray-400 italic line-clamp-1">"{item.comments}"</p>}
                                
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-1 border border-gray-700">
                                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.cartItemId, item.quantity - 1) : onRemoveItem(item.cartItemId)} className="p-1.5 text-gray-300 hover:text-white"><IconMinus className="h-4 w-4"/></button>
                                        <span className="font-bold w-4 text-center text-sm text-white">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="p-1.5 text-gray-300 hover:text-white"><IconPlus className="h-4 w-4"/></button>
                                    </div>
                                    <button onClick={() => onRemoveItem(item.cartItemId)} className="text-gray-500 hover:text-red-400 p-2"><IconTrash className="h-5 w-5"/></button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            
             <div className="mt-8">
                <label className="font-bold text-gray-300 block mb-2">Comentarios generales</label>
                <textarea value={generalComments} onChange={(e) => onGeneralCommentsChange(e.target.value)} rows={2} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="¿Algo más que debamos saber?" />
            </div>

             <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 shadow-2xl p-4 safe-bottom z-30">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-gray-400">Total estimado</span>
                    <span className="font-bold text-2xl text-white">${cartTotal.toFixed(2)}</span>
                </div>
                 <button onClick={onProceedToCheckout} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98]">
                    Continuar
                </button>
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
        name: '', phone: '', address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '' }
    });
    const [tipAmount, setTipAmount] = useState<number>(0);
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    
    const isDelivery = orderType === OrderType.Delivery;
    const isPickup = orderType === OrderType.TakeAway;
    const isDineIn = orderType === OrderType.DineIn;

    const availablePaymentMethods = isDelivery 
        ? settings.payment.deliveryMethods 
        : settings.payment.pickupMethods;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(availablePaymentMethods[0] || 'Efectivo');

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({
            ...prev,
            address: { ...prev.address, [name]: value }
        }));
    };

    const handleTipSelection = (percentage: number) => {
        setTipAmount(cartTotal * (percentage / 100));
    };

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProof(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPlaceOrder(customer, selectedPaymentMethod, tipAmount, paymentProof);
    };

    const inputClasses = "w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-500 transition-all";
    const labelClasses = "text-sm font-bold text-gray-400 mb-1 block";

    const shippingCost: number = (isDelivery && settings.shipping.costType === ShippingCostType.Fixed) ? (Number(settings.shipping.fixedCost) || 0) : 0;
    const finalTotal = (Number(cartTotal) || 0) + Number(shippingCost) + (Number(tipAmount) || 0);
    
    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-44 animate-fade-in">
            <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full inline-block"></span> Tus datos</h3>
                <div>
                    <label className={labelClasses}>Nombre</label>
                    <input type="text" value={customer.name} onChange={e => setCustomer(c => ({...c, name: e.target.value}))} className={inputClasses} placeholder="Tu nombre completo" required />
                </div>
                 {!isDineIn && (
                    <div>
                        <label className={labelClasses}>Número telefónico</label>
                        <input type="tel" value={customer.phone} onChange={e => setCustomer(c => ({...c, phone: e.target.value}))} className={inputClasses} placeholder="WhatsApp o celular" required />
                    </div>
                )}
            </div>

            {isDelivery && (
                <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full inline-block"></span> Entrega</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClasses}>Calle</label>
                            <input type="text" name="calle" value={customer.address.calle} onChange={handleAddressChange} className={inputClasses} required />
                        </div>
                        <div>
                            <label className={labelClasses}>Número Ext.</label>
                            <input type="text" name="numero" value={customer.address.numero} onChange={handleAddressChange} className={inputClasses} required />
                        </div>
                         <div>
                            <label className={labelClasses}>Colonia</label>
                            <input type="text" name="colonia" value={customer.address.colonia} onChange={handleAddressChange} className={inputClasses} required />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>Referencias <span className="font-normal text-gray-500 text-xs">(Opcional)</span></label>
                        <input type="text" name="referencias" value={customer.address.referencias} onChange={handleAddressChange} className={inputClasses} placeholder="Color de casa, portón, etc." />
                    </div>
                </div>
            )}
            
            {isPickup && (
                 <div className="p-5 bg-emerald-900/20 border border-emerald-800/50 rounded-2xl text-center">
                    <IconStore className="h-10 w-10 text-emerald-500 mx-auto mb-2"/>
                    <h3 className="font-bold text-white">Recoger en Tienda</h3>
                    <p className="text-sm text-gray-400 mt-1">No olvides pasar a recoger tu pedido.</p>
                    <p className="text-sm text-gray-400 mt-1 font-medium">{settings.branch.fullAddress}</p>
                </div>
            )}

            {settings.payment.showTipField && (
                <div className="space-y-3 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full inline-block"></span> Propina para el equipo</h3>
                    <div className="flex gap-2">
                        {[10, 15, 20].map(pct => (
                            <button key={pct} type="button" onClick={() => handleTipSelection(pct)} className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-all ${Math.abs(tipAmount - (cartTotal * pct / 100)) < 0.1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>{pct}%</button>
                        ))}
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input type="number" placeholder="Otro" value={tipAmount || ''} onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} className="w-full py-2 pl-6 pr-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-emerald-500 outline-none" />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                 <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full inline-block"></span> Pago</h3>
                 <div className="space-y-2 pt-2">
                    {availablePaymentMethods.map(method => (
                        <div key={method}>
                            <label className={`flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all border ${selectedPaymentMethod === method ? 'bg-emerald-900/20 border-emerald-500 ring-1 border-emerald-500 shadow-lg shadow-emerald-900/10' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                                <span className={`font-medium ${selectedPaymentMethod === method ? 'text-emerald-400' : 'text-white'}`}>{method}</span>
                                <input type="radio" name="payment" value={method} checked={selectedPaymentMethod === method} onChange={() => {setSelectedPaymentMethod(method); setPaymentProof(null);}} className="h-5 w-5 accent-emerald-500" />
                            </label>
                            
                            {(selectedPaymentMethod === method && (method === 'Pago Móvil' || method === 'Transferencia')) && (
                                <div className="mt-2 p-4 bg-gray-700/50 rounded-xl border border-gray-600 animate-fade-in">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-emerald-400 font-bold text-sm uppercase">Datos {method}</h4>
                                        <button type="button" onClick={() => {
                                            let text = '';
                                            if (method === 'Pago Móvil' && settings.payment.pagoMovil) {
                                                text = `Banco: ${settings.payment.pagoMovil.bank}\nTel: ${settings.payment.pagoMovil.phone}\nCI/RIF: ${settings.payment.pagoMovil.idNumber}`;
                                            } else if (method === 'Transferencia' && settings.payment.transfer) {
                                                text = `Banco: ${settings.payment.transfer.bank}\nCuenta: ${settings.payment.transfer.accountNumber}\nTitular: ${settings.payment.transfer.accountHolder}\nCI/RIF: ${settings.payment.transfer.idNumber}`;
                                            }
                                            navigator.clipboard.writeText(text);
                                            alert('Datos copiados');
                                        }} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><IconDuplicate className="h-3 w-3"/> Copiar</button>
                                    </div>
                                    <div className="text-sm text-gray-200 space-y-1 font-mono mb-4">
                                        {method === 'Pago Móvil' && settings.payment.pagoMovil && (
                                            <>
                                                <p><span className="text-gray-500">Banco:</span> {settings.payment.pagoMovil.bank}</p>
                                                <p><span className="text-gray-500">Teléfono:</span> {settings.payment.pagoMovil.phone}</p>
                                                <p><span className="text-gray-500">Cédula/RIF:</span> {settings.payment.pagoMovil.idNumber}</p>
                                            </>
                                        )}
                                        {method === 'Transferencia' && settings.payment.transfer && (
                                            <>
                                                <p><span className="text-gray-500">Banco:</span> {settings.payment.transfer.bank}</p>
                                                <p><span className="text-gray-500">Cuenta:</span> {settings.payment.transfer.accountNumber}</p>
                                                <p><span className="text-gray-500">Titular:</span> {settings.payment.transfer.accountHolder}</p>
                                                <p><span className="text-gray-500">Cédula/RIF:</span> {settings.payment.transfer.idNumber}</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-4 border-t border-gray-700/50 pt-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Comprobante de pago</p>
                                        {!paymentProof ? (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors bg-gray-800/30">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <IconUpload className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="text-xs text-gray-400 font-medium">Toca para subir captura</p>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                                            </label>
                                        ) : (
                                            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-emerald-500/50 shadow-lg">
                                                <img src={paymentProof} alt="Comprobante" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                     <button type="button" onClick={() => setPaymentProof(null)} className="bg-red-500 text-white p-3 rounded-full shadow-lg transform hover:scale-110 transition-transform"><IconTrash className="h-6 w-6" /></button>
                                                </div>
                                                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1"><IconCheck className="h-3 w-3" /> Cargado</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 shadow-2xl p-4 safe-bottom z-30">
                <div className="space-y-2 mb-4 text-sm px-2">
                     <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                    {isDelivery && (<div className="flex justify-between text-gray-400"><span>Envío</span><span>{shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : "Por cotizar"}</span></div>)}
                    {tipAmount > 0 && (<div className="flex justify-between text-emerald-400"><span>Propina</span><span>${tipAmount.toFixed(2)}</span></div>)}
                     <div className="flex justify-between font-bold text-xl text-white pt-2 border-t border-gray-800"><span>Total</span><span>${finalTotal.toFixed(2)} {isDelivery && shippingCost === 0 && "+ envío"}</span></div>
                </div>
                 <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]"><IconWhatsapp className="h-6 w-6" />Realizar Pedido</button>
            </div>
        </form>
    )
}

const OrderConfirmation: React.FC<{ onNewOrder: () => void, settings: AppSettings }> = ({ onNewOrder, settings }) => (
    <div className="p-6 text-center flex flex-col items-center justify-center h-[80vh] animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"><svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>
        <h3 className="text-3xl font-bold mb-3 text-white">¡Pedido Enviado!</h3>
        <p className="text-gray-400 mb-8 text-lg leading-relaxed">Te redirigimos a WhatsApp con los detalles de tu orden. El equipo de {settings.company.name} confirmará tu pedido en breve.</p>
        <button onClick={onNewOrder} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-700 transition-colors border border-gray-700">Volver al Inicio</button>
    </div>
);

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
        subscribeToMenuUpdates(fetchMenuData);
        
        const intervalId = setInterval(fetchMenuData, 30000);
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) { setTableInfo({ table, zone }); setOrderType(OrderType.DineIn); }
        
        return () => { 
            unsubscribeFromChannel(); 
            clearInterval(intervalId); 
        };
    }, []);

    const handleProductClick = (product: Product) => setSelectedProduct(product);
    const handleAddToCart = (product: Product, quantity: number, comments?: string, options: PersonalizationOption[] = []) => {
        // La lógica de addToCart ya maneja el objeto Product completo.
        // El precio promocional ya viene incluido en el objeto product pasado desde el Modal de detalle.
        addToCart(product, quantity, comments, options);
        setSelectedProduct(null);
    };

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0, paymentProof: string | null = null) => {
        if (!settings) return;
        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) ? (Number(settings.shipping.fixedCost) || 0) : 0;
        const finalTotal = cartTotal + shippingCost + tipAmount;
        const newOrder: Omit<Order, 'id' | 'createdAt'> = { customer, items: cartItems, total: finalTotal, status: OrderStatus.Pending, branchId: 'main-branch', generalComments: generalComments + (tipAmount > 0 ? ` | Propina: ${settings.company.currency.code} ${tipAmount.toFixed(2)}` : ''), orderType: orderType, tableId: orderType === OrderType.DineIn && tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined, paymentProof: paymentProof || undefined };
        try { await saveOrder(newOrder); } catch(e) { console.error(e); alert("Hubo un error al guardar tu pedido."); return; }
        const itemDetails = cartItems.map(item => `▪️ ${item.quantity}x ${item.name}${item.selectedOptions?.length ? `\n   + ${item.selectedOptions.map(o => o.name).join('\n   + ')}` : ''}${item.comments ? `\n   _Nota: ${item.comments}_` : ''}`);
        const currency = settings.company.currency.code;
        const lineSeparator = "━━━━━━━━━━━━━━━━━━━━";
        let messageParts = [`🧾 *TICKET DE PEDIDO*`, `📍 *${settings.company.name.toUpperCase()}*`, lineSeparator, `🗓️ Fecha: ${new Date().toLocaleDateString()}`, `⏰ Hora: ${new Date().toLocaleTimeString()}`, lineSeparator];
        if (orderType === OrderType.DineIn) messageParts.push(`🪑 *UBICACIÓN*\nZona: ${tableInfo?.zone}\nMesa: ${tableInfo?.table}\n👤 Cliente: ${customer.name}`, lineSeparator);
        else messageParts.push(`👤 *CLIENTE*\nNombre: ${customer.name}\nTel: ${customer.phone}\n🏷️ Tipo: ${orderType === OrderType.TakeAway ? 'Para llevar' : 'Domicilio'}`, lineSeparator);
        if (orderType === OrderType.Delivery) messageParts.push(`📍 *DIRECCIÓN*\n🏠 ${customer.address.calle} #${customer.address.numero}\n🏙️ Col. ${customer.address.colonia}${customer.address.referencias ? `\nRef: ${customer.address.referencias}` : ''}`, lineSeparator);
        messageParts.push(`🛒 *DETALLE*`, ...itemDetails, ``, generalComments ? `📝 *NOTAS:* ${generalComments}` : '', lineSeparator, `💰 *RESUMEN*\nSubtotal: ${currency} $${cartTotal.toFixed(2)}`, orderType === OrderType.Delivery ? `Envío: ${shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Por cotizar'}` : '', tipAmount > 0 ? `Propina: ${currency} $${tipAmount.toFixed(2)}` : '', `*TOTAL A PAGAR: ${currency} $${finalTotal.toFixed(2)}*`, lineSeparator, `💳 Método: ${paymentMethod}`, paymentProof ? "\n📸 *Comprobante adjunto*" : "", `✅ Estado: PENDIENTE`);
        window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(messageParts.filter(p => p !== '').join('\n'))}`, '_blank');
        setView('confirmation');
    };

    if (isLoading || !settings) return <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div><p className="animate-pulse">Sincronizando menú...</p></div>;

    return (
        <div className="bg-gray-900 min-h-screen font-sans text-gray-100 selection:bg-emerald-500 selection:text-white">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen shadow-2xl relative pb-24 border-x border-gray-800">
                {view !== 'menu' && <Header title={view === 'cart' ? 'Tu pedido' : view === 'checkout' ? 'Completa tu pedido' : 'Confirmación'} onBack={view === 'cart' || view === 'checkout' ? () => setView(view === 'checkout' ? 'cart' : 'menu') : undefined} />}
                {view === 'menu' && (
                    <><RestaurantHero settings={settings} tableInfo={tableInfo} orderType={orderType} setOrderType={setOrderType} /><MenuList products={allProducts} categories={allCategories} onProductClick={handleProductClick} cartItems={cartItems} currency={settings.company.currency.code} promotions={allPromotions} /></>
                )}
                {view === 'cart' && <CartSummaryView cartItems={cartItems} cartTotal={cartTotal} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} generalComments={generalComments} onGeneralCommentsChange={setGeneralComments} onProceedToCheckout={() => setView('checkout')} />}
                {view === 'checkout' && <CheckoutView cartTotal={cartTotal} onPlaceOrder={handlePlaceOrder} settings={settings} orderType={orderType} />}
                {view === 'confirmation' && <OrderConfirmation onNewOrder={() => { clearCart(); setGeneralComments(''); setView('menu'); }} settings={settings} />}
                {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={handleAddToCart} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} currency={settings.company.currency.code} />}
                {view === 'menu' && itemCount > 0 && <FooterBar itemCount={itemCount} cartTotal={cartTotal} onViewCart={() => setView('cart')} />}
                <Chatbot />
            </div>
        </div>
    );
}
