
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table, AppSettings, Order } from '../types';
import { INITIAL_SETTINGS } from '../constants';

const supabaseUrl = "https://cnbntnnhxlvkvallumdg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYm50bm5oeGx2a3ZhbGx1bWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjQ1MjksImV4cCI6MjA3ODY0MDUyOX0.TuovcK2Ao2tb3GM0I2j5n2BpL5DIVLSl-yjdoCHS9pM";

let supabase: SupabaseClient | null = null;
let ordersChannel: RealtimeChannel | null = null;
let menuChannel: RealtimeChannel | null = null;

// --- IN-MEMORY CACHE ---
// Used to store static data and avoid re-fetching on every component mount.
const cache: {
    categories: Category[] | null;
    products: Product[] | null;
    settings: AppSettings | null;
    zones: Zone[] | null;
    personalizations: Personalization[] | null;
    promotions: Promotion[] | null;
} = {
    categories: null,
    products: null,
    settings: null,
    zones: null,
    personalizations: null,
    promotions: null,
};

const getClient = (): SupabaseClient => {
    if (supabase) return supabase;
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
};

// --- Settings Functions ---
export const getAppSettings = async (): Promise<AppSettings> => {
    // Return cached settings instantly if available
    if (cache.settings) return cache.settings;

    const { data, error } = await getClient().from('app_settings').select('settings').eq('id', 1).single();
    
    const deepMerge = (target: any, source: any) => {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        return { ...target, ...source };
    };

    let result = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
    if (!error && data?.settings) {
        result = deepMerge(result, data.settings);
    }
    
    cache.settings = result; // Cache result
    return result;
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    cache.settings = settings; // Optimistic cache update
    await getClient().from('app_settings').update({ settings, updated_at: new Date().toISOString() }).eq('id', 1);
};

// --- Categories Functions ---
export const getCategories = async (forceRefresh = false): Promise<Category[]> => {
    if (cache.categories && !forceRefresh) return cache.categories;
    const { data } = await getClient().from('categories').select('*').order('created_at');
    cache.categories = data || [];
    return cache.categories;
};

export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'> & { id?: string }): Promise<Category> => {
    const { id, ...categoryData } = category;
    const { data, error } = await getClient().from('categories').upsert({ id, ...categoryData }).select().single();
    if (error || !data) throw new Error(error?.message || "Could not save category.");
    // Invalidate cache
    cache.categories = null; 
    return data;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await getClient().from('categories').delete().eq('id', categoryId);
    if (error) throw error;
    cache.categories = null;
};

// --- Products Functions ---
export const getProducts = async (forceRefresh = false): Promise<Product[]> => {
    if (cache.products && !forceRefresh) return cache.products;
    const { data } = await getClient().from('products').select('*').order('name');
    cache.products = data || [];
    return cache.products;
};

export const saveProduct = async (product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> => {
    const { id, ...productData } = product;
    const { data, error } = await getClient().from('products').upsert({ id, ...productData }).select().single();
    if (error || !data) throw new Error(error?.message || "Could not save product.");
    cache.products = null;
    return data;
};

export const updateProductAvailability = async (productId: string, available: boolean): Promise<Product> => {
    // Optimistic update in cache if exists
    if (cache.products) {
        cache.products = cache.products.map(p => p.id === productId ? { ...p, available } : p);
    }
    
    const { data, error } = await getClient().from('products').update({ available }).eq('id', productId).select().single();
    if (error || !data) throw new Error("Could not update product availability.");
    return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await getClient().from('products').delete().eq('id', productId);
    if (error) throw error;
    cache.products = null;
};

// --- Personalizations Functions ---
export const getPersonalizations = async (forceRefresh = false): Promise<Personalization[]> => {
    if (cache.personalizations && !forceRefresh) return cache.personalizations;
    
    const { data, error } = await getClient().from('personalizations').select('*, options:personalization_options(*)');
    if (error) throw error;
    
    const result = (data?.map(p => ({
        ...p,
        allowRepetition: p.allow_repetition,
        minSelection: p.min_selection,
        maxSelection: p.max_selection
    })) || []) as Personalization[];
    
    cache.personalizations = result;
    return result;
};

export const updatePersonalizationOptionAvailability = async (optionId: string, available: boolean): Promise<PersonalizationOption> => {
    const { data, error } = await getClient().from('personalization_options').update({ available }).eq('id', optionId).select().single();
    if (error || !data) throw new Error("Could not update option availability.");
    cache.personalizations = null; // Invalidate deep nested structure
    return data;
};

export const savePersonalization = async (personalization: Omit<Personalization, 'id' | 'created_at'> & { id?: string }): Promise<Personalization> => {
    const { options, ...personalizationData } = personalization;
    const { data: savedP, error } = await getClient().from('personalizations').upsert({
        id: personalizationData.id, name: personalizationData.name, label: personalizationData.label,
        allow_repetition: personalizationData.allowRepetition, min_selection: personalizationData.minSelection,
        max_selection: personalizationData.maxSelection
    }).select().single();
    if (error || !savedP) throw error;
    await getClient().from('personalization_options').delete().eq('personalization_id', savedP.id);
    if (options && options.length > 0) {
        await getClient().from('personalization_options').insert(options.map(o => ({ personalization_id: savedP.id, name: o.name, price: o.price, available: true })));
    }
    cache.personalizations = null;
    return (await getPersonalizations(true)).find(p => p.id === savedP.id)!;
};

export const deletePersonalization = async (personalizationId: string): Promise<void> => {
    const { error } = await getClient().from('personalizations').delete().eq('id', personalizationId);
    if (error) throw error;
    cache.personalizations = null;
};

// --- Promotions Functions ---
export const getPromotions = async (forceRefresh = false): Promise<Promotion[]> => {
    if (cache.promotions && !forceRefresh) return cache.promotions;

    const { data, error } = await getClient().from('promotions').select('*, promotion_products(product_id)');
    if (error) throw error;
    
    const result = data?.map(promo => ({
        ...promo,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        appliesTo: promo.applies_to,
        productIds: promo.promotion_products.map((p: any) => p.product_id),
        startDate: promo.start_date,
        endDate: promo.end_date,
    })) || [];
    
    cache.promotions = result;
    return result;
};

export const savePromotion = async (promotion: Omit<Promotion, 'id' | 'created_at'> & { id?: string }): Promise<Promotion> => {
    const { productIds, ...promoData } = promotion;
    const { data: savedPromo, error: promoError } = await getClient().from('promotions').upsert({
        id: promoData.id, name: promoData.name, discount_type: promoData.discountType,
        discount_value: promoData.discountValue, applies_to: promoData.appliesTo,
        start_date: promoData.startDate || null, end_date: promoData.endDate || null,
    }).select().single();
    if (promoError || !savedPromo) throw new Error("Error saving promotion");
    await getClient().from('promotion_products').delete().eq('promotion_id', savedPromo.id);
    if (productIds && productIds.length > 0) {
        await getClient().from('promotion_products').insert(productIds.map(pid => ({ promotion_id: savedPromo.id, product_id: pid })));
    }
    cache.promotions = null;
    return { ...promotion, id: savedPromo.id };
};

export const deletePromotion = async (promotionId: string): Promise<void> => {
    const { error } = await getClient().from('promotions').delete().eq('id', promotionId);
    if (error) throw error;
    cache.promotions = null;
};

// --- Zones and Tables Functions ---
export const getZones = async (forceRefresh = false): Promise<Zone[]> => {
    if (cache.zones && !forceRefresh) return cache.zones;
    const { data } = await getClient().from('zones').select('*, tables(*)');
    cache.zones = data || [];
    return cache.zones;
};

export const saveZone = async (zone: Pick<Zone, 'name' | 'rows' | 'cols'> & { id?: string }): Promise<Zone> => {
    const { id, ...zoneData } = zone;
    const { data, error } = await getClient().from('zones').upsert({ id, ...zoneData }).select('*, tables(*)').single();
    if (error || !data) throw new Error("Could not save zone.");
    cache.zones = null;
    return data as Zone;
};

export const deleteZone = async (zoneId: string): Promise<void> => {
    const { error } = await getClient().from('zones').delete().eq('id', zoneId);
    if (error) throw error;
    cache.zones = null;
};

export const saveZoneLayout = async (zone: Zone): Promise<void> => {
    const { tables, ...zoneData } = zone;
    await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    const { data: existingTables } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    const existingIds = (existingTables || []).map(t => t.id);
    const newIds = tables.map(t => t.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    if (toDelete.length > 0) await getClient().from('tables').delete().in('id', toDelete);
    if (tables.length > 0) {
        const toSave = tables.map(({ created_at, zoneId, ...rest }) => ({ ...rest, zone_id: zone.id }));
        await getClient().from('tables').upsert(toSave);
    }
    cache.zones = null;
};

// --- Orders Functions ---
export const saveOrder = async (order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    const payload = {
        customer: {
            ...order.customer,
            paymentProof: order.paymentProof 
        },
        items: order.items,
        status: order.status,
        total: order.total,
        order_type: order.orderType,
        table_id: order.tableId,
        payment_status: order.paymentStatus || 'pending',
        tip: order.tip || 0
    };

    try {
        const { data, error } = await getClient().from('orders').insert(payload).select().single();
        if (error) throw error;
        return { ...order, id: data.id, createdAt: new Date(data.created_at) } as Order;
    } catch (error: any) {
        if (error.code === 'PGRST204') {
            console.warn("Database schema mismatch. Retrying save without problematic columns.");
            const { tip, payment_status, ...safePayload } = payload;
            const { data: retryData, error: retryError } = await getClient().from('orders').insert(safePayload).select().single();
            if (retryError) throw retryError;
            return { ...order, id: retryData.id, createdAt: new Date(retryData.created_at) } as Order;
        }
        throw new Error(error.message || 'Error saving order');
    }
};

export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
    const dbUpdates: any = { ...updates };
    if (updates.paymentStatus) { dbUpdates.payment_status = updates.paymentStatus; delete dbUpdates.paymentStatus; }
    await getClient().from('orders').update(dbUpdates).eq('id', orderId);
};

export const getActiveOrders = async (): Promise<Order[]> => {
    const { data } = await getClient().from('orders').select('*').neq('status', 'Cancelled').order('created_at', { ascending: false });
    return (data || []).map((o: any) => ({
        id: o.id, customer: o.customer, items: o.items, status: o.status, total: o.total, createdAt: new Date(o.created_at),
        orderType: o.order_type, tableId: o.table_id, paymentStatus: o.payment_status, tip: o.tip
    })) as Order[];
};

export const subscribeToNewOrders = (onInsert: (o: Order) => void, onUpdate?: (o: Order) => void) => {
    const client = getClient();
    if (ordersChannel) client.removeChannel(ordersChannel);
    ordersChannel = client.channel('orders-channel');
    const transform = (o: any) => ({
        id: o.id, customer: o.customer, items: o.items, status: o.status, total: o.total, createdAt: new Date(o.created_at),
        orderType: o.order_type, tableId: o.table_id, paymentStatus: o.payment_status, tip: o.tip
    }) as Order;
    ordersChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => onInsert(transform(p.new)))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => onUpdate && onUpdate(transform(p.new)))
        .subscribe();
    return ordersChannel;
};

export const subscribeToMenuUpdates = (onUpdate: () => void) => {
    const client = getClient();
    if (menuChannel) client.removeChannel(menuChannel);
    menuChannel = client.channel('menu-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { cache.products = null; onUpdate(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => { cache.categories = null; onUpdate(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => { cache.promotions = null; onUpdate(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personalizations' }, () => { cache.personalizations = null; onUpdate(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => { cache.settings = null; onUpdate(); })
        .subscribe();
};

export const unsubscribeFromChannel = () => {
    if (ordersChannel) getClient().removeChannel(ordersChannel);
    if (menuChannel) getClient().removeChannel(menuChannel);
};
