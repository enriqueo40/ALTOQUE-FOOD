
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
            <div className="px-6 py-6 border-t dark:border-gray-700">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <IconWhatsapp className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Sucursal</span>
                </div>
                <p className="text-gray-800 dark:text-gray-100 font-mono font-bold text-sm tracking-tight">+{whatsappNumber}</p>
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
                <button onClick={onCancel} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
                <button onClick={onSave} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-bold hover:bg-emerald-700 shadow-md">Guardar</button>
            </div>
        )}
    </div>
);

const BranchSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [tempPhone, setTempPhone] = useState(settings.branch.whatsappNumber);

    useEffect(() => {
        setTempPhone(settings.branch.whatsappNumber);
    }, [settings.branch.whatsappNumber]);

    const handleWhatsAppSave = async () => {
        // Limpiar el número para evitar errores en links wa.me
        const cleanPhone = tempPhone.replace(/[^\d]/g, '');
        if (!cleanPhone) {
            alert("Introduce un número válido.");
            return;
        }
        const newSettings = { ...settings, branch: { ...settings.branch, whatsappNumber: cleanPhone } };
        setSettings(newSettings);
        try {
            await saveAppSettings(newSettings);
            setIsEditingPhone(false);
            alert("Número actualizado.");
        } catch (e) {
            alert("Error al guardar.");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverImageUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                const newSettings = {...settings, branch: {...settings.branch, [field]: imageUrl}};
                setSettings(newSettings);
                saveAppSettings(newSettings);
            };
            reader.readAsDataURL(file);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm dark:text-white";

    return (
        <div className="space-y-6">
            <SettingsCard 
                title="Número de WhatsApp para pedidos" 
                description="El número al que llegarán las comandas de los pedidos a domicilio"
                noActions={!isEditingPhone}
                onSave={handleWhatsAppSave}
                onCancel={() => { setIsEditingPhone(false); setTempPhone(settings.branch.whatsappNumber); }}
            >
                <div className="flex flex-col gap-3">
                    {isEditingPhone ? (
                        <div className="space-y-2 animate-fade-in">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nuevo número (Ej: 584146945877)</label>
                            <input 
                                type="tel" 
                                value={tempPhone} 
                                onChange={e => setTempPhone(e.target.value)}
                                className={`${inputClasses} font-mono text-lg border-2 border-emerald-500 shadow-inner`}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <IconWhatsapp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Número actual</span>
                                    <span className="font-mono text-xl font-bold text-gray-800 dark:text-gray-100">
                                        +{settings.branch.whatsappNumber || "No configurado"}
                                    </span>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsEditingPhone(true)}
                                className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm active:scale-95"
                            >
                                Cambiar número
                            </button>
                        </div>
                    )}
                </div>
            </SettingsCard>

            <SettingsCard title="Datos de sucursal" onSave={onSave}>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Alias de sucursal</label>
                <input type="text" value={settings.branch.alias} onChange={e => setSettings(p => ({...p, branch: {...p.branch, alias: e.target.value}}))} className={inputClasses} placeholder="Nombre corto de la sucursal" />
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 mt-4">Dirección completa</label>
                <input type="text" value={settings.branch.fullAddress} onChange={e => setSettings(p => ({...p, branch: {...p.branch, fullAddress: e.target.value}}))} className={inputClasses} />
            </SettingsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-4">
                        <span className="font-bold">Logotipo</span>
                        <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-200">
                            Subir
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')}/>
                        </label>
                    </div>
                    {settings.branch.logoUrl ? <img src={settings.branch.logoUrl} className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/20" alt="Logo" /> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400"><IconStore className="h-10 w-10"/></div>}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-4">
                        <span className="font-bold">Portada</span>
                        <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-200">
                            Subir
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImageUrl')}/>
                        </label>
                    </div>
                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                        {settings.branch.coverImageUrl ? <img src={settings.branch.coverImageUrl} className="w-full h-full object-cover" alt="Portada" /> : <span className="text-gray-400 text-xs italic">Sin imagen</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; initialPage?: SettingsPage }> = ({ isOpen, onClose, initialPage = 'general' }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [activePage, setActivePage] = useState<SettingsPage>(initialPage);

    useEffect(() => {
        if (isOpen) {
            getAppSettings().then(setSettings);
            setActivePage(initialPage);
        }
    }, [isOpen, initialPage]);

    const handleSave = async () => {
        if (settings) {
            try {
                await saveAppSettings(settings);
                alert("Ajustes guardados.");
            } catch (e) {
                alert("Error al guardar.");
            }
        }
    };

    if (!isOpen || !settings) return null;

    const navItems: { id: SettingsPage; name: string; icon: React.ReactNode }[] = [
        { id: 'general', name: 'General', icon: <IconSettings className="h-4 w-4" /> },
        { id: 'store-data', name: 'Datos de la tienda', icon: <IconStore className="h-4 w-4" /> },
        { id: 'payment-methods', name: 'Pagos', icon: <IconPayment className="h-4 w-4" /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-white dark:bg-gray-900 h-full w-full max-w-5xl flex flex-col shadow-2xl animate-slide-in-right">
                <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <h2 className="text-xl font-bold">Configuración</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><IconX/></button>
                </header>
                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-64 border-r dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                        <nav className="space-y-1">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                    {item.icon} {item.name}
                                </button>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-900">
                        {activePage === 'store-data' && <BranchSettingsView settings={settings} setSettings={setSettings} onSave={handleSave} />}
                        {activePage !== 'store-data' && <div className="text-center py-20 opacity-40 italic">Sección en desarrollo...</div>}
                    </main>
                </div>
            </div>
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
        const channel = subscribeToMenuUpdates(() => {
            getAppSettings().then(setSettings);
        });
        return () => { unsubscribeFromChannel(); };
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage} 
                whatsappNumber={settings?.branch.whatsappNumber || "Cargando..."} 
            />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8 shrink-0">
                    <h2 className="text-2xl font-bold">{PAGE_TITLES[currentPage]}</h2>
                    <div className="flex items-center space-x-6">
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 font-bold text-gray-500 hover:text-emerald-600 transition-colors">
                            <IconSettings className="h-5 w-5"/> Configuración
                        </button>
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {theme === 'light' ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center py-20 opacity-30 italic">Bienvenido al Panel de Administración. Selecciona una opción en el menú lateral.</div>
                    </div>
                </main>
            </div>
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                initialPage="store-data"
            />
        </div>
    );
};

export default AdminView;
