
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, BranchSettings, PaymentSettings, ShippingSettings, PaymentMethod, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconChatAdmin, IconLogout, IconSearch, IconBell, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconTag, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOn, IconToggleOff } from '../constants';

const IconEye: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className={className} />;

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

const Sidebar: React.FC<{ currentPage: AdminViewPage; setCurrentPage: (page: AdminViewPage) => void }> = ({ currentPage, setCurrentPage }) => {
    const navItems: { id: AdminViewPage; name: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Inicio', icon: <IconHome /> },
        { id: 'orders', name: 'Pedidos', icon: <IconOrders /> },
        { id: 'products', name: 'Menú', icon: <IconMenu /> },
        { id: 'availability', name: 'Disponibilidad', icon: <IconAvailability /> },
        { id: 'share', name: 'Compartir', icon: <IconShare /> },
        { id: 'tutorials', name: 'Tutoriales', icon: <IconTutorials /> },
    ];
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
            <div className="h-20 flex items-center justify-center border-b dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold dark:text-gray-100">ALTOQUE FOOD</h2>
                    <IconChevronDown className="h-4 w-4" />
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
            <div className="px-4 py-6 border-t dark:border-gray-700 text-sm">
                <p className="text-gray-600 dark:text-gray-300 font-medium">+584146945877</p>
                <p className="text-gray-500 dark:text-gray-400">Atención rápida</p>
            </div>
        </aside>
    );
};

const Header: React.FC<{ title: string; onSettingsClick: () => void; onPreviewClick: () => void; theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ title, onSettingsClick, onPreviewClick, theme, toggleTheme }) => (
    <header className="h-20 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <div className="flex items-center space-x-6">
            <a href="#/menu" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <span>Menú digital</span>
                <IconExternalLink className="h-4 w-4" />
            </a>
            <button onClick={onSettingsClick} className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <span>Configuración</span>
                <IconSettings className="h-5 w-5" />
            </button>
             <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                {theme === 'light' ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
            </button>
        </div>
    </header>
);

const FeatureBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;

    return (
        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-800 p-4 rounded-lg flex items-center justify-between">
            <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Nueva funcionalidad</h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Conoce las comandas digitales (KDS).</p>
            </div>
            <div className="flex items-center space-x-4">
                 <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    Ver detalles de actualización
                </button>
                <button onClick={() => setIsVisible(false)} className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200" aria-label="Cerrar">
                    <IconX className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};

// ... (Rest of AdminView content is large, inserting relevant parts and the fix)

// Define SettingsCard first to avoid reference errors
const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; onSave?: () => void; onCancel?: () => void; noActions?: boolean }> = ({ title, description, children, onSave, onCancel, noActions }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            <div className="mt-6 space-y-4">
                {children}
            </div>
        </div>
        {!noActions && (
            <div className="mt-6 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-x-3 rounded-b-lg">
                <button onClick={onCancel} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">Cancelar</button>
                <button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Guardar</button>
            </div>
        )}
    </div>
);

// SearchableDropdown definition
const SearchableDropdown: React.FC<{ options: Currency[], selected: Currency, onSelect: (option: Currency) => void }> = ({ options, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: Currency) => {
        onSelect(option);
        setIsOpen(false);
        setSearchTerm('');
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm">
                <span className="block truncate">{selected.name}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <IconChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="p-2">
                         <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    {filteredOptions.map(option => (
                        <button
                            key={option.code}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className="w-full text-left cursor-default select-none relative py-2 pl-10 pr-4 text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <span className={`font-normal block truncate ${selected.code === option.code ? 'font-medium' : 'font-normal'}`}>{option.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const GeneralSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.company);

    useEffect(() => {
        setOriginalSettings(settings.company)
    }, [settings.company])

    const handleCancel = () => {
        setSettings(prev => ({...prev, company: originalSettings}));
    }

    return (
        <div className="space-y-6">
             <SettingsCard title="Datos de empresa" onSave={onSave} onCancel={handleCancel}>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de empresa</label>
                 <input type="text" value={settings.company.name} onChange={e => setSettings(p => ({...p, company: {...p.company, name: e.target.value}}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"/>

                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Divisa</label>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Escoge la divisa que tus clientes verán en el menú.</p>
                 <SearchableDropdown options={CURRENCIES} selected={settings.company.currency} onSelect={currency => setSettings(p => ({...p, company: {...p.company, currency}}))} />
            </SettingsCard>
        </div>
    );
};

const BranchSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.branch);
    
    useEffect(() => {
        setOriginalSettings(settings.branch)
    }, [settings.branch]);
    
    const handleCancel = () => {
        setSettings(prev => ({...prev, branch: originalSettings}));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverImageUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                setSettings(prev => {
                    const newSettings = {...prev, branch: {...prev.branch, [field]: imageUrl}};
                    // Auto-save on image upload
                    saveAppSettings(newSettings).then(() => {
                        alert("Imagen cargada y guardada.");
                    }).catch(() => {
                        alert("Error al guardar la imagen.");
                    });
                    return newSettings;
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("La geolocalización no es compatible con este navegador.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setSettings(p => ({ ...p, branch: {...p.branch, googleMapsLink: link} }));
                alert("Ubicación obtenida. No olvides guardar los cambios.");
            },
            () => {
                alert("No se pudo obtener la ubicación. Asegúrate de haber concedido los permisos.");
            }
        );
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";

    return (
        <div className="space-y-6">
            <SettingsCard title="Datos de sucursal" onSave={onSave} onCancel={handleCancel}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alias de sucursal</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visible para tus clientes, nombre corto o distintivo para identificar esta sucursal entre las demás.</p>
                <input 
                    type="text" 
                    value={settings.branch.alias} 
                    onChange={e => setSettings(p => ({...p, branch: {...p.branch, alias: e.target.value}}))} 
                    className={inputClasses}
                    placeholder="ANYVAL PARK - Suc."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Algunos ejemplos son: Centro, Las américas, Del valle.</p>

                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Dirección completa</label>
                <input 
                    type="text" 
                    value={settings.branch.fullAddress} 
                    onChange={e => setSettings(p => ({...p, branch: {...p.branch, fullAddress: e.target.value}}))} 
                    className={inputClasses}
                />

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Ubicación en Google Maps</label>
                {settings.branch.googleMapsLink ? (
                    <div className="flex items-center gap-2 mt-1">
                        <a href={settings.branch.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 text-sm underline truncate">{settings.branch.googleMapsLink}</a>
                        <button onClick={() => setSettings(p => ({...p, branch: {...p.branch, googleMapsLink: ''}}))} className="text-red-500"><IconTrash className="h-4 w-4"/></button>
                    </div>
                ) : (
                    <button type="button" onClick={handleGetLocation} className="mt-1 flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <IconLocationMarker className="h-5 w-5"/>
                        Agregar ubicación
                    </button>
                )}
            </SettingsCard>

            <SettingsCard title="Número de WhatsApp para pedidos" onSave={onSave} onCancel={handleCancel}>
                <p className="text-sm text-gray-500 dark:text-gray-400">El número al que llegarán las comandas de los pedidos a domicilio. Formato internacional recomendado (ej. +58414...)</p>
                <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de teléfono</label>
                    <input 
                        type="text" 
                        value={settings.branch.whatsappNumber} 
                        onChange={e => setSettings(p => ({...p, branch: {...p.branch, whatsappNumber: e.target.value}}))} 
                        className={inputClasses}
                        placeholder="+58 414 1234567"
                    />
                </div>
            </SettingsCard>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Logotipo de la tienda</span>
                    <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">
                        <IconUpload className="h-5 w-5"/>
                        Cargar imagen
                    </label>
                    <input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')}/>
                 </div>
                 {settings.branch.logoUrl && <img src={settings.branch.logoUrl} alt="Logo preview" className="w-20 h-20 rounded-full object-cover mt-4"/>}
            </div>

             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Portada de la tienda</span>
                    <label htmlFor="cover-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600">
                        <IconUpload className="h-5 w-5"/>
                        Cargar imagen
                    </label>
                    <input id="cover-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImageUrl')}/>
                 </div>
                  {settings.branch.coverImageUrl && <img src={settings.branch.coverImageUrl} alt="Cover preview" className="w-full h-32 object-cover rounded-md mt-4"/>}
            </div>
        </div>
    );
};

const ShippingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    
    const [originalSettings, setOriginalSettings] = useState(settings.shipping);
    
    useEffect(() => {
        setOriginalSettings(settings.shipping)
    }, [settings.shipping])

    const handleCancel = () => {
        setSettings(prev => ({...prev, shipping: originalSettings}));
    };

    const inputClasses = "w-24 text-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";
    
    return (
        <div className="space-y-6">
            <SettingsCard title="Tipo de costo de envío" onSave={onSave} onCancel={handleCancel}>
                <select value={settings.shipping.costType} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, costType: e.target.value as ShippingCostType}}))} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                   {Object.values(ShippingCostType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El precio de envío no será calculado automáticamente.</p>
                
                <div className="mt-4 space-y-3">
                    <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <span className="ml-2 text-sm">Envío gratis si se alcanza una compra mínima</span>
                    </label>
                     <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <span className="ml-2 text-sm">Se requiere una compra mínima para habilitar envíos</span>
                    </label>
                </div>
            </SettingsCard>

             <SettingsCard title="Tiempo para pedidos a domicilio" onSave={onSave} onCancel={handleCancel}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Desde que el cliente hace su pedido.</p>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                         <input type="number" value={settings.shipping.deliveryTime.min} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, deliveryTime: {...p.shipping.deliveryTime, min: Number(e.target.value)}} }))} className={inputClasses}/>
                         <span>mins</span>
                    </div>
                     <span className="text-gray-500">Máximo</span>
                    <div className="flex items-center gap-2">
                         <input type="number" value={settings.shipping.deliveryTime.max} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, deliveryTime: {...p.shipping.deliveryTime, max: Number(e.target.value)}} }))} className={inputClasses}/>
                         <span>mins</span>
                    </div>
                </div>
                 <h4 className="font-bold mt-6">Tiempo para pedidos para recoger</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Desde que el cliente hace su pedido.</p>
                 <div className="flex items-center gap-2 mt-2">
                    <input type="number" value={settings.shipping.pickupTime.min} onChange={e => setSettings(p => ({...p, shipping: {...p.shipping, pickupTime: {min: Number(e.target.value)}}}))} className={inputClasses}/>
                    <span>mins</span>
                 </div>
             </SettingsCard>
        </div>
    );
};

const PaymentSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.payment);
    const availableMethods: PaymentMethod[] = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle', 'Punto de Venta', 'Pago con tarjeta'];

    useEffect(() => {
        setOriginalSettings(settings.payment)
    }, [settings.payment]);

    const handleCancel = () => {
        setSettings(prev => ({...prev, payment: originalSettings}));
    }

    const handleCheckboxChange = (group: 'deliveryMethods' | 'pickupMethods', method: PaymentMethod, checked: boolean) => {
        setSettings(prev => {
            const currentMethods = prev.payment[group];
            if (checked) {
                return {...prev, payment: {...prev.payment, [group]: [...currentMethods, method]}};
            } else {
                return {...prev, payment: {...prev.payment, [group]: currentMethods.filter(m => m !== method)}};
            }
        });
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-white placeholder-gray-400";

    return (
        <div className="space-y-6">
            <SettingsCard title="Métodos de pago para los clientes" onSave={onSave} onCancel={handleCancel}>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold">Envíos a domicilio</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Desactivar todos deshabilita los pedidos domicilios</p>
                        <div className="mt-3 space-y-2">
                            {availableMethods.map(method => (
                                <label key={method} className="flex items-center">
                                    <input type="checkbox" checked={settings.payment.deliveryMethods.includes(method)} onChange={(e) => handleCheckboxChange('deliveryMethods', method, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                    <span className="ml-2 text-sm">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold">Para recoger</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Desactivar todos deshabilita los pedidos para recoger</p>
                        <div className="mt-3 space-y-2">
                             {availableMethods.map(method => (
                                <label key={method} className="flex items-center">
                                    <input type="checkbox" checked={settings.payment.pickupMethods.includes(method)} onChange={(e) => handleCheckboxChange('pickupMethods', method, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                    <span className="ml-2 text-sm">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Configuración de Pago Móvil" description="Datos para que tus clientes realicen el pago." onSave={onSave} onCancel={handleCancel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banco</label>
                        <input type="text" value={settings.payment.pagoMovil?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. Banesco"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                        <input type="text" value={settings.payment.pagoMovil?.phone || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, phone: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. 0414-1234567"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cédula / RIF</label>
                        <input type="text" value={settings.payment.pagoMovil?.idNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, pagoMovil: {...p.payment.pagoMovil, idNumber: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. V-12345678"/>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Configuración de Transferencia Bancaria" description="Datos de la cuenta bancaria." onSave={onSave} onCancel={handleCancel}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banco</label>
                        <input type="text" value={settings.payment.transfer?.bank || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, bank: e.target.value} as any}}))} className={inputClasses} placeholder="Ej. Mercantil"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Cuenta</label>
                        <input type="text" value={settings.payment.transfer?.accountNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountNumber: e.target.value} as any}}))} className={inputClasses} placeholder="0105..."/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titular</label>
                            <input type="text" value={settings.payment.transfer?.accountHolder || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, accountHolder: e.target.value} as any}}))} className={inputClasses} placeholder="Nombre del titular"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cédula / RIF</label>
                            <input type="text" value={settings.payment.transfer?.idNumber || ''} onChange={e => setSettings(p => ({...p, payment: {...p.payment, transfer: {...p.payment.transfer, idNumber: e.target.value} as any}}))} className={inputClasses} placeholder="V-12345678"/>
                        </div>
                    </div>
                </div>
            </SettingsCard>

             <SettingsCard title="Campo de propinas" description="Permite a los clientes introducir propinas." onSave={onSave} onCancel={handleCancel}>
                <label className="flex items-center">
                    <input type="checkbox" checked={settings.payment.showTipField} onChange={e => setSettings(p => ({...p, payment: {...p.payment, showTipField: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                    <span className="ml-2 text-sm">Mostrar campo para agregar propina</span>
                </label>
            </SettingsCard>
        </div>
    );
};

const TimeInput: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
    <input 
        type="time" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
    />
);

const ShiftModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (shift: TimeRange) => void, day: string }> = ({ isOpen, onClose, onSave, day }) => {
    const [shift, setShift] = useState<TimeRange>({ start: '09:00', end: '17:00' });

    const handleSave = () => {
        onSave(shift);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Agrega un turno en {day}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Empieza:</label>
                            <TimeInput value={shift.start} onChange={val => setShift(s => ({...s, start: val}))} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Termina:</label>
                            <TimeInput value={shift.end} onChange={val => setShift(s => ({...s, end: val}))} />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-x-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Agregar turno</button>
                </div>
            </div>
        </div>
    );
};

const ScheduleModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (name: string) => void }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
            setName('');
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                 <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Agrega un horario</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Añade más horarios si ofreces productos en distintos horarios (ej. desayunos, comidas y cenas). También es útil para promociones o combos disponibles solo en ciertos días.</p>
                    <div className="mt-4">
                        <label className="text-sm font-medium">Nombre de horario</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-x-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Agregar horario</button>
                </div>
            </div>
        </div>
    );
};

const HoursSettings: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [activeScheduleId, setActiveScheduleId] = useState(settings.schedules[0]?.id || '');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DaySchedule['day'] | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    const activeSchedule = useMemo(() => {
        return settings.schedules.find(s => s.id === activeScheduleId);
    }, [settings.schedules, activeScheduleId]);

    const hasAnyShifts = useMemo(() => {
        return activeSchedule?.days.some(d => d.shifts.length > 0);
    }, [activeSchedule]);

    const handleAddShift = (day: DaySchedule['day']) => {
        setSelectedDay(day);
        setIsShiftModalOpen(true);
    };
    
    const handleSaveShift = (shift: TimeRange) => {
        if (!selectedDay || !activeScheduleId) return;
        setSettings(prev => {
            const newSettings = {
                ...prev,
                schedules: prev.schedules.map(schedule => 
                    schedule.id === activeScheduleId
                    ? {
                        ...schedule,
                        days: schedule.days.map(day => 
                            day.day === selectedDay
                            ? {...day, shifts: [...day.shifts, shift]}
                            : day
                        )
                      }
                    : schedule
                )
            };
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
    };

    const handleRemoveShift = (dayName: DaySchedule['day'], shiftIndex: number) => {
         setSettings(prev => {
            const newSettings = {
                ...prev,
                schedules: prev.schedules.map(schedule => 
                    schedule.id === activeScheduleId
                    ? {
                        ...schedule,
                        days: schedule.days.map(day => 
                            day.day === dayName
                            ? {...day, shifts: day.shifts.filter((_, i) => i !== shiftIndex)}
                            : day
                        )
                      }
                    : schedule
                )
            };
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
    };
    
    const handleSaveSchedule = (name: string) => {
        const newSchedule: Schedule = {
            id: `schedule-${Date.now()}`,
            name,
            days: [
                { day: 'Lunes', shifts: [], isOpen: true },
                { day: 'Martes', shifts: [], isOpen: true },
                { day: 'Miércoles', shifts: [], isOpen: true },
                { day: 'Jueves', shifts: [], isOpen: true },
                { day: 'Viernes', shifts: [], isOpen: true },
                { day: 'Sábado', shifts: [], isOpen: true },
                { day: 'Domingo', shifts: [], isOpen: true },
            ]
        };
        setSettings(prev => {
            const newSettings = { ...prev, schedules: [...prev.schedules, newSchedule]};
            saveAppSettings(newSettings); // Auto-save on change
            return newSettings;
        });
        setActiveScheduleId(newSchedule.id);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <select value={activeScheduleId} onChange={e => setActiveScheduleId(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                    {settings.schedules.map(s => <option key={s.id} value={s.id}>Horario: {s.name}</option>)}
                </select>
                <button onClick={() => setIsScheduleModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 flex items-center gap-2"><IconPlus className="h-4 w-4"/> Nuevo horario</button>
            </div>

            {!hasAnyShifts && (
                 <div className="p-4 bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-700 dark:text-orange-200">
                    <p className="font-bold">El horario permanecerá abierto las 24 horas hasta que agregues un turno.</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <h3 className="font-bold">{activeSchedule?.name}</h3>
                    <button className="text-gray-500"><IconMoreVertical/></button>
                </div>
                <ul className="divide-y dark:divide-gray-700">
                    {activeSchedule?.days.map(day => (
                        <li key={day.day} className="p-4 flex justify-between items-center">
                            <span className="font-semibold w-24">{day.day}</span>
                            <div className="flex-1 flex flex-wrap gap-2 items-center">
                                {day.shifts.map((shift, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
                                        <span>{shift.start} - {shift.end}</span>
                                        <button onClick={() => handleRemoveShift(day.day, index)} className="text-gray-500 hover:text-red-500"><IconX className="h-3 w-3"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleAddShift(day.day)} className="text-green-600 font-semibold text-sm flex items-center gap-1"><IconPlus className="h-4 w-4"/> Nuevo turno</button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <ShiftModal 
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                onSave={handleSaveShift}
                day={selectedDay || ''}
            />
            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={handleSaveSchedule}
            />
        </div>
    );
};

const ZonesAndTablesSettings: React.FC<{
    zones: Zone[];
    onAddZone: () => void;
    onEditZoneName: (zone: Zone) => void;
    onDeleteZone: (zoneId: string) => void;
    onEditZoneLayout: (zone: Zone) => void;
}> = ({ zones, onAddZone, onEditZoneName, onDeleteZone, onEditZoneLayout }) => {
    
    const ActionMenu: React.FC<{zone: Zone}> = ({zone}) => {
        const [isOpen, setIsOpen] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        return (
             <div className="relative" ref={menuRef}>
                <button onClick={() => setIsOpen(p => !p)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><IconMoreVertical/></button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <div className="p-1">
                             <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Acciones</p>
                            <button onClick={() => { onEditZoneLayout(zone); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"> <IconEdit className="h-4 w-4" /> Editar distribución</button>
                            <button onClick={() => { onDeleteZone(zone.id); setIsOpen(false); }} className="w-full text-left flex items-center gap-x-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash className="h-4 w-4" /> Borrar</button>
                        </div>
                    </div>
                )}
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md flex items-center gap-x-3 text-sm text-blue-800 dark:text-blue-200 mb-6">
                <IconInfo className="h-5 w-5 flex-shrink-0" />
                <span>Encuentra el código QR de cada mesa en <a href="#" className="font-semibold underline hover:text-blue-600">Compartir</a>.</span>
            </div>

            <div className="flex justify-end">
                 <button onClick={onAddZone} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                    <IconPlus className="h-5 w-5" />
                    <span>Nueva zona</span>
                </button>
            </div>
            
             {zones.length === 0 ? (
                <div className="text-center py-10 px-6 border-2 border-dashed dark:border-gray-600 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Aún no tienes zonas creadas</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Empieza por agregar tu primera zona para organizar tus mesas.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                   <ul className="divide-y dark:divide-gray-700">
                        {zones.map(zone => (
                           <li key={zone.id} className="p-4 flex justify-between items-center">
                                <div className="flex-grow">
                                    <input type="text" defaultValue={zone.name} onBlur={(e) => onEditZoneName({ ...zone, name: e.target.value })} className="font-semibold bg-transparent border-none focus:ring-0 p-0 m-0 w-full" />
                                </div>
                                <div className="pr-2">
                                    <ActionMenu zone={zone}/>
                                </div>
                           </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const PrintingSettingsView: React.FC<{ onSave: () => Promise<void>; settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ onSave, settings, setSettings }) => {
    const [originalSettings, setOriginalSettings] = useState(settings.printing);
    
    useEffect(() => {
        setOriginalSettings(settings.printing)
    }, [settings.printing]);

    const handleCancel = () => {
        setSettings(prev => ({...prev, printing: originalSettings}));
    }

    const methods = [
        { id: PrintingMethod.Native, icon: <IconPrinter/>, description: "Impresión nativa y por defecto del navegador, sin configuración adicional.", tag: null },
        { id: PrintingMethod.Bluetooth, icon: <IconBluetooth/>, description: "Conexión inalámbrica mediante Bluetooth.", tag: "Impresión automática" },
        { id: PrintingMethod.USB, icon: <IconUSB/>, description: "Conexión mediante cable USB. Requiere instalar el driver. Solo disponible para computadoras o laptops.", tag: "Impresión automática" },
    ];
    
    return (
        <div className="space-y-6">
            <SettingsCard title="Método de impresión" onSave={onSave} onCancel={handleCancel}>
                <div className="space-y-3">
                    {methods.map(method => (
                        <button key={method.id} onClick={() => setSettings(p => ({...p, printing: { method: method.id } }))} className={`w-full text-left p-4 border-2 rounded-lg flex items-start gap-4 transition-all ${settings.printing.method === method.id ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                            <div className={`flex-shrink-0 ${settings.printing.method === method.id ? 'text-green-600' : 'text-gray-500'}`}>{method.icon}</div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold">{method.id}</h4>
                                    {method.tag && <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{method.tag}</span>}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{method.description}</p>
                            </div>
                            {settings.printing.method === method.id && <IconCheck className="h-6 w-6 text-green-500 flex-shrink-0"/>}
                        </button>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
};

const ZoneEditor: React.FC<{
    initialZone: Zone;
    onSave: (zone: Zone) => void;
    onExit: () => void;
}> = ({ initialZone, onSave, onExit }) => {
    // ... (Same ZoneEditor code)
    const [zone, setZone] = useState(initialZone);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const selectedTable = useMemo(() => zone.tables.find(t => t.id === selectedTableId), [zone.tables, selectedTableId]);

    const isCellOccupied = (row: number, col: number, tableIdToIgnore: string | null = null): boolean => {
        return zone.tables.some(table => {
            if (table.id === tableIdToIgnore) return false;
            return row >= table.row && row < table.row + table.height &&
                   col >= table.col && col < table.col + table.width;
        });
    };
    
    const handleTableUpdate = (updatedTable: Table) => {
        // Check for collisions before updating state
        for (let r = 0; r < updatedTable.height; r++) {
            for (let c = 0; c < updatedTable.width; c++) {
                if (isCellOccupied(updatedTable.row + r, updatedTable.col + c, updatedTable.id)) {
                    alert("La mesa no puede superponerse con otra existente.");
                    return; // Abort update
                }
            }
        }

        setZone(prevZone => ({
            ...prevZone,
            tables: prevZone.tables.map(t => t.id === updatedTable.id ? updatedTable : t),
        }));
    };
    
    const addTable = (row: number, col: number) => {
        if (isCellOccupied(row, col)) return;

        const newTable: Table = {
            id: crypto.randomUUID(), // Use standard UUID generator for Supabase compatibility
            zoneId: zone.id,
            name: (zone.tables.length + 1).toString(),
            row,
            col,
            width: 1,
            height: 1,
            shape: 'square',
            status: 'available',
        };

        setZone(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
        setSelectedTableId(newTable.id);
    };
    
    const deleteTable = (tableId: string) => {
         setZone(prev => ({
            ...prev,
            tables: prev.tables.filter(t => t.id !== tableId)
        }));
        setSelectedTableId(null);
    }
    
    const TableEditorSidebar: React.FC<{
        table: Table;
        onUpdate: (table: Table) => void;
        onDelete: (tableId: string) => void;
        onClose: () => void;
    }> = ({ table, onUpdate, onDelete, onClose }) => {
        if (!table) return null;
        return (
            <div className="absolute top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-lg z-20 flex flex-col p-4 border-r dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onClose} className="flex items-center text-sm font-semibold">
                       <IconArrowLeft className="h-4 w-4 mr-1"/> Mesa {table.name}
                    </button>
                </div>
                 <div className="space-y-4 flex-grow">
                     <div>
                        <label className="text-sm font-medium">Identificador</label>
                        <input type="text" value={table.name} onChange={e => onUpdate({...table, name: e.target.value})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Forma</label>
                        <select value={table.shape} onChange={e => onUpdate({...table, shape: e.target.value as 'square' | 'round'})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent dark:bg-gray-800">
                            <option value="square">Cuadrada</option>
                            <option value="round">Redonda</option>
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium">Ancho</label>
                            <input type="number" min="1" value={table.width} onChange={e => onUpdate({...table, width: Math.max(1, parseInt(e.target.value) || 1)})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent" />
                        </div>
                         <div>
                            <label className="text-sm font-medium">Altura</label>
                            <input type="number" min="1" value={table.height} onChange={e => onUpdate({...table, height: Math.max(1, parseInt(e.target.value) || 1)})} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-transparent"/>
                        </div>
                    </div>
                 </div>
                 <button onClick={() => onDelete(table.id)} className="w-full text-red-600 dark:text-red-400 py-2 text-sm font-semibold border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50">Borrar</button>
            </div>
        );
    }
    

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col">
            <header className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-x-4">
                    <button onClick={onExit} className="flex items-center text-red-600 font-semibold text-sm">
                        <IconLogoutAlt className="h-5 w-5 mr-1 transform rotate-180" />
                        Salir
                    </button>
                    <h2 className="text-xl font-bold">{zone.name}</h2>
                </div>
                <button onClick={() => onSave(zone)} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">
                    Guardar
                </button>
            </header>
            <div className="flex-1 flex overflow-hidden relative">
                {selectedTable && <TableEditorSidebar table={selectedTable} onUpdate={handleTableUpdate} onDelete={deleteTable} onClose={() => setSelectedTableId(null)}/>}
                
                <main className="flex-1 p-8 overflow-auto bg-gray-100 dark:bg-gray-900" onClick={(e) => { if(e.target === e.currentTarget) setSelectedTableId(null)}}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 w-full min-h-full">
                        <div
                            ref={gridRef}
                            className="grid"
                            style={{
                                gridTemplateColumns: `repeat(${zone.cols}, minmax(60px, 1fr))`,
                                gridTemplateRows: `repeat(${zone.rows}, minmax(60px, 1fr))`,
                                gap: '1rem'
                            }}
                        >
                           {/* Render tables using pure CSS Grid positioning */}
                            {zone.tables.map(table => (
                                <div
                                    key={table.id}
                                    onClick={() => setSelectedTableId(table.id)}
                                    className={`flex items-center justify-center font-bold text-lg text-gray-800 dark:text-gray-100 cursor-pointer border-2 transition-all duration-200
                                        ${table.shape === 'round' ? 'rounded-full' : 'rounded-lg'}
                                        ${selectedTableId === table.id ? 'bg-green-200 border-green-500 dark:bg-green-800 dark:border-green-400 ring-2 ring-green-500' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:border-emerald-400'}`
                                    }
                                    style={{
                                        gridRow: `${table.row} / span ${table.height}`,
                                        gridColumn: `${table.col} / span ${table.width}`,
                                    }}
                                >
                                    {table.name}
                                </div>
                            ))}
                            {/* Render placeholders only in unoccupied cells */}
                            {Array.from({ length: zone.rows * zone.cols }).map((_, index) => {
                                const row = Math.floor(index / zone.cols) + 1;
                                const col = (index % zone.cols) + 1;
                                if (isCellOccupied(row, col)) return null;
                                return (
                                    <div
                                        key={`cell-${row}-${col}`}
                                        onClick={() => addTable(row, col)}
                                        className="bg-gray-100 dark:bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-100 hover:text-green-600 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400"
                                        style={{ gridRow: row, gridColumn: col }}
                                    >
                                        <IconPlus className="h-6 w-6"/>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onEditZoneLayout: (zone: Zone) => void;
    initialPage?: SettingsPage;
}> = ({ isOpen, onClose, onEditZoneLayout, initialPage = 'general' }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [activePage, setActivePage] = useState<SettingsPage>(initialPage);
    const [zones, setZones] = useState<Zone[]>([]);

    useEffect(() => {
        if (isOpen) {
            setActivePage(initialPage);
            getAppSettings().then(setSettings);
            fetchData();
        }
    }, [isOpen, initialPage]);

    const handleSaveSettings = async () => {
        if (!settings) return;
        try {
            await saveAppSettings(settings);
            alert("¡Configuración guardada!");
        } catch (error) {
            alert("Error al guardar la configuración.");
            console.error(error);
        }
    };

    const fetchData = async () => {
        try {
            const data = await getZones();
            setZones(data);
        } catch (err) {
            console.error('Failed to load zones.', err);
        }
    };

    const handleAddZone = async () => {
        const name = prompt("Enter new zone name:");
        if (name) {
            await saveZone({ name, rows: 5, cols: 5 });
            fetchData();
        }
    };

    const handleEditZoneName = async (zone: Zone) => {
        if (zone.name.trim() === '') return;
        await saveZone({ id: zone.id, name: zone.name, rows: zone.rows, cols: zone.cols });
        fetchData();
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (window.confirm("Are you sure you want to delete this zone and all its tables?")) {
            await deleteZone(zoneId);
            fetchData();
        }
    };

    const handleEditLayout = (zone: Zone) => {
        onEditZoneLayout(zone);
        // Don't close modal here, let parent handle it to switch views smoothly
    };
    
    if (!isOpen || !settings) return null;

    const navItems: { id: SettingsPage; name: string; icon: React.ReactNode }[] = [
        { id: 'general', name: 'General', icon: <IconSettings /> },
        { id: 'store-data', name: 'Datos de la tienda', icon: <IconStore /> },
        { id: 'shipping-costs', name: 'Costos de envío', icon: <IconDelivery /> },
        { id: 'payment-methods', name: 'Métodos de pago', icon: <IconPayment /> },
        { id: 'hours', name: 'Horarios', icon: <IconClock /> },
        { id: 'zones-tables', name: 'Zonas y mesas', icon: <IconTableLayout /> },
        { id: 'printing', name: 'Impresión', icon: <IconPrinter /> },
    ];

    const renderPage = () => {
        switch (activePage) {
            case 'general': return <GeneralSettings onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            case 'store-data': return <BranchSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            case 'shipping-costs': return <ShippingSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            case 'payment-methods': return <PaymentSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            case 'hours': return <HoursSettings onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            case 'zones-tables': return <ZonesAndTablesSettings zones={zones} onAddZone={handleAddZone} onEditZoneName={handleEditZoneName} onDeleteZone={handleDeleteZone} onEditZoneLayout={handleEditLayout} />;
            case 'printing': return <PrintingSettingsView onSave={handleSaveSettings} settings={settings} setSettings={setSettings} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-end">
            <div className="bg-white dark:bg-gray-900 h-full w-full max-w-5xl flex flex-col relative">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-x-4">
                        <h2 className="text-xl font-bold">Configuración</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><IconX /></button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-64 border-r dark:border-gray-700 p-4">
                        <nav className="space-y-1">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-md text-sm font-medium ${activePage === item.id ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    {item.icon}
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                        {renderPage()}
                    </main>
                </div>
            </div>
        </div>
    );
};

const QRModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
    filename: string;
}> = ({ isOpen, onClose, url, title, filename }) => {
    if (!isOpen) return null;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to download QR code:", error);
            alert("No se pudo descargar el código QR.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-sm text-center p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Escanea este código para abrir el menú.</p>
                <div className="flex justify-center">
                    <img src={qrUrl} alt={title} className="w-64 h-64 rounded-lg border-4 border-white dark:border-gray-700" />
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button onClick={handleDownload} className="w-full px-4 py-3 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                        Descargar QR
                    </button>
                    <button onClick={onClose} className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShareView: React.FC<{ onGoToTableSettings: () => void }> = ({ onGoToTableSettings }) => {
    const [activeTab, setActiveTab] = useState<'domicilio' | 'mesas' | 'multi-sucursal'>('domicilio');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrModalData, setQrModalData] = useState({ url: '', title: '', filename: '' });
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appSettings, zoneData] = await Promise.all([
                    getAppSettings(),
                    getZones()
                ]);
                setSettings(appSettings);
                setZones(zoneData);
            } catch (error) {
                console.error("Failed to load share data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Enlace copiado al portapapeles");
        });
    };
    
    const openQrModal = (url: string, title: string, filename: string) => {
        setQrModalData({ url, title, filename });
        setIsQrModalOpen(true);
    };

    if (isLoading || !settings) {
         return <div className="p-10 text-center">Cargando opciones de compartir...</div>;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const menuLink = `${baseUrl}#/menu`;

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Comparte tu menú digital</h2>
                <div className="flex items-center gap-4">
                    <input type="text" readOnly value={menuLink} className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-sm focus:ring-0"/>
                    <button onClick={() => copyToClipboard(menuLink)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition-colors">Copiar</button>
                    <button onClick={() => openQrModal(menuLink, "Código QR del Menú", "menu-qr.png")} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                        <IconQR className="h-5 w-5"/> QR
                    </button>
                    <a href={menuLink} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                        <IconExternalLink className="h-5 w-5"/> Abrir
                    </a>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('domicilio')} className={`${activeTab === 'domicilio' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Domicilios y Recoger</button>
                    <button onClick={() => setActiveTab('mesas')} className={`${activeTab === 'mesas' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Mesas (Dine-in)</button>
                    <button onClick={() => setActiveTab('multi-sucursal')} className={`${activeTab === 'multi-sucursal' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Multi-sucursal</button>
                </nav>
            </div>

            {activeTab === 'domicilio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center text-center hover:border-emerald-500 transition-colors cursor-pointer group" onClick={() => copyToClipboard(menuLink)}>
                         <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <IconDelivery className="h-8 w-8"/>
                         </div>
                         <h3 className="font-bold text-lg mb-2">Enlace para Domicilios</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Comparte este enlace en tus redes sociales (Instagram, Facebook) y perfil de WhatsApp Business.</p>
                         <span className="text-emerald-600 font-semibold text-sm">Click para copiar</span>
                    </div>
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 flex flex-col items-center text-center hover:border-emerald-500 transition-colors cursor-pointer group" onClick={() => copyToClipboard(menuLink)}>
                         <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <IconStore className="h-8 w-8"/>
                         </div>
                         <h3 className="font-bold text-lg mb-2">Enlace para Recoger</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ideal para clientes que quieren ordenar antes de llegar a tu local.</p>
                         <span className="text-emerald-600 font-semibold text-sm">Click para copiar</span>
                    </div>
                </div>
            )}
            
            {activeTab === 'mesas' && (
                <div className="space-y-6">
                    {zones.length === 0 ? (
                         <div className="text-center py-10 px-6 border-2 border-dashed dark:border-gray-600 rounded-lg">
                            <IconTableLayout className="h-10 w-10 mx-auto text-gray-400 mb-3"/>
                            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">No tienes mesas configuradas</h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">Configura tus zonas y mesas primero para generar sus códigos QR.</p>
                            <button onClick={onGoToTableSettings} className="text-emerald-600 font-semibold hover:underline">Ir a configuración de mesas</button>
                        </div>
                    ) : (
                        zones.map(zone => (
                            <div key={zone.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
                                <h3 className="font-bold text-lg mb-4 border-b dark:border-gray-700 pb-2">{zone.name}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {zone.tables.map(table => {
                                        const tableUrl = `${menuLink}?table=${table.name}&zone=${zone.name}`;
                                        return (
                                            <div key={table.id} className="border dark:border-gray-600 rounded-lg p-4 text-center hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-900/50">
                                                <p className="font-bold text-lg mb-2">{table.name}</p>
                                                <button 
                                                    onClick={() => openQrModal(tableUrl, `Mesa ${table.name} - ${zone.name}`, `qr-${zone.name}-${table.name}.png`)}
                                                    className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    Ver QR
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'multi-sucursal' && (
                 <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto h-16 w-16 text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <IconStore className="h-10 w-10" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Gestión Multi-sucursal</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Próximamente podrás gestionar múltiples sucursales y generar enlaces únicos para cada una.</p>
                </div>
            )}

            <QRModal 
                isOpen={isQrModalOpen} 
                onClose={() => setIsQrModalOpen(false)} 
                url={qrModalData.url} 
                title={qrModalData.title} 
                filename={qrModalData.filename}
            />
            
            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-fade-in-up">
                    <IconCheck className="h-5 w-5 text-emerald-400"/>
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AdminViewPage>('dashboard');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // Placeholder for preview modal logic
    const [theme, toggleTheme] = useTheme();
    
    // State for Zone Editor Logic
    const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
    const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);

    const openTableSettings = () => {
        setIsSettingsOpen(true);
        // In a real app, pass initialPage='zones-tables' prop to SettingsModal
    };
    
    const handleEditZoneLayout = (zone: Zone) => {
        setZoneToEdit(zone);
        setIsSettingsOpen(false);
        setIsZoneEditorOpen(true);
    };

    const handleSaveZoneLayout = async (updatedZone: Zone) => {
        try {
            await saveZoneLayout(updatedZone);
            setIsZoneEditorOpen(false);
            setZoneToEdit(null);
            setIsSettingsOpen(true); // Return to settings
        } catch (error) {
            alert("Error al guardar la distribución: " + error);
        }
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'products': return <MenuManagement />;
            case 'orders': return <OrderManagement onSettingsClick={openTableSettings} />;
            case 'analytics': return <Analytics />;
            case 'messages': return <Messages />;
            case 'availability': return <AvailabilityView />;
            case 'share': return <ShareView onGoToTableSettings={openTableSettings}/>;
            case 'tutorials': return <div className="p-10 text-center text-gray-500">Tutoriales próximamente...</div>;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-200 overflow-hidden transition-colors duration-200">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    title={PAGE_TITLES[currentPage]} 
                    onSettingsClick={() => setIsSettingsOpen(true)} 
                    onPreviewClick={() => setIsPreviewOpen(true)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
                <main className="flex-1 overflow-auto p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                </main>
            </div>
            
            {isZoneEditorOpen && zoneToEdit && (
                <ZoneEditor 
                    initialZone={zoneToEdit}
                    onSave={handleSaveZoneLayout}
                    onExit={() => {
                        setIsZoneEditorOpen(false);
                        setZoneToEdit(null);
                        setIsSettingsOpen(true);
                    }}
                />
            )}
            
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                onEditZoneLayout={handleEditZoneLayout}
            />
        </div>
    );
};

export default AdminView;
