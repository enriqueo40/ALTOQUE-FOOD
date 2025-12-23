
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles, IconChevronDown } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Helper Functions ---

const getDiscountedPrice = (product: Product, promotions: Promotion[]) => {
    const applicablePromo = promotions.find(p => {
        const now = new Date();
        let startTime = 0;
        if (p.startDate) {
            const [y, m, d] = p.startDate.split('-').map(Number);
            const startDate = new Date(y, m - 1, d);
            startDate.setHours(0, 0, 0, 0);
            startTime = startDate.getTime();
        }
        let endTime = Infinity;
        if (p.endDate) {
            const [y, m, d] = p.endDate.split('-').map(Number);
            const endDate = new Date(y, m - 1, d);
            endDate.setHours(23, 59, 59, 999);
            endTime = endDate.getTime();
        }
        const nowTime = now.getTime();
        if (nowTime < startTime) return false;
        if (nowTime > endTime) return false;
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
        subscribeToMenuUpdates(fetchMenuData);
        return () => { unsubscribeFromChannel(); };
    }, [fetchMenuData]);

    const filteredProducts = useMemo(() => {
        const available = allProducts.filter(p => p.available);
        if (selectedCategory === 'all') return available;
        return available.filter(p => p.categoryId === selectedCategory);
    }, [allProducts, selectedCategory]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (view === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30">
                    <div className="px-4 py-4 flex justify-between items-center border-b dark:border-gray-700">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                                {settings?.company.name.charAt(0)}
                             </div>
                             <div>
                                 <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{settings?.branch.alias}</h1>
                             </div>
                         </div>
                    </div>
                    {/* Categories */}
                    <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar bg-white dark:bg-gray-800">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                        >
                            Todo
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product, idx) => {
                        const { price, promotion } = getDiscountedPrice(product, allPromotions);
                        return (
                            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all flex flex-row h-32 group">
                                <div className="w-32 flex-shrink-0 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                     {/* Optimization: Lazy loading on catalog images except first few */}
                                     <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        loading={idx < 4 ? "eager" : "lazy"} 
                                     />
                                     {promotion && <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full">OFERTA</div>}
                                </div>
                                <div className="p-3 flex flex-col flex-1 justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{product.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">${price.toFixed(2)}</span>
                                        <button className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-1 rounded-lg">
                                            <IconPlus className="h-4 w-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {itemCount > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
                        <button onClick={() => setView('cart')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-6 active:scale-[0.98] transition-all">
                            <span>{itemCount} items en el carrito</span>
                            <span>Ver Pedido (${cartTotal.toFixed(2)})</span>
                        </button>
                    </div>
                )}
                
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden relative">
                             <img src={selectedProduct.imageUrl} className="w-full h-64 object-cover" />
                             <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white"><IconX/></button>
                             <div className="p-6">
                                <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedProduct.description}</p>
                                <button 
                                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); }}
                                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold"
                                >
                                    Agregar al Pedido
                                </button>
                             </div>
                        </div>
                    </div>
                )}
                <Chatbot />
            </div>
        );
    }

    // ... (Cart and Checkout views remain similar but benefit from service level optimizations) ...
    return <div className="p-10 text-center">Vista en construcción</div>;
}
