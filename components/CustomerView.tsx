

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, CartItem, Order, OrderStatus, Customer, AppSettings, ShippingCostType, PaymentMethod, OrderType, Personalization, Promotion, DiscountType, PromotionAppliesTo, PersonalizationOption, Schedule } from '../types';
import { useCart } from '../hooks/useCart';
import { IconPlus, IconMinus, IconClock, IconShare, IconArrowLeft, IconTrash, IconX, IconWhatsapp, IconTableLayout, IconSearch, IconLocationMarker, IconStore, IconTag, IconCheck, IconCalendar, IconDuplicate, IconMap, IconSparkles } from '../constants';
import { getProducts, getCategories, getAppSettings, saveOrder, getPersonalizations, getPromotions, subscribeToMenuUpdates, unsubscribeFromChannel } from '../services/supabaseService';
import Chatbot from './Chatbot';

// Main View Manager
export default function CustomerView() {
    const [view, setView] = useState<'menu' | 'cart' | 'checkout' | 'confirmation'>('menu');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [generalComments, setGeneralComments] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState<{ table: string; zone: string } | null>(null);
    // State for Order Type (Delivery, TakeAway, DineIn)
    const [orderType, setOrderType] = useState<OrderType>(OrderType.Delivery);

    const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
    
    // Global data for the menu
    const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
    const [allPersonalizations, setAllPersonalizations] = useState<Personalization[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);

    const fetchMenuData = async () => {
        try {
            // Parallel data fetching for speed
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
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
        
        // Subscribe to real-time updates for the menu (Admin changes)
        subscribeToMenuUpdates(() => {
            console.log("Menu updated from admin (Realtime), refreshing...");
            fetchMenuData();
        });

        // Polling fallback: Check for updates every 30 seconds to ensure sync
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing menu data (Polling)...");
            fetchMenuData();
        }, 30000);

        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const table = params.get('table');
        const zone = params.get('zone');
        if (table && zone) {
            setTableInfo({ table, zone });
            setOrderType(OrderType.DineIn);
        }

        return () => {
            unsubscribeFromChannel();
            clearInterval(intervalId);
        };
    }, []);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handleAddToCart = (product: Product, quantity: number, comments?: string, options: PersonalizationOption[] = []) => {
        addToCart(product, quantity, comments, options);
        setSelectedProduct(null);
    };

    const gpsLocation = (link?: string) => {
        if(!link) return '';
        return `🌐 *UBICACIÓN EN TIEMPO REAL:*\n${link}`;
    }

    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0) => {
        if (!settings) return;

        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) 
            ? (settings.shipping.fixedCost ?? 0) 
            : 0;

        const finalTotal = cartTotal + shippingCost + tipAmount;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments + (tipAmount > 0 ? ` | Propina: ${settings.company.currency.code} ${tipAmount.toFixed(2)}` : ''),
            orderType: orderType,
            tableId: orderType === OrderType.DineIn && tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
        };

        try {
            await saveOrder(newOrder);
        } catch(e) {
            console.error("Failed to save order", e);
            alert("Hubo un error al guardar tu pedido. Por favor, intenta de nuevo.");
            return; // Stop if saving fails
        }

        // Helper to format options string
        const formatOptions = (item: CartItem) => {
            if (!item.selectedOptions || item.selectedOptions.length === 0) return '';
            return item.selectedOptions.map(opt => `   + ${opt.name}`).join('\n');
        };

        let messageParts: string[];

        const itemDetails = cartItems.map(item => {
            let detail = `▪️ ${item.quantity}x ${item.name}`;
            const optionsStr = formatOptions(item);
            if (optionsStr) detail += `\n${optionsStr}`;
            if (item.comments) detail += `\n   _Nota: ${item.comments}_`;
            return detail;
        });

        const currency = settings.company.currency.code;
        const lineSeparator = "━━━━━━━━━━━━━━━━━━━━";
        const gpsLink = customer.address.googleMapsLink;

        if (orderType === OrderType.D