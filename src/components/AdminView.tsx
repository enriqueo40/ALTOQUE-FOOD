
// ... existing imports ...
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

// ... existing code ...

const PromotionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (promo: Omit<Promotion, 'id' | 'created_at'> & { id?: string }) => void;
    promotion: Promotion | null;
    products: Product[];
}> = ({ isOpen, onClose, onSave, promotion, products }) => {
    
    const getInitialFormData = (): Omit<Promotion, 'id' | 'created_at'> & { id?: string } => ({
        id: '',
        name: '',
        discountType: DiscountType.Percentage,
        discountValue: 0,
        appliesTo: PromotionAppliesTo.SpecificProducts,
        productIds: [''],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
    });
    
    const [formData, setFormData] = useState(getInitialFormData());
    const [showPreview, setShowPreview] = useState(false); // New State for toggling preview on mobile/smaller screens

    useEffect(() => {
        if (isOpen) {
            if (promotion) {
                const productIds = (promotion.productIds?.length || 0) > 0 ? promotion.productIds : [''];
                setFormData({...promotion, productIds});
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [promotion, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'discountValue' ? parseFloat(value) || 0 : value }));
    };
    
    const handleProductChange = (index: number, productId: string) => {
        const newProductIds = [...formData.productIds];
        newProductIds[index] = productId;
        setFormData(prev => ({ ...prev, productIds: newProductIds }));
    };

    const addProductField = () => {
        setFormData(prev => ({ ...prev, productIds: [...prev.productIds, ''] }));
    };

    const removeProductField = (index: number) => {
        if (formData.productIds.length > 1) {
            const newProductIds = formData.productIds.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, productIds: newProductIds }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPromo = {
            ...formData,
            id: promotion?.id,
            productIds: formData.productIds.filter(id => id !== ''),
        };
        onSave(finalPromo);
    };

    if (!isOpen) return null;
    
    const lightInputClasses = "w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400 dark:placeholder-gray-400 dark:text-white";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-end">
            <div className="bg-white dark:bg-gray-800 h-full w-full max-w-4xl flex flex-col relative transition-all duration-300 ease-in-out">
                <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{promotion ? 'Editar' : 'Agregar'} una promoción</h2>
                    <div className="flex items-center gap-x-4">
                        <button 
                            type="button"
                            onClick={() => setShowPreview(!showPreview)} 
                            className={`lg:hidden text-sm font-medium px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${showPreview ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                        >
                            <IconEye className="w-4 h-4" /> {showPreview ? 'Ocultar' : 'Vista previa'}
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1"><IconX /></button>
                    </div>
                </header>
                <div className="flex flex-1 overflow-hidden relative">
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col w-full lg:w-2/3 h-full overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={`${lightInputClasses} mt-1`} placeholder="Ej. 2x1 en hamburguesas"/>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor del descuento</label>
                                <div className="flex items-center mt-1">
                                    <select name="discountType" value={formData.discountType} onChange={handleChange} className={`${lightInputClasses} w-1/3 rounded-r-none border-r-0`}>
                                        <option value={DiscountType.Percentage}>Porcentaje (%)</option>
                                        <option value={DiscountType.Fixed}>Monto fijo ($)</option>
                                    </select>
                                    <div className="relative flex-1">
                                        <input type="number" name="discountValue" value={formData.discountValue} onChange={handleChange} required className={`${lightInputClasses} rounded-l-none`}/>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deja en 0 si solo quieres mostrar la etiqueta (ej. para un "2x1" sin descuento automático).</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Se aplica a</label>
                                <select name="appliesTo" value={formData.appliesTo} onChange={handleChange} className={`${lightInputClasses} mt-1`}>
                                    <option value={PromotionAppliesTo.SpecificProducts}>Productos específicos</option>
                                </select>
                            </div>

                            {formData.appliesTo === PromotionAppliesTo.SpecificProducts && (
                                <div className="p-4 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50">
                                    {formData.productIds.map((pid, index) => (
                                        <div key={index} className="flex items-center gap-x-2 mb-2">
                                            <select value={pid} onChange={(e) => handleProductChange(index, e.target.value)} className={`${lightInputClasses} flex-1`}>
                                                <option value="">Selecciona un producto</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <button type="button" onClick={() => removeProductField(index)} disabled={formData.productIds.length <= 1} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50"><IconTrash/></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addProductField} className="mt-2 text-emerald-600 font-semibold text-sm flex items-center gap-x-2 hover:text-emerald-800">
                                        <IconPlus className="h-4 w-4" /> Agregar otro producto
                                    </button>
                                </div>
                            )}

                            <div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de inicio</label>
                                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`${lightInputClasses} mt-1`}/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de fin</label>
                                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`${lightInputClasses} mt-1`}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <footer className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end items-center space-x-3 sticky bottom-0 shrink-0">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700">Agregar promoción</button>
                        </footer>
                    </form>
                    
                    {/* Preview Panel - Visible on LG screens or when toggled */}
                    <div className={`absolute inset-0 lg:static lg:w-1/3 bg-gray-100 dark:bg-gray-900/95 p-6 border-l dark:border-gray-700 flex flex-col transition-transform duration-300 z-20 ${showPreview ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                         <div className="flex justify-between items-center lg:hidden mb-4">
                             <h3 className="font-semibold text-gray-800 dark:text-gray-200">Vista previa</h3>
                             <button onClick={() => setShowPreview(false)} className="text-gray-500"><IconX/></button>
                         </div>
                         <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 hidden lg:block">Vista previa en menú</h3>
                         
                         <div className="bg-white dark:bg-gray-800 rounded-xl p-3 flex gap-4 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden max-w-sm mx-auto w-full">
                            <div className="relative h-24 w-24 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                {/* Badge Preview - Always Visible in Preview Mode regardless of dates */}
                                <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10 border border-yellow-500 animate-pulse">
                                    {formData.name || 'Nombre Promo'}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight">Producto Ejemplo</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">Descripción del producto...</p>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="flex flex-col">
                                        {formData.discountValue > 0 && (
                                            <span className="text-[10px] text-gray-500 line-through">$100.00</span>
                                        )}
                                        <p className={`font-bold text-sm ${formData.discountValue > 0 ? 'text-rose-400' : 'text-gray-800 dark:text-white'}`}>
                                            ${formData.discountValue > 0 ? (formData.discountType === DiscountType.Percentage ? (100 * (1 - formData.discountValue/100)).toFixed(2) : (100 - formData.discountValue).toFixed(2)) : '100.00'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-gray-700 p-1.5 rounded-full text-emerald-500">
                                        <IconPlus className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="mt-6 text-center">
                             <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                 Así verán tus clientes la etiqueta sobre el producto.
                             </p>
                             {formData.discountValue === 0 && (
                                 <p className="text-xs text-emerald-600 mt-2 font-medium">
                                     ℹ️ Al ser descuento 0%, solo se mostrará la etiqueta amarilla. El precio no cambiará.
                                 </p>
                             )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... existing code ...
