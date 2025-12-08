import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { Product, Category, Order, OrderStatus, Conversation, AdminChatMessage, OrderType, Personalization, PersonalizationOption, Promotion, DiscountType, PromotionAppliesTo, Zone, Table, AppSettings, Currency, BranchSettings, PaymentSettings, ShippingSettings, PaymentMethod, DaySchedule, Schedule, ShippingCostType, TimeRange, PrintingMethod, PaymentStatus, Customer } from '../types';
import { MOCK_CONVERSATIONS, CURRENCIES } from '../constants';
import { generateProductDescription, getAdvancedInsights } from '../services/geminiService';
import { getProducts, getCategories, saveProduct, deleteProduct, saveCategory, deleteCategory, getPersonalizations, savePersonalization, deletePersonalization, getPromotions, savePromotion, deletePromotion, updateProductAvailability, updatePersonalizationOptionAvailability, getZones, saveZone, deleteZone, saveZoneLayout, getAppSettings, saveAppSettings, subscribeToNewOrders, unsubscribeFromChannel, updateOrder, getActiveOrders, saveOrder } from '../services/supabaseService';
import { IconComponent, IconHome, IconMenu, IconAvailability, IconShare, IconTutorials, IconOrders, IconAnalytics, IconChatAdmin, IconLogout, IconSearch, IconBell, IconEdit, IconPlus, IconTrash, IconSparkles, IconSend, IconMoreVertical, IconExternalLink, IconCalendar, IconChevronDown, IconX, IconReceipt, IconSettings, IconStore, IconDelivery, IconPayment, IconClock, IconTableLayout, IconPrinter, IconChevronUp, IconPencil, IconDuplicate, IconGripVertical, IconPercent, IconInfo, IconTag, IconLogoutAlt, IconSun, IconMoon, IconArrowLeft, IconWhatsapp, IconQR, IconLocationMarker, IconUpload, IconCheck, IconBluetooth, IconUSB, IconToggleOn, IconToggleOff, IconFilter } from '../constants';

const IconEye: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className={className} />;

// ... existing code ...
// (Skipping Sidebar, Header, FeatureBanner, FilterDropdown, DashboardStatCard, Dashboard, ProductListItem, ProductModal, CategoryModal, ProductsView, PersonalizationModal, PersonalizationsView, PromotionModal, PromotionsView, MenuManagement, OrderDetailModal, OrderStatusBadge, TimeAgo, OrderCard, OrdersKanbanBoard, OrderListView, EmptyOrdersView, NewOrderModal) 
// until OrderManagement component

const OrderManagement: React.FC<{ onSettingsClick: () => void }> = ({ onSettingsClick }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState('panel-pedidos');
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [storeOpen, setStoreOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
    
    // State for Table Panel
    const [zones, setZones] = useState<Zone[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>('');

    // Initial Load
    useEffect(() => {
        const load = async () => {
            // Fetch orders and zones
            const [activeOrders, fetchedZones] = await Promise.all([
                getActiveOrders(),
                getZones()
            ]);
            
            setOrders(activeOrders);
            setZones(fetchedZones);
            if(fetchedZones.length > 0) {
                setActiveZoneId(fetchedZones[0].id);
            }
            setIsLoading(false);
        };
        load();

        // Realtime Subscription
        const channel = subscribeToNewOrders(
            (newOrder) => {
                // Play simple notification sound if possible (browser policy permitting)
                try { const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audio.volume=0.5; audio.play().catch(e=>{}); } catch(e){}
                setOrders(prev => [newOrder, ...prev]);
            },
            (updatedOrder) => {
                 setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            }
        );

        return () => {
            unsubscribeFromChannel();
        };
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try {
            await updateOrder(orderId, { status: newStatus });
        } catch (e: any) {
            console.error(e);
            // Fix: Robust error handling to avoid [object Object]
            const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
            alert(`Error updating order status: ${errorMsg}`);
            // Revert if failed (could be implemented by re-fetching)
        }
    };
    
    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        try {
             await updateOrder(orderId, { paymentStatus: newStatus });
        } catch (e: any) {
            console.error(e);
             // Fix: Robust error handling to avoid [object Object]
             const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
             alert(`Error updating payment status: ${errorMsg}`);
        }
    }
    
    const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId]);
    
    // Calculate Table Status
    const getTableStatus = (zoneName: string, tableName: string) => {
        const tableIdentifier = `${zoneName} - ${tableName}`;
        const activeOrder = orders.find(o => 
            o.tableId === tableIdentifier && 
            o.status !== OrderStatus.Completed && 
            o.status !== OrderStatus.Cancelled
        );
        
        return activeOrder ? { status: 'occupied', order: activeOrder } : { status: 'free', order: null };
    };
    
    const tableStats = useMemo(() => {
         // Simple stats calculation based on current orders
         const activeTables = orders.filter(o => o.tableId && o.status !== OrderStatus.Completed && o.status !== OrderStatus.Cancelled).length;
         // Mocking specific "Requesting Bill" states since backend doesn't support it yet, using PaymentStatus 'pending' + 'Ready' status as a proxy
         const requestingBill = orders.filter(o => o.tableId && o.status === OrderStatus.Ready && o.paymentStatus === 'pending').length;
         
         return {
             requestingBill: requestingBill,
             requestingWaiter: 0, // Feature not yet implemented in backend
             pendingOrders: orders.filter(o => o.tableId && o.status === OrderStatus.Pending).length,
             activeTables: activeTables
         }
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            // Handle null orderType by defaulting to TakeAway if needed or just checking logic
            const currentType = order.orderType || OrderType.TakeAway;
            const matchesType = typeFilter === 'all' || currentType === typeFilter;
            return matchesStatus && matchesType;
        });
    }, [orders, statusFilter, typeFilter]);

    const tabs = [
        { id: 'panel-pedidos', title: 'Panel de pedidos' },
        { id: 'panel-mesas', title: 'Panel de mesas' },
        { id: 'comandas-digitales', title: 'Comandas digitales' },
    ];
    
    const renderContent = () => {
        if (isLoading) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando tablero de control...</div>;

        switch (activeTab) {
            case 'panel-pedidos':
                return (
                    <div className="h-[calc(100vh-220px)] flex flex-col">
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 px-1 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm">
                                    <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vista Tablero"><IconTableLayout className="h-5 w-5"/></button>
                                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Vista Lista"><IconMenu className="h-5 w-5"/></button>
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"/>
                                        <select 
                                            value={statusFilter} 
                                            onChange={(e) => setStatusFilter(e.target.value as any)} 
                                            className="pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none shadow-sm"
                                        >
                                            <option value="all">Todos los estados</option>
                                            {Object.values(OrderStatus).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
                                    </div>

                                    <div className="relative">
                                        <select 
                                            value={typeFilter} 
                                            onChange={(e) => setTypeFilter(e.target.value as any)} 
                                            className="pl-4 pr-8 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none shadow-sm"
                                        >
                                            <option value="all">Todos los tipos</option>
                                            {Object.values(OrderType).map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Updated Header Buttons matching screenshot */}
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                     <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors shadow-sm ${storeOpen ? 'border-green-900/30 bg-green-900/20 text-green-400' : 'border-red-900/30 bg-red-900/20 text-red-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${storeOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {storeOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}
                                        <IconChevronDown className="h-4 w-4 opacity-50 ml-2"/>
                                    </button>
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700 hidden group-hover:block z-10 p-1">
                                        <button onClick={() => setStoreOpen(o => !o)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-gray-300">
                                             <IconToggleOff className="h-4 w-4"/> {storeOpen ? 'Cerrar Tienda' : 'Abrir Tienda'}
                                        </button>
                                    </div>
                                </div>

                                <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition-all">
                                    <IconPlus className="h-4 w-4 text-gray-900" /> Pedido Manual
                                </button>
                            </div>
                         </div>
                        
                        {filteredOrders.length === 0 ? (
                             <EmptyOrdersView onNewOrderClick={() => setIsNewOrderModalOpen(true)} />
                        ) : (
                            viewMode === 'board' ? (
                                <OrdersKanbanBoard orders={filteredOrders} onOrderClick={setSelectedOrder} />
                            ) : (
                                <div className="flex-1 overflow-auto rounded-lg border dark:border-gray-700">
                                    <OrderListView orders={filteredOrders} onOrderClick={setSelectedOrder} />
                                </div>
                            )
                        )}
                    </div>
                );

            case 'panel-mesas':
// ... rest of code ...
