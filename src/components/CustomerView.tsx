
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, PaymentMethod, OrderType, Personalization, Promotion, PersonalizationOption, Schedule, ShippingCostType } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconStore, IconCheck, IconUpload, IconReceipt, IconSparkles, IconClock, IconLocationMarker } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import { getPairingSuggestion } from '../services/geminiService';
import Chatbot from './Chatbot';

// --- Sub-componentes ---

const Header: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
    <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur-md z-30 border-b border-gray-800">
        {onBack ? (
             <button onClick={onBack} className="p-2 -ml-2 text-gray-200 hover:bg-gray-800 rounded-full transition-colors" aria-label="Volver">
                <IconArrowLeft className="h-6 w-6" />
            </button>
        ) : <div className="w-10 h-10" /> }
        <h1 className="text-lg font-black text-white uppercase tracking-tight text-center flex-1">{title}</h1>
        <div className="w-10 h-10" /> 
    </header>
);

const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.appliesTo === 'all_products') return true;
        return p.productIds.includes(product.id);
    });
    if (activePromotions.length === 0) return { price: product.price };
    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;
    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === 'percentage') {
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

export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation' | 'account'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Efectivo');
    const [paymentProof, setPaymentProof] = useState<string | null>(null);

    // --- ESTADO PERSISTENTE DE MESA ---
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(() => {
        const saved = localStorage.getItem('altoque_table_info');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [sessionItems, setSessionItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('altoque_consumed_items');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('altoque_customer_name') || '');
    const [orderType, setOrderType] = useState<OrderType>(() => {
        const savedTable = localStorage.getItem('altoque_table_info');
        return savedTable ? OrderType.DineIn : OrderType.Delivery;
    });

    const [isFinalClosing, setIsFinalClosing] = useState(false);
    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);

    const isTableSession = !!tableInfo;

    const sessionTotal = useMemo(() => {
        return sessionItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [sessionItems]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, c, proms] = await Promise.all([
                    getAppSettings(), getProducts(), getCategories(), getPromotions()
                ]);
                setSettings(s); 
                setAllProducts(p); 
                setAllCategories(c); 
                setAllPromotions(proms);
                if (c.length > 0) setActiveCategory(c[0].id);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone && !localStorage.getItem('altoque_table_info')) {
            const info = { table, zone };
            setTableInfo(info);
            setOrderType(OrderType.DineIn);
            localStorage.setItem('altoque_table_info', JSON.stringify(info));
        }
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (res) => {
                setPaymentProof(res.target?.result as string);
                alert("Comprobante cargado con éxito.");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOrderAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!settings) return;

        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string || customerName;
        const phone = fd.get('phone') as string || '';

        try {
            if (isFinalClosing && isTableSession) {
                const msg = [
                    `💰 *SOLICITUD DE CUENTA*`,
                    `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                    `🪑 Mesa: ${tableInfo?.table} (${tableInfo?.zone})`, `👤 Cliente: ${name}`, `--------------------------------`,
                    `💵 *TOTAL: $${sessionTotal.toFixed(2)}*`, `💳 Pago: ${selectedPayment}`,
                    paymentProof ? `✅ Comprobante adjunto` : '', `_Favor confirmar para liberar mesa._`
                ].filter(Boolean).join('\n');

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                
                localStorage.removeItem('altoque_consumed_items');
                localStorage.removeItem('altoque_table_info');
                localStorage.removeItem('altoque_customer_name');
                setSessionItems([]);
                setTableInfo(null);
                setCustomerName('');
                clearCart();
                setView('confirmation');

            } else {
                const itemsStr = cartItems.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                let msg: string;
                
                if (isTableSession) {
                    msg = [
                        `🧾 *🔥 NUEVA RONDA*`,
                        `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `🪑 MESA: ${tableInfo!.table} (${tableInfo!.zone})`, `👤 Cliente: ${name}`, `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Ronda: $${cartTotal.toFixed(2)}`,
                        (sessionItems.length > 0) ? `📈 *Acumulado: $${(sessionTotal + cartTotal).toFixed(2)}*` : '',
                    ].filter(Boolean).join('\n');
                    setSessionItems(prev => [...prev, ...cartItems]);
                } else {
                    msg = [
                        `🧾 *PEDIDO (${orderType.toUpperCase()})*`, `📍 *${settings.company.name.toUpperCase()}*`, `--------------------------------`,
                        `👤 Cliente: ${name}`, `📱 Tel: ${phone}`,
                        orderType === OrderType.Delivery ? `🏠 Dir: ${fd.get('calle')} #${fd.get('numero')}, ${fd.get('colonia')}` : '',
                        `--------------------------------`, itemsStr, `--------------------------------`,
                        `💰 Total: $${cartTotal.toFixed(2)}`, `💳 Pago: ${selectedPayment}`,
                        paymentProof ? `✅ Captura cargada.` : ''
                    ].filter(Boolean).join('\n');
                }

                window.open(`https://wa.me/${settings.branch.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
                clearCart();
                setPaymentProof(null);
                setView('confirmation');
            }
        } catch(e) {
            alert("Error al procesar.");
        }
    };

    if (isLoading || !settings) return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Cargando...</p>
        </div>
    );

    return (
        <div className="bg-[#0f172a] min-h-screen text-gray-100 font-sans pb-safe selection:bg-emerald-500/30">
            <div className="container mx-auto max-w-md bg-[#0f172a] min-h-screen relative shadow-2xl flex flex-col">
                
                {view !== 'menu' && (
                    <Header 
                        title={view === 'cart' ? 'MI RONDA' : view === 'account' ? 'MI CUENTA' : 'CONFIRMAR'} 
                        onBack={() => setView('menu')} 
                    />
                )}
                
                <div className="flex-1 overflow-y-auto pb-48">
                    {view === 'menu' && (
                        <div className="animate-fade-in">
                            <div className="relative pt-12 pb-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-gray-800 mb-4 overflow-hidden shadow-2xl">
                                    {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-full h-full object-cover" /> : <span className="text-emerald-500 font-bold text-2xl">A</span>}
                                </div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">{settings.company.name}</h1>
                                <p className="text-xs text-gray-400 font-medium mt-1">{settings.branch.alias}</p>
                                
                                {isTableSession && (
                                    <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 uppercase">
                                        <IconTableLayout className="h-3 w-3"/> MESA {tableInfo!.table} • {tableInfo!.zone}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 space-y-8 mt-4">
                                {allCategories.map(cat => {
                                    const products = allProducts.filter(p => p.categoryId === cat.id && p.available);
                                    if (products.length === 0) return null;
                                    return (
                                        <div key={cat.id}>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4"> {cat.name} </h3>
                                            <div className="grid gap-3">
                                                {products.map(p => {
                                                    const { price: displayPrice } = getDiscountedPrice(p, allPromotions);
                                                    return (
                                                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-[#1e293b]/50 p-3 rounded-2xl border border-gray-800/60 flex gap-4 transition-all cursor-pointer relative group">
                                                            <img src={p.imageUrl} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                                                            <div className="flex-1 flex flex-col justify-center">
                                                                <h4 className="font-bold text-gray-100 group-hover:text-emerald-400 transition-colors">{p.name}</h4>
                                                                <span className="font-black text-emerald-400 text-sm mt-1">${displayPrice.toFixed(2)}</span>
                                                            </div>
                                                            <div className="absolute bottom-3 right-3 bg-gray-800 p-1.5 rounded-lg text-emerald-400 border border-gray-700"> <IconPlus className="h-4 w-4" /> </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {view === 'confirmation' && (
                        <div className="p-12 text-center h-full flex flex-col items-center justify-center gap-8 animate-fade-in min-h-[60vh]">
                            <IconCheck className="w-20 h-20 text-emerald-500 bg-emerald-500/10 p-4 rounded-full border border-emerald-500/30"/>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">¡ENVIADO!</h2>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto font-medium"> Tu solicitud ha sido enviada vía WhatsApp con éxito. </p>
                            <button onClick={() => setView('menu')} className="w-full max-w-xs bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl"> REGRESAR AL MENÚ </button>
                        </div>
                    )}
                    
                    {view === 'checkout' && ( 
                        <form onSubmit={handleOrderAction} className="p-6 space-y-6 animate-fade-in"> 
                            
                            {/* Datos Cliente */}
                            <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">MIS DATOS</h3>
                                <input name="name" type="text" defaultValue={customerName} className="w-full bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Nombre completo" required />
                                {!isTableSession && <input name="phone" type="tel" className="w-full bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="WhatsApp (ej. 0414...)" required />}
                            </div>

                            {/* Dirección para Delivery */}
                            {!isTableSession && orderType === OrderType.Delivery && (
                                <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">DIRECCIÓN</h3>
                                    <input name="calle" className="w-full bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Calle y Avenida" required />
                                    <input name="numero" className="w-full bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Nro Casa / Apto" required />
                                    <input name="colonia" className="w-full bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Sector" required />
                                </div>
                            )}

                            {/* MÉTODO DE PAGO Y DESPLIEGUE DINÁMICO */}
                            <div className="space-y-4 p-6 bg-gray-800/30 border border-gray-800 rounded-[2rem] relative">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0f172a] px-6 py-2 border border-gray-800 rounded-full z-10 shadow-lg">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">CONFIRMAR</h3>
                                </div>
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] pt-4">MÉTODO DE PAGO</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle'].map(m => (
                                        <label key={m} className={`flex justify-between items-center p-4 bg-gray-800/50 border rounded-xl cursor-pointer transition-all ${selectedPayment === m ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:border-gray-500'}`}>
                                            <span className="text-sm font-bold text-gray-300">{m}</span>
                                            <input type="radio" name="payment" value={m} checked={selectedPayment === m} onChange={() => { setSelectedPayment(m as any); setPaymentProof(null); }} className="accent-emerald-500 h-5 w-5" />
                                        </label>
                                    ))}
                                </div>

                                {/* ESTE ES EL BLOQUE QUE SE DESPLIEGA AL SELECCIONAR UN MÉTODO BANCARIO */}
                                {selectedPayment !== 'Efectivo' && (
                                    <div className="mt-4 p-5 bg-gray-900 rounded-3xl border border-emerald-500/30 space-y-4 animate-fade-in shadow-2xl">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">TRANSFERIR A:</p>
                                            
                                            {selectedPayment === 'Pago Móvil' && settings.payment.pagoMovil && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1"><span>Banco:</span><span className="font-bold text-white uppercase">{settings.payment.pagoMovil.bank || 'Configurar en Admin'}</span></div>
                                                    <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1"><span>Teléfono:</span><span className="font-bold text-white font-mono">{settings.payment.pagoMovil.phone || '0000-0000000'}</span></div>
                                                    <div className="flex justify-between text-gray-400"><span>RIF/CI:</span><span className="font-bold text-white uppercase">{settings.payment.pagoMovil.idNumber || 'V-00000000'}</span></div>
                                                </div>
                                            )}

                                            {selectedPayment === 'Transferencia' && settings.payment.transfer && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1"><span>Banco:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.bank || 'Configurar en Admin'}</span></div>
                                                    <div className="flex flex-col items-start text-gray-400 border-b border-gray-800 pb-1">
                                                        <span>Cuenta:</span>
                                                        <span className="font-mono text-white text-[10px] mt-1 break-all w-full text-left">{settings.payment.transfer.accountNumber || '0105...'}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1"><span>Titular:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.accountHolder || 'NOMBRE'}</span></div>
                                                    <div className="flex justify-between text-gray-400"><span>RIF/CI:</span><span className="font-bold text-white uppercase">{settings.payment.transfer.idNumber || 'V-00000000'}</span></div>
                                                </div>
                                            )}

                                            {selectedPayment === 'Zelle' && settings.payment.zelle && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1"><span>Correo:</span><span className="font-bold text-white font-mono">{settings.payment.zelle.email || 'pagos@empresa.com'}</span></div>
                                                    <div className="flex justify-between text-gray-400"><span>Titular:</span><span className="font-bold text-white uppercase">{settings.payment.zelle.holder || 'NOMBRE'}</span></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4">
                                            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-all group overflow-hidden bg-gray-800/50">
                                                {paymentProof ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="bg-emerald-500/20 p-2 rounded-full animate-bounce"><IconCheck className="h-6 w-6 text-emerald-500"/></div>
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">¡IMAGEN LISTA!</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-gray-500 group-hover:text-emerald-400 transition-colors text-center">
                                                        <IconUpload className="h-8 w-8 mb-2 opacity-50" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">SUBIR CAPTURA DE PAGO</span>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 px-2 space-y-4">
                                <div className="flex justify-between font-black text-2xl px-2">
                                    <span className="text-gray-500 text-[10px] tracking-[0.4em] uppercase self-center">TOTAL RONDA</span>
                                    <span className="text-emerald-400 text-4xl font-black">${(isFinalClosing ? sessionTotal : cartTotal).toFixed(2)}</span>
                                </div>
                                <button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] py-5 rounded-2xl font-black text-white flex items-center justify-center gap-4 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl border-t border-white/10">
                                    <IconWhatsapp className="h-5 w-5" /> REALIZAR PEDIDO
                                </button>
                            </div>
                        </form> 
                    )}
                </div>
                <Chatbot />
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}
