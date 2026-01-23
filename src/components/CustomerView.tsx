
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconDuplicate, IconUpload, Skeleton } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800 transition-colors">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-bold text-white capitalize">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const RestaurantHero: React.FC<{ 
    settings: AppSettings, 
    tableInfo: { table: string, zone: string } | null,
    orderType: OrderType,
    setOrderType: (type: OrderType) => void
}> = ({ settings, tableInfo, orderType, setOrderType }) => {
    const { branch, company, shipping, schedules } = settings;
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
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
                        <span className={`text-xs font-bold ${isOpenNow ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isOpenNow ? 'Abierto Ahora' : 'Cerrado'}
                        </span>
                    </div>
                </div>

                {tableInfo ? (
                    <div className="w-full p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl flex items-center justify-center gap-3 animate-fade-in">
                        <IconTableLayout className="h-5 w-5 text-emerald-400" />
                        <p className="font-medium text-emerald-200 text-sm">Estás en la mesa <span className="font-bold text-white">{tableInfo.table}</span> ({tableInfo.zone})</p>
                    </div>
                ) : (
                    <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative mb-4 shadow-inner">
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-700 rounded-full transition-transform duration-300 ease-out shadow-sm ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                        <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.Delivery ? 'text-emerald-400' : 'text-gray-400'}`}>A domicilio</button>
                        <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${orderType === OrderType.TakeAway ? 'text-emerald-400' : 'text-gray-400'}`}>Para recoger</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Fix: Re-added getDiscountedPrice helper function
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

// Fix: Re-added ProductRow component
const ProductRow: React.FC<{ product: Product; quantityInCart: number; onClick: () => void; currency: string; promotions: Promotion[] }> = ({ product, quantityInCart, onClick, currency, promotions }) => {
    const { price: discountedPrice, promotion } = getDiscountedPrice(product, promotions);
    const hasDiscount = promotion !== undefined;

    return (
        <div onClick={onClick} className="bg-gray-800 rounded-xl p-3 flex gap-4 hover:bg-gray-750 active:scale-[0.99] transition-all cursor-pointer border border-gray-700 shadow-sm group relative overflow-hidden">
            {hasDiscount && (
                <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">
                    -{promotion.discountType === DiscountType.Percentage ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}
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
                            <span className="text-xs text-gray-500 line-through">{currency} ${product.price.toFixed(2)}</span>
                        )}
                        <p className={`font-bold ${hasDiscount ? 'text-rose-400' : 'text-white'}`}>{currency} ${discountedPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-1.5 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <IconPlus className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Fix: Re-added MenuList component
const MenuList: React.FC<{
    products: Product[],
    categories: Category[],
    onProductClick: (product: Product) => void, 
    cartItems: CartItem[], 
    currency: string, 
    promotions: Promotion[],
    isLoading?: boolean
}> = ({ products, categories, onProductClick, cartItems, currency, promotions, isLoading }) => {
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
            standardGroups.push({
                id: 'uncategorized',
                name: 'Otros',
                products: orphanedProducts
            });
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
                        <input 
                            type="text" 
                            placeholder="Buscar productos..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                        />
                    </div>
                </div>
                
                <div className="flex overflow-x-auto pb-3 pt-1 px-4 gap-2 hide-scrollbar scroll-smooth">
                    {groupedProducts.map(category => (
                         <button 
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
                            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${
                                activeCategory === category.id 
                                ? 'bg-white text-gray-900 border-white shadow-glow' 
                                : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 mt-4 space-y-8">
                {groupedProducts.length > 0 ? groupedProducts.map(category => (
                    <div key={category.id} id={`category-${category.id}`} className="scroll-mt-40">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            {category.name}
                            <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.products.length}</span>
                        </h2>
                        <div className="grid gap-4">
                            {category.products.map(product => (
                                <ProductRow 
                                    key={product.id} 
                                    product={product} 
                                    quantityInCart={productQuantities[product.id] || 0} 
                                    onClick={() => onProductClick(product)} 
                                    currency={currency}
                                    promotions={promotions}
                                />
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>No encontramos productos que coincidan con "{searchTerm}"</p>
                    </div>
                )}
            </div>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

// Fix: Re-added ProductDetailModal component
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
        return (selectedOptions[pid] || []).some(o => o.id === oid);
    };

    let totalOptionsPrice = 0;
    const optionGroups = Object.values(selectedOptions);
    for (const group of optionGroups) {
        const options = group as PersonalizationOption[];
        for (const opt of options) {
            totalOptionsPrice += (Number(opt.price) || 0);
        }
    }
    
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;

    const handleAdd = () => {
        const flatOptions = (Object.values(selectedOptions) as PersonalizationOption[][]).reduce((acc, curr) => acc.concat(curr), []);
        onAddToCart({ ...product, price: basePrice }, quantity, comments, flatOptions);
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-10 backdrop-blur-md transition-colors">
                    <IconX className="h-6 w-6" />
                </button>

                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent h-full w-full pointer-events-none"></div>
                     {promotion && (
                        <div className="absolute bottom-12 left-6 bg-rose-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                            ¡Oferta Especial!
                        </div>
                     )}
                </div>

                <div className="p-6 flex-grow overflow-y-auto -mt-12 relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-300 leading-relaxed mb-6">{product.description}</p>
                    
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <div><h4 className="font-bold text-white">{p.name}</h4></div>
                                    <span className="text-xs text-gray-400">
                                        {p.maxSelection === 1 ? 'Elige 1' : `Máx ${p.maxSelection || 'ilimitado'}`}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = isOptionSelected(p.id, opt.id);
                                        return (
                                            <div 
                                                key={opt.id} 
                                                onClick={() => handleOptionToggle(p, opt)}
                                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 shadow-lg' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-500'}`}>
                                                        {isSelected && <IconCheck className="h-3 w-3" />}
                                                    </div>
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

                    <div className="mt-6">
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Instrucciones especiales</label>
                        <textarea 
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                            placeholder="Ej. Sin cebolla, salsa aparte..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-3xl sm:rounded-b-2xl safe-bottom">
                    <div className="flex items-center justify-between gap-4 mb-4">
                         <span className="text-gray-400 font-medium">Cantidad</span>
                         <div className="flex items-center gap-6 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button onClick={handleAdd} className="w-full font-bold py-4 px-6 rounded-xl transition-all transform active:scale-[0.98] shadow-lg flex justify-between items-center bg-emerald-500 hover:bg-emerald-600 text-white">
                        <span>Agregar al pedido</span><span>${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Fix: Re-added CartSummaryView component
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
                <textarea 
                    value={generalComments}
                    onChange={(e) => onGeneralCommentsChange(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="¿Algo más que debamos saber?"
                />
            </div>

             <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 shadow-2xl p-4 safe-bottom z-30">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-gray-400">Total estimado</span>
                    <span className="font-bold text-2xl text-white">${cartTotal.toFixed(2)}</span>
                </div>
                 <button onClick={onProceedToCheckout} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform active:scale-[0.98]">
                    Continuar
                </button>
            </div>
        </div>
    )
}

const CheckoutView: React.FC<{ cartTotal: number, onPlaceOrder: (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number, paymentProof?: string | null) => void, settings: AppSettings, orderType: OrderType }> = ({ cartTotal, onPlaceOrder, settings, orderType }) => {
    const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '', googleMapsLink: '' } });
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
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización. Ingresa la dirección manualmente.");
            return;
        }

        setIsLocating(true);
        
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                console.log(`GPS Capturado. Precisión: ${accuracy} metros.`);
                const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
                
                setCustomer(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, googleMapsLink: link } 
                }));
                
                setIsLocating(false);
            },
            (err) => {
                setIsLocating(false);
                console.error("Error GPS:", err);
                let msg = "No pudimos obtener tu ubicación.";
                if (err.code === 1) msg = "Debes permitir el acceso al GPS en tu navegador para usar esta función.";
                if (err.code === 3) msg = "La señal GPS es muy débil. Intenta de nuevo o ingresa la dirección manualmente.";
                alert(msg);
            },
            geoOptions
        );
    };

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setPaymentProof(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const shippingCost = (isDelivery && settings.shipping.fixedCost) ? Number(settings.shipping.fixedCost) : 0;
    const finalTotal = cartTotal + shippingCost + tipAmount;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onPlaceOrder(customer, selectedPaymentMethod, tipAmount, paymentProof); }} className="p-4 space-y-6 pb-44 animate-fade-in">
            {/* Datos Personales */}
            <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> Tus datos</h3>
                <input type="text" value={customer.name} onChange={e => setCustomer(c => ({...c, name: e.target.value}))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre completo" required />
                <input type="tel" value={customer.phone} onChange={e => setCustomer(c => ({...c, phone: e.target.value}))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="WhatsApp (Ej: 04121234567)" required />
            </div>

            {/* Sección de Entrega con GPS Mejorado */}
            {isDelivery && (
                <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                    <div className="flex flex-col gap-3">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> Lugar de entrega</h3>
                        
                        <button 
                            type="button" 
                            onClick={handleGetLocation} 
                            disabled={isLocating} 
                            className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${customer.address.googleMapsLink ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-900/20'}`}
                        >
                            {isLocating ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span className="animate-pulse">Capturando GPS...</span>
                                </div>
                            ) : (
                                <>
                                    {customer.address.googleMapsLink ? <IconCheck className="h-6 w-6"/> : <IconLocationMarker className="h-6 w-6"/>}
                                    <span>{customer.address.googleMapsLink ? '✓ GPS CAPTURADO' : '📍 COMPARTIR MI UBICACIÓN'}</span>
                                </>
                            )}
                        </button>
                        {customer.address.googleMapsLink && (
                            <p className="text-[10px] text-center text-emerald-400 font-mono bg-emerald-900/20 py-1 rounded border border-emerald-800/50">
                                Coordenadas registradas para el repartidor
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <input type="text" name="calle" value={customer.address.calle} onChange={handleAddressChange} className="col-span-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Calle / Avenida" required />
                        <input type="text" name="numero" value={customer.address.numero} onChange={handleAddressChange} className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Número casa/apto" required />
                        <input type="text" name="colonia" value={customer.address.colonia} onChange={handleAddressChange} className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Urbanización/Sector" required />
                    </div>
                    <input type="text" name="referencias" value={customer.address.referencias} onChange={handleAddressChange} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Punto de referencia (Ej: Frente al parque)" />
                </div>
            )}

            {/* Pago */}
            <div className="space-y-3 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                 <h3 className="font-bold text-lg text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> Método de pago</h3>
                 <div className="space-y-2">
                    {availablePaymentMethods.map(method => (
                        <label key={method} className={`flex justify-between items-center p-4 rounded-xl cursor-pointer border transition-all ${selectedPaymentMethod === method ? 'bg-emerald-900/20 border-emerald-500' : 'bg-gray-800 border-gray-700'}`}>
                            <span className="text-white font-medium">{method}</span>
                            <input type="radio" checked={selectedPaymentMethod === method} onChange={() => setSelectedPaymentMethod(method)} className="h-5 w-5 accent-emerald-500" />
                        </label>
                    ))}
                    {(selectedPaymentMethod === 'Pago Móvil' || selectedPaymentMethod === 'Transferencia') && (
                         <div className="mt-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 text-center">
                             <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Subir comprobante</p>
                             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-500 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                                <IconUpload className="w-8 h-8 text-gray-400 mb-1"/><p className="text-xs text-gray-400">Toca para cargar captura</p>
                                <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                             </label>
                             {paymentProof && <img src={paymentProof} className="mt-4 h-48 w-full object-contain rounded border border-emerald-500 shadow-lg" alt="Comprobante" />}
                         </div>
                    )}
                 </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 border-t border-gray-800 p-4 z-30 shadow-2xl safe-bottom">
                 <div className="flex justify-between font-bold text-xl text-white mb-4 px-2"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div>
                 <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-900/30 transition-transform active:scale-95">
                    <IconWhatsapp className="h-6 w-6" /> ENVIAR PEDIDO A WHATSAPP
                </button>
            </div>
        </form>
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

    const fetchData = async () => {
        try {
            const [s, pr, pe, pd, cat] = await Promise.all([getAppSettings(), getPromotions(), getPersonalizations(), getProducts(), getCategories()]);
            setSettings(s); setAllPromotions(pr); setAllPersonalizations(pe); setAllProducts(pd); setAllCategories(cat);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData(); subscribeToMenuUpdates(fetchData);
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        if (params.get('table')) { setTableInfo({ table: params.get('table')!, zone: params.get('zone')! }); setOrderType(OrderType.DineIn); }
        return unsubscribeFromChannel;
    }, []);

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tip: number, proof: string | null) => {
        if (!settings) return;
        const shipping = (orderType === OrderType.Delivery && settings.shipping.fixedCost) ? Number(settings.shipping.fixedCost) : 0;
        const finalTotal = cartTotal + shipping + tip;
        
        try {
            await saveOrder({ 
                customer, 
                items: cartItems, 
                total: finalTotal, 
                status: OrderStatus.Pending, 
                orderType, 
                paymentProof: proof || undefined, 
                generalComments: generalComments + (tip > 0 ? ` | Propina: $${tip.toFixed(2)}` : '') 
            });
            
            const msgParts = [
                `🧾 *NUEVO PEDIDO - ${settings.company.name.toUpperCase()}*`,
                `👤 *Cliente:* ${customer.name}`,
                `🏷️ *Tipo:* ${orderType}`,
                `--------------------------------`,
                orderType === OrderType.Delivery ? `🏠 *Dirección:* ${customer.address.calle} #${customer.address.numero}, ${customer.address.colonia}` : '',
                orderType === OrderType.Delivery && customer.address.referencias ? `👀 *Ref:* ${customer.address.referencias}` : '',
                customer.address.googleMapsLink ? `📍 *UBICACIÓN GPS:* ${customer.address.googleMapsLink}` : '',
                `--------------------------------`,
                ...cartItems.map(i => `• ${i.quantity}x ${i.name} - $${(i.price * i.quantity).toFixed(2)}`),
                `--------------------------------`,
                `💰 *TOTAL A PAGAR: $${finalTotal.toFixed(2)}*`,
                `💳 *Método de pago:* ${paymentMethod}`,
                `✅ _Pedido realizado desde el menú digital_`
            ];
            
            const msg = encodeURIComponent(msgParts.filter(Boolean).join('\n'));
            window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${msg}`, '_blank');
            setView('confirmation');
        } catch(e) { 
            console.error(e);
            alert("Error al procesar el pedido. Intenta de nuevo."); 
        }
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
                {view === 'confirmation' && (
                    <div className="p-6 text-center flex flex-col items-center justify-center h-[80vh] animate-fade-in">
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <IconCheck className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-bold mb-3 text-white">¡Pedido Enviado!</h3>
                        <p className="text-gray-400 mb-8 text-lg">Confirma tu pedido en WhatsApp ahora mismo.</p>
                        <button onClick={() => { clearCart(); setView('menu'); }} className="w-full max-w-xs bg-gray-800 text-white py-4 rounded-xl font-bold border border-gray-700">Volver al Inicio</button>
                    </div>
                )}
                {selectedProduct && <ProductDetailModal product={selectedProduct} onAddToCart={(p, q, c, o) => { addToCart(p, q, c, o); setSelectedProduct(null); }} onClose={() => setSelectedProduct(null)} personalizations={allPersonalizations} promotions={allPromotions} />}
                {view === 'menu' && itemCount > 0 && <footer className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-20"><button onClick={() => setView('cart')} className="w-full bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex justify-between shadow-2xl transition-all transform active:scale-95"><span>Ver Pedido ({itemCount})</span><span>${cartTotal.toFixed(2)}</span></button></footer>}
                <Chatbot />
            </div>
        </div>
    );
}
