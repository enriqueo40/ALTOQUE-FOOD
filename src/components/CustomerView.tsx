
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconCheck, IconUpload, Skeleton } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// --- Subcomponentes del Cliente ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/90 backdrop-blur-md z-20 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-bold text-white uppercase tracking-tight">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const RestaurantHero: React.FC<{ settings: AppSettings, orderType: OrderType, setOrderType: (type: OrderType) => void }> = ({ settings, orderType, setOrderType }) => (
    <div className="relative pb-6 border-b border-gray-800">
        <div className="h-40 w-full overflow-hidden relative">
            {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>
        <div className="px-6 -mt-12 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-2xl mb-3 relative z-10 overflow-hidden border-2 border-emerald-500">
                {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500 text-2xl">{settings.company.name.slice(0,2)}</div>}
            </div>
            <h1 className="text-2xl font-bold text-white">{settings.company.name}</h1>
            <p className="text-sm text-gray-400 mb-4">{settings.branch.alias}</p>
            <div className="w-full max-w-xs bg-gray-800 rounded-full p-1 flex relative shadow-inner border border-gray-700">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-500 rounded-full transition-all duration-300 ${orderType === OrderType.TakeAway ? 'translate-x-full left-1' : 'left-1'}`}></div>
                <button onClick={() => setOrderType(OrderType.Delivery)} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${orderType === OrderType.Delivery ? 'text-white' : 'text-gray-500'}`}>A DOMICILIO</button>
                <button onClick={() => setOrderType(OrderType.TakeAway)} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${orderType === OrderType.TakeAway ? 'text-white' : 'text-gray-500'}`}>PARA RECOGER</button>
            </div>
        </div>
    </div>
);

const ProductDetailModal: React.FC<{ product: Product, onClose: () => void, onAddToCart: (p: Product, q: number) => void }> = ({ product, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <img src={product.imageUrl} className="h-56 w-full object-cover" />
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-400 text-sm mb-6">{product.description}</p>
                    <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-4 bg-gray-800 rounded-full px-2 py-1">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 text-white hover:bg-gray-700 rounded-full"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 text-white hover:bg-gray-700 rounded-full"><IconPlus className="h-5 w-5"/></button>
                        </div>
                        <span className="text-2xl font-bold text-emerald-400">${(product.price * quantity).toFixed(2)}</span>
                    </div>
                    <button onClick={() => onAddToCart(product, quantity)} className="w-full bg-emerald-500 py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform">AGREGAR AL PEDIDO</button>
                </div>
            </div>
        </div>
    );
};

const CartSummaryView: React.FC<{ items: CartItem[], total: number, onCheckout: () => void }> = ({ items, total, onCheckout }) => (
    <div className="p-4 space-y-4 pb-40">
        {items.map(i => (
            <div key={i.cartItemId} className="flex gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                <img src={i.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between">
                        <span className="font-bold">{i.name}</span>
                        <span className="font-bold text-emerald-400">${(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{i.quantity} unidad(es)</span>
                </div>
            </div>
        ))}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-900 border-t border-gray-800 shadow-2xl">
             <div className="flex justify-between font-bold text-xl mb-4"><span>Total</span><span>${total.toFixed(2)}</span></div>
             <button onClick={onCheckout} className="w-full bg-emerald-500 py-4 rounded-xl font-bold text-white">CONTINUAR AL CHECKOUT</button>
        </div>
    </div>
);

const MenuList: React.FC<{ products: Product[], categories: Category[], onProductClick: (p: Product) => void }> = ({ products, categories, onProductClick }) => (
    <div className="p-4 space-y-8">
        {categories.map(cat => {
            const catProds = products.filter(p => p.categoryId === cat.id && p.available);
            if (catProds.length === 0) return null;
            return (
                <div key={cat.id}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> {cat.name}</h3>
                    <div className="grid gap-3">
                        {catProds.map(p => (
                            <div key={p.id} onClick={() => onProductClick(p)} className="bg-gray-800/50 p-3 rounded-2xl border border-gray-800 flex gap-4 hover:bg-gray-800 transition-colors cursor-pointer active:scale-[0.98]">
                                <img src={p.imageUrl} className="w-20 h-20 rounded-xl object-cover" />
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <h4 className="font-bold leading-tight">{p.name}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>
                                    <span className="font-bold text-emerald-400">${p.price.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);

const CheckoutView: React.FC<{ total: number, onOrder: (c: Customer, p: PaymentMethod) => void, settings: AppSettings, orderType: OrderType }> = ({ total, onOrder, settings, orderType }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [calle, setCalle] = useState('');
    const [numero, setNumero] = useState('');
    const [colonia, setColonia] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [mapsLink, setMapsLink] = useState('');

    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert("GPS no disponible.");
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                setMapsLink(link);
                setIsLocating(false);
            },
            () => { alert("Permite el acceso al GPS para continuar."); setIsLocating(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onOrder({ name, phone, address: { calle, numero, colonia, googleMapsLink: mapsLink } }, 'Efectivo'); }} className="p-4 space-y-6 pb-44 animate-fade-in">
             <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                <h3 className="font-bold text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> TUS DATOS</h3>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-xl p-3 outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Nombre completo" required />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-xl p-3 outline-none focus:ring-1 focus:ring-emerald-500" placeholder="WhatsApp (Ej: 58414...)" required />
            </div>

            {orderType === OrderType.Delivery && (
                <div className="space-y-4 p-5 bg-gray-800/30 border border-gray-800 rounded-2xl">
                    <h3 className="font-bold text-white flex items-center gap-2"><span className="bg-emerald-500 w-1 h-5 rounded-full"></span> ENTREGA</h3>
                    <button type="button" onClick={handleGetLocation} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${mapsLink ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-500/20'}`}>
                        {isLocating ? 'CAPTURANDO GPS...' : (mapsLink ? 'UBICACIÓN REGISTRADA ✓' : 'COMPARTIR UBICACIÓN GPS')}
                    </button>
                    <input type="text" value={calle} onChange={e => setCalle(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-xl p-3" placeholder="Calle / Avenida" required />
                    <div className="flex gap-2">
                        <input type="text" value={numero} onChange={e => setNumero(e.target.value)} className="w-1/3 bg-gray-800 border-gray-700 rounded-xl p-3" placeholder="N°" required />
                        <input type="text" value={colonia} onChange={e => setColonia(e.target.value)} className="flex-1 bg-gray-800 border-gray-700 rounded-xl p-3" placeholder="Sector/Urb" required />
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gray-900 border-t border-gray-800 shadow-2xl">
                 <div className="flex justify-between font-bold text-xl mb-4"><span>Total</span><span>${total.toFixed(2)}</span></div>
                 <button type="submit" className="w-full bg-green-600 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2">
                    <IconWhatsapp className="h-6 w-6" /> REALIZAR PEDIDO POR WHATSAPP
                </button>
            </div>
        </form>
    );
};

// --- Customer View Principal ---

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);
    const { cartItems, addToCart, cartTotal, clearCart } = useCart();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const [s, p, c] = await Promise.all([getAppSettings(), getProducts(), getCategories()]);
            setSettings(s); setAllProducts(p); setAllCategories(c);
        };
        fetch(); subscribeToMenuUpdates(fetch);
        return unsubscribeFromChannel;
    }, []);

    const handleOrder = async (customer: Customer, payment: PaymentMethod) => {
        if (!settings) return;
        try {
            await saveOrder({ customer, items: cartItems, total: cartTotal, status: OrderStatus.Pending, orderType });
            const msg = `🧾 *NUEVO PEDIDO - ${settings.company.name}*\n👤 Cliente: ${customer.name}\n📍 Entrega: ${customer.address.calle} #${customer.address.numero}\n🛰️ GPS: ${customer.address.googleMapsLink || 'No enviado'}\n----------------\n${cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}\n----------------\n💰 *Total: $${cartTotal.toFixed(2)}*`;
            window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
            setView('confirmation');
        } catch(e) { alert("Error al procesar el pedido."); }
    };

    if (!settings) return <div className="h-screen bg-gray-900 flex items-center justify-center animate-pulse text-emerald-500">Cargando menú...</div>;

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 font-sans">
            <div className="container mx-auto max-w-md bg-gray-900 min-h-screen relative shadow-2xl border-x border-gray-800">
                {view !== 'menu' && <Header title={view === 'cart' ? 'TU CARRITO' : 'FINALIZAR'} onBack={() => setView(view === 'checkout' ? 'cart' : 'menu')} />}
                {view === 'menu' && (
                    <>
                        <RestaurantHero settings={settings} orderType={orderType} setOrderType={setOrderType} />
                        <MenuList products={allProducts} categories={allCategories} onProductClick={setSelectedProduct} />
                    </>
                )}
                {view === 'cart' && <CartSummaryView items={cartItems} total={cartTotal} onCheckout={() => setView('checkout')} />}
                {view === 'checkout' && <CheckoutView total={cartTotal} onOrder={handleOrder} settings={settings} orderType={orderType} />}
                {view === 'confirmation' && (
                    <div className="p-8 text-center h-[80vh] flex flex-col items-center justify-center gap-6 animate-fade-in">
                        <div className="p-5 bg-emerald-500/20 rounded-full text-emerald-500"><IconCheck className="w-16 h-16"/></div>
                        <h2 className="text-3xl font-bold">¡PEDIDO ENVIADO!</h2>
                        <p className="text-gray-400">Te redirigimos a WhatsApp para confirmar la recepción.</p>
                        <button onClick={() => { clearCart(); setView('menu'); }} className="w-full bg-gray-800 py-4 rounded-xl font-bold">VOLVER AL INICIO</button>
                    </div>
                )}
                {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p, q) => { addToCart(p, q); setSelectedProduct(null); }} />}
                {view === 'menu' && cartItems.length > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-30">
                        <button onClick={() => setView('cart')} className="w-full bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex justify-between shadow-2xl active:scale-95 transition-transform">
                            <span>PEDIDO ({cartItems.length})</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </button>
                    </div>
                )}
                <Chatbot />
            </div>
        </div>
    );
}
