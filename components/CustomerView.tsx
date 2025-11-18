

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder } from '../services/supabaseService';
import Chatbot from './Chatbot';

// Main View Manager
export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [generalComments, setGeneralComments] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const appSettings = await getAppSettings();
                setSettings(appSettings);
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
        
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
        }

    }, []);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handleAddToCart = (product: Product, quantity: number, comments?: string) => {
        addToCart(product, quantity, comments);
        setSelectedProduct(null);
    };

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod) => {
        if (!settings) return;

        const isTableOrder = !!tableInfo;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: cartTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments,
            orderType: isTableOrder ? OrderType.DineIn : OrderType.Delivery,
            tableId: isTableOrder ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
        };

        try {
            await saveOrder(newOrder);
        } catch(e) {
            console.error("Failed to save order", e);
            alert("Hubo un error al guardar tu pedido. Por favor, intenta de nuevo.");
            return; // Stop if saving fails
        }

        let messageParts: string[];

        if (isTableOrder) {
            messageParts = [
                `*🛎️ Nuevo Pedido en Mesa de ${settings.company.name.toUpperCase()}*`,
                `---------------------------------`,
                `*MESA:* ${tableInfo.zone} - ${tableInfo.table}`,
                 `*CLIENTE:* ${customer.name}`,
                `---------------------------------`,
                `*DETALLES DEL PEDIDO:*`,
                ...cartItems.map(item =>
                    `*${item.quantity}x ${item.name}*` + (item.comments ? `\n  - _Comentarios: ${item.comments}_` : '')
                ),
                ``,
                generalComments ? `*Comentarios Generales:*\n_${generalComments}_` : '',
                `---------------------------------`,
                `*Total:* ${settings.company.currency.code} $${cartTotal.toFixed(2)}`,
                `*Método de pago:* ${paymentMethod}`,
            ];
        } else {
            messageParts = [
                `*⭐ Nuevo Pedido de ${settings.company.name.toUpperCase()}*`,
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
                ...cartItems.map(item => 
                    `*${item.quantity}x ${item.name}*` + (item.comments ? `\n  - _Comentarios: ${item.comments}_` : '')
                ),
                ``,
                generalComments ? `*Comentarios Generales:*\n_${generalComments}_` : '',
                `---------------------------------`,
                `*Total:* ${settings.company.currency.code} $${cartTotal.toFixed(2)} + envío`,
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
            default: return settings?.company.name || 'Menú';
        }
    };
    
    const canGoBack = view === 'cart' || view === 'checkout';
    const handleBack = () => {
        if (view === 'checkout') setView('cart');
        else if (view === 'cart') setView('menu');
    }
    
    if (isLoading || !settings) {
        return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">Cargando...</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans dark:bg-gray-800">
            <div className="container mx-auto max-w-lg bg-white dark:bg-gray-900 min-h-screen shadow-lg relative pb-24">
                <Header title={getHeaderTitle()} onBack={canGoBack ? handleBack : undefined} />

                {view === 'menu' && (
                    <>
                        <RestaurantInfo settings={settings} tableInfo={tableInfo} />
                        <MenuList onProductClick={handleProductClick} cartItems={cartItems} />
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
                        isTableOrder={!!tableInfo}
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
    <header className="p-4 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-20 border-b dark:border-gray-700">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-700 dark:text-gray-200" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">{title}</h1>
        <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 dark:text-gray-300" aria-label="Historial de pedidos"><IconClock className="h-6 w-6" /></button>
            <button className="p-2 text-gray-600 dark:text-gray-300" aria-label="Compartir"><IconShare className="h-6 w-6" /></button>
        </div>
    </header>
);

const RestaurantInfo: React.FC<{ settings: AppSettings, tableInfo: { table: string, zone: string } | null }> = ({ settings, tableInfo }) => {
    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
    const { branch, company, shipping } = settings;

    const getShippingCostText = () => {
        if (shipping.costType === ShippingCostType.ToBeQuoted) return "Por definir";
        if (shipping.costType === ShippingCostType.Free) return "Gratis";
        if (shipping.costType === ShippingCostType.Fixed) return `$${shipping.fixedCost?.toFixed(2)}`;
        return "Por definir";
    };
    
    return (
        <div className="p-4 flex flex-col items-center text-center">
            {tableInfo && (
                <div className="w-full mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-lg flex items-center justify-center gap-3">
                    <IconTableLayout className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">¡Bienvenido! Estás ordenando desde la mesa: <span className="font-bold">{tableInfo.table}</span></p>
                </div>
            )}
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                 {branch.logoUrl ? 
                    <img src={branch.logoUrl} alt={`${company.name} logo`} className="w-full h-full object-cover" />
                    :
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                 }
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{company.name}</h1>
            {!tableInfo && (
                <>
                <div className="mt-4 flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 text-sm font-semibold">
                    <button onClick={() => setDeliveryType('delivery')} className={`px-6 py-2 rounded-full transition-colors ${deliveryType === 'delivery' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>A domicilio</button>
                    <button onClick={() => setDeliveryType('pickup')} className={`px-6 py-2 rounded-full transition-colors ${deliveryType === 'pickup' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>Para recoger</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm w-full max-w-xs">
                    <div className="text-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Tiempo envío</p>
                        <p className="text-gray-600 dark:text-gray-400">{shipping.deliveryTime.min} - {shipping.deliveryTime.max} mins</p>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Costo envío</p>
                        <p className="text-gray-600 dark:text-gray-400">{getShippingCostText()}</p>
                    </div>
                </div>
                </>
            )}
        </div>
    );
};

const MenuList: React.FC<{onProductClick: (product: Product) => void, cartItems: CartItem[]}> = ({ onProductClick, cartItems }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [fetchedProducts, fetchedCategories] = await Promise.all([
                    getProducts(),
                    getCategories()
                ]);
                setProducts(fetchedProducts);
                setCategories(fetchedCategories);
            } catch (err) {
                setError("No se pudo cargar el menú. Inténtalo de nuevo más tarde.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const productQuantities = useMemo(() => {
        const quantities: { [productId: string]: number } = {};
        cartItems.forEach(item => {
            quantities[item.id] = (quantities[item.id] || 0) + item.quantity;
        });
        return quantities;
    }, [cartItems]);

    const groupedProducts = useMemo(() => {
        return categories
            .map(category => ({
                ...category,
                products: products.filter(p => p.categoryId === category.id && p.available)
            }))
            .filter(category => category.products.length > 0);
    }, [products, categories]);

    if (isLoading) {
        return <div className="text-center p-10 text-gray-600 dark:text-gray-300">Cargando menú...</div>
    }
    
    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>
    }

    return (
        <div className="px-4 pb-24">
            {groupedProducts.map(category => (
                <div key={category.id} className="pt-6">
                    <h2 className="text-xl font-bold capitalize pb-2 border-b dark:border-gray-700 mb-4 text-gray-800 dark:text-gray-100">{category.name}</h2>
                    <div className="space-y-4">
                        {category.products.map(product => (
                            <ProductRow key={product.id} product={product} quantityInCart={productQuantities[product.id] || 0} onClick={() => onProductClick(product)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProductRow: React.FC<{ product: Product; quantityInCart: number; onClick: () => void }> = ({ product, quantityInCart, onClick }) => (
    <div onClick={onClick} className="flex items-start space-x-4 cursor-pointer group py-2">
        <div className="flex-1">
            <h3 className="font-semibold text-md text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{product.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{product.description}</p>
            <p className="mt-2 font-bold text-md text-gray-900 dark:text-gray-50">${product.price.toFixed(2)}</p>
        </div>
        <div className="relative">
            <img src={product.imageUrl} alt={product.name} className="w-28 h-28 rounded-lg object-cover" />
            <div className="absolute -bottom-2 right-10 bg-white dark:bg-gray-700 p-1 rounded-full shadow-md">
                 <IconPlus className="h-6 w-6 text-emerald-600" />
            </div>
             {quantityInCart > 0 && (
                <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-900">
                    {quantityInCart}
                </div>
            )}
        </div>
    </div>
);

const ProductDetailModal: React.FC<{product: Product, onAddToCart: (product: Product, quantity: number, comments?: string) => void, onClose: () => void}> = ({product, onAddToCart, onClose}) => {
    const [quantity, setQuantity] = useState(1);
    const [comments, setComments] = useState('');

    const handleAdd = () => {
        onAddToCart(product, quantity, comments);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-end" onClick={onClose}>
            <div className="w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-3 left-3 bg-white/70 dark:bg-black/70 p-2 rounded-full text-gray-800 dark:text-gray-200 z-10" aria-label="Cerrar">
                    <IconArrowLeft className="h-6 w-6" />
                </button>
                <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-cover rounded-t-2xl" />
                <div className="p-4 flex-grow overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{product.name}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">{product.description}</p>
                    <div className="mt-4">
                        <label className="font-semibold text-gray-800 dark:text-gray-200">Comentarios</label>
                        <textarea 
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={3}
                            className="w-full mt-2 p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Instrucciones especiales del producto."
                        />
                    </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full bg-white dark:bg-gray-600 shadow-sm"><IconMinus className="h-5 w-5"/></button>
                        <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                         <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full bg-white dark:bg-gray-600 shadow-sm"><IconPlus className="h-5 w-5"/></button>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="flex-grow bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Agregar producto ${ (product.price * quantity).toFixed(2) }
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
            <div className="p-4 text-center h-[calc(100vh-80px)] flex flex-col items-center justify-center">
                 <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Tu carrito está vacío</h2>
                 <p className="text-gray-500 dark:text-gray-400">Agrega productos del menú para continuar.</p>
            </div>
        )
    }

    return (
        <div className="p-4 pb-40">
            <div className="space-y-4">
                {cartItems.map(item => (
                    <div key={item.cartItemId} className="flex items-start gap-4">
                        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-md object-cover"/>
                        <div className="flex-grow">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{item.name}</h3>
                             <p className="font-bold text-gray-900 dark:text-gray-50">${item.price.toFixed(2)}</p>
                             <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                                    <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.cartItemId, item.quantity - 1) : onRemoveItem(item.cartItemId)} className="p-1 rounded-full"><IconMinus className="h-4 w-4"/></button>
                                    <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 rounded-full"><IconPlus className="h-4 w-4"/></button>
                                </div>
                                <button onClick={() => onRemoveItem(item.cartItemId)} className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 pr-2"><IconTrash className="h-5 w-5"/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-6">
                <label className="font-semibold text-gray-800 dark:text-gray-200">Comentarios generales</label>
                <textarea 
                    value={generalComments}
                    onChange={(e) => onGeneralCommentsChange(e.target.value)}
                    rows={2}
                    className="w-full mt-2 p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Instrucciones adicionales"
                />
            </div>
             <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
                </div>
                 <button onClick={onProceedToCheckout} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                    Continuar
                </button>
            </div>
        </div>
    )
}

const CheckoutView: React.FC<{cartTotal: number, onPlaceOrder: (customer: Customer, paymentMethod: PaymentMethod) => void, settings: AppSettings, isTableOrder: boolean}> = ({ cartTotal, onPlaceOrder, settings, isTableOrder }) => {
    const [customer, setCustomer] = useState<Customer>({
        name: '', phone: '', address: { colonia: '', calle: '', numero: '', entreCalles: '', referencias: '' }
    });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(settings.payment.deliveryMethods[0] || 'Efectivo');

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({
            ...prev,
            address: { ...prev.address, [name]: value }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPlaceOrder(customer, selectedPaymentMethod);
    };

    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-600";
    const labelClasses = "text-sm font-medium text-gray-700 dark:text-gray-300";

    const shippingCost = settings.shipping.costType === ShippingCostType.Fixed ? settings.shipping.fixedCost ?? 0 : 0;
    const finalTotal = cartTotal + (isTableOrder ? 0 : shippingCost);
    
    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-40">
            <div className="space-y-4 p-4 border dark:border-gray-700 rounded-lg">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Tus datos</h3>
                <div>
                    <label className={labelClasses}>Nombre</label>
                    <input type="text" value={customer.name} onChange={e => setCustomer(c => ({...c, name: e.target.value}))} className={inputClasses} required />
                </div>
                 {!isTableOrder && (
                    <div>
                        <label className={labelClasses}>Número telefónico</label>
                        <input type="tel" value={customer.phone} onChange={e => setCustomer(c => ({...c, phone: e.target.value}))} className={inputClasses} required />
                    </div>
                )}
            </div>

            {!isTableOrder && (
                <div className="space-y-4 p-4 border dark:border-gray-700 rounded-lg">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Dirección</h3>
                    <div>
                        <label className={labelClasses}>Colonia</label>
                        <input type="text" name="colonia" value={customer.address.colonia} onChange={handleAddressChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label className={labelClasses}>Calle</label>
                        <input type="text" name="calle" value={customer.address.calle} onChange={handleAddressChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label className={labelClasses}>Número <span className="font-normal text-gray-500">(Casa, Depto, edificio)</span></label>
                        <input type="text" name="numero" value={customer.address.numero} onChange={handleAddressChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label className={labelClasses}>Entre calles <span className="font-normal text-gray-500">(opcional)</span></label>
                        <input type="text" name="entreCalles" value={customer.address.entreCalles} onChange={handleAddressChange} className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Referencias <span className="font-normal text-gray-500">(opcional)</span></label>
                        <input type="text" name="referencias" value={customer.address.referencias} onChange={handleAddressChange} className={inputClasses} />
                    </div>
                </div>
            )}

            <div className="space-y-2 p-4 border dark:border-gray-700 rounded-lg">
                 <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Método de pago</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Elige con qué te gustaría pagar</p>
                 <div className="space-y-2 pt-2">
                    {settings.payment.deliveryMethods.map(method => (
                        <label key={method} className="flex justify-between items-center p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-900/50">
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{method}</span>
                            <input type="radio" name="payment" value={method} checked={selectedPaymentMethod === method} onChange={() => setSelectedPaymentMethod(method)} className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-400" />
                        </label>
                    ))}
                 </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-lg p-4">
                <div className="space-y-1 mb-2 text-sm">
                     <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Productos</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    {!isTableOrder && (
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                            <span>Costo de envío</span>
                            <span>{shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : "Por cotizar"}</span>
                        </div>
                    )}
                     <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-gray-50">
                        <span>Total</span>
                        <span>${finalTotal.toFixed(2)} {!isTableOrder && shippingCost === 0 && "+ envío"}</span>
                    </div>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 my-2">Al hacer click en Enviar pedido por WhatsApp aceptas nuestros Términos y Condiciones.</p>
                 <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                    <IconWhatsapp className="h-5 w-5" />
                    Enviar pedido por WhatsApp
                </button>
            </div>
        </form>
    )
}

const OrderConfirmation: React.FC<{ onNewOrder: () => void, settings: AppSettings }> = ({ onNewOrder, settings }) => (
    <div className="p-4 text-center flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <svg className="w-16 h-16 text-emerald-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-50">¡Pedido enviado!</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Tu pedido ha sido enviado por WhatsApp. Recibirás una confirmación de {settings.company.name} pronto.</p>
        <button onClick={onNewOrder} className="w-full max-w-xs bg-emerald-600 text-white py-3 rounded-md font-semibold hover:bg-emerald-700 transition-colors">
            Comenzar un nuevo pedido
        </button>
    </div>
);

const FooterBar: React.FC<{ itemCount: number, cartTotal: number, onViewCart: () => void }> = ({ itemCount, cartTotal, onViewCart }) => {
    return (
         <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 z-10">
            <button onClick={onViewCart} className="w-full bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex justify-between items-center shadow-lg hover:bg-emerald-700 transition-transform hover:scale-[1.02]">
                <span>Ver pedido ({itemCount})</span>
                <span>${cartTotal.toFixed(2)}</span>
            </button>
        </footer>
    );
};
