
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer, PaymentMethod } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder, subscribeToMenuUpdates } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconSearch, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOff } from '../constants';

type AdminViewPage = 'dashboard' | 'products' | 'orders' | 'analytics' | 'messages' | 'availability' | 'share' | 'tutorials';
type SettingsPage = 'general' | 'store-data' | 'shipping-costs' | 'payment-methods' | 'hours' | 'zones-tables' | 'printing';

const PAGE_TITLES: { [key in AdminViewPage]: string } = {
    dashboard: 'Inicio',
    products: 'Menú',
    orders: 'Pedidos',
    analytics: 'Analítica',
    messages: 'Mensajes',
    availability: 'Disponibilidad',
    share: 'Compartir',
    tutorials: 'Tutoriales'
};

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void; whatsappNumber: string }> = ({ currentPage, setCurrentPage, whatsappNumber }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders /> },
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col shrink-0">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold dark:text-gray-100 uppercase tracking-tighter">ALTOQUE FOOD</h2>
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {item.icon}
                        <span className="font-semibold">{item.name}</span>
                    </button>
                ))}
            </nav>
            <div className="px-6 py-6 border-t dark:border-gray-700 text-xs text-gray-500 font-bold uppercase tracking-widest">
                Support: +{whatsappNumber}
            </div>
        </aside>
    );
};

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; onSave?: () => void; onCancel?: () => void; noActions?: boolean }> = ({ title, description, children, onSave, onCancel, noActions }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            <div className="mt-6 space-y-4">
                {children}
            </div>
        </div>
        {!noActions && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-x-3">
                <button onClick={onCancel} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
                <button onClick={onSave} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95">Guardar cambios</button>
            </div>
        )}
    </div>
);

const PaymentSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const inputClasses = "mt-1 block w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all sm:text-sm text-gray-900";
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <SettingsCard title="Pago Móvil" onSave={onSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={settings.payment.pagoMovil?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Banco"/>
                    <input type="text" value={settings.payment.pagoMovil?.phone || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, phone: e.target.value} as any}}))} className={inputClasses} placeholder="Teléfono"/>
                    <input type="text" value={settings.payment.pagoMovil?.idNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, idNumber: e.target.value} as any}}))} className={inputClasses} placeholder="Cédula/RIF"/>
                </div>
            </SettingsCard>

            <SettingsCard title="Transferencia" onSave={onSave}>
                <div className="space-y-4">
                    <input type="text" value={settings.payment.transfer?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Banco"/>
                    <input type="text" value={settings.payment.transfer?.accountNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountNumber: e.target.value} as any}}))} className={inputClasses} placeholder="Número de Cuenta"/>
                    <input type="text" value={settings.payment.transfer?.accountHolder || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountHolder: e.target.value} as any}}))} className={inputClasses} placeholder="Nombre del Titular"/>
                </div>
            </SettingsCard>

            <SettingsCard title="Zelle" onSave={onSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="email" value={settings.payment.zelle?.email || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, zelle: {...p.payment.zelle, email: e.target.value} as any}}))} className={inputClasses} placeholder="Correo Zelle"/>
                    <input type="text" value={settings.payment.zelle?.holder || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, zelle: {...p.payment.zelle, holder: e.target.value} as any}}))} className={inputClasses} placeholder="Titular"/>
                </div>
            </SettingsCard>
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        getAppSettings().then(setSettings);
    }, []);

    const handleSave = async () => {
        if (settings) {
            try {
                await saveAppSettings(settings);
                alert("Guardado correctamente.");
            } catch (e) {
                alert("Error al guardar.");
            }
        }
    };

    if (!settings) return null;

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} whatsappNumber={settings.branch.whatsappNumber} />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8 shrink-0">
                    <h2 className="text-xl font-bold uppercase tracking-tight">{PAGE_TITLES[currentPage]}</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 font-bold text-gray-500 hover:text-emerald-600 transition-colors">
                            <IconSettings className="h-5 w-5"/> Configuración
                        </button>
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            {theme === 'light' ? <IconMoon /> : <IconSun />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
                    {currentPage === 'dashboard' && <div className="p-10 text-center text-gray-400">Panel administrativo activo.</div>}
                    {currentPage === 'orders' && <div className="p-10 text-center text-gray-400 font-bold uppercase">Gestión de Pedidos</div>}
                </main>
            </div>
            
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="bg-white dark:bg-gray-900 h-full w-full max-w-4xl flex flex-col shadow-2xl animate-slide-in-right">
                        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Configuración de Pagos</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><IconX/></button>
                        </header>
                        <div className="flex-1 p-8 overflow-y-auto">
                            <PaymentSettingsView settings={settings} setSettings={setSettings} onSave={handleSave} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
