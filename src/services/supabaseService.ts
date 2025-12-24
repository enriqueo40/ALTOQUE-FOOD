
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table, AppSettings, Order } from '../types';
import { INITIAL_SETTINGS } from '../constants';

// Configuración de Supabase usando variables de entorno inyectadas por Vite.
// Estos valores se configuran en el panel de Netlify.
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient | null = null;
let ordersChannel: RealtimeChannel | null = null;
let menuChannel: RealtimeChannel | null = null;

const getClient = (): SupabaseClient => {
    if (supabase) return supabase;
    
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase credentials missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.");
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
};

// --- Settings Functions ---
export const getAppSettings = async (): Promise<AppSettings> => {
    const { data, error } = await getClient()
        .from('app_settings')
        .select('settings')
        .eq('id', 1)
        .single();

    if (!error && data?.settings && Object.keys(data.settings).length > 0) {
        return { ...JSON.parse(JSON.stringify(INITIAL_SETTINGS)), ...data.settings };
    }

    try {
        const settingsToSave = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
        await saveAppSettings(settingsToSave);
        return settingsToSave;
    } catch (saveError) {
        return JSON.parse(JSON.stringify(INITIAL_SETTINGS));
    }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    const { error } = await getClient()
        .from('app_settings')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('id', 1);
    if (error) throw error;
};

// --- Categories Functions ---
export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await getClient().from('categories').select('*').order('created_at');
    if (error) throw error;
    return data || [];
};

export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'> & { id?: string }): Promise<Category> => {
    const { id, ...categoryData } = category;
    const { data, error } = await getClient().from('categories').upsert({ id, ...categoryData }).select().single();
    if (error) throw error;
    return data;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await getClient().from('categories').delete().eq('id', categoryId);
    if (error) throw error;
};

// --- Products Functions ---
export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await getClient().from('products').select('*').order('name');
    if (error) throw error;
    return data || [];
};

export const saveProduct = async (product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> => {
    const { id, ...productData } = product;
    const { data, error } = await getClient().from('products').upsert({ id, ...productData }).select().single();
    if (error) throw error;
    return data;
};

export const updateProductAvailability = async (productId: string, available: boolean): Promise<Product> => {
    const { data, error } = await getClient().from('products').update({ available }).eq('id', productId).select().single();
    if (error) throw error;
    return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await getClient().from('products').delete().eq('id', productId);
    if (error) throw error;
};

// --- Personalizations ---
export const getPersonalizations = async (): Promise<Personalization[]> => {
    const { data, error } = await getClient().from('personalizations').select('*, options:personalization_options(*)');
    if (error) throw error;
    return (data?.map(p => ({
        ...p,
        allowRepetition: p.allow_repetition,
        minSelection: p.min_selection,
        maxSelection: p.max_selection
    })) || []) as Personalization[];
};

export const savePersonalization = async (personalization: Omit<Personalization, 'id' | 'created_at'> & { id?: string }): Promise<Personalization> => {
    const { options, ...personalizationData } = personalization;
    const { data: saved, error } = await getClient()
        .from('personalizations')
        .upsert({
            id: personalizationData.id,
            name: personalizationData.name,
            label: personalizationData.label,
            allow_repetition: personalizationData.allowRepetition,
            min_selection: personalizationData.minSelection,
            max_selection: personalizationData.maxSelection,
        })
        .select()
        .single();
    if (error) throw error;

    await getClient().from('personalization_options').delete().eq('personalization_id', saved.id);
    if (options && options.length > 0) {
        const toInsert = options.map(opt => ({ personalization_id: saved.id, name: opt.name, price: opt.price, available: true }));
        await getClient().from('personalization_options').insert(toInsert);
    }
    const all = await getPersonalizations();
    return all.find(p => p.id === saved.id)!;
};

export const deletePersonalization = async (id: string): Promise<void> => {
    const { error } = await getClient().from('personalizations').delete().eq('id', id);
    if (error) throw error;
};

// --- Promotions ---
export const getPromotions = async (): Promise<Promotion[]> => {
    const { data, error } = await getClient().from('promotions').select('*, promotion_products(product_id)');
    if (error) throw error;
    return data?.map(promo => ({
        ...promo,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        appliesTo: promo.applies_to,
        productIds: promo.promotion_products.map((p: any) => p.product_id),
        startDate: promo.start_date,
        endDate: promo.end_date,
    })) || [];
};

export const savePromotion = async (promotion: Omit<Promotion, 'id' | 'created_at'> & { id?: string }): Promise<Promotion> => {
    const { productIds, ...promoData } = promotion;
    const { data: saved, error } = await getClient()
        .from('promotions')
        .upsert({
            id: promoData.id,
            name: promoData.name,
            discount_type: promoData.discountType,
            discount_value: promoData.discountValue,
            applies_to: promoData.appliesTo,
            start_date: promoData.startDate || null,
            end_date: promoData.endDate || null,
        })
        .select()
        .single();
    if (error) throw error;

    await getClient().from('promotion_products').delete().eq('promotion_id', saved.id);
    if (productIds && productIds.length > 0) {
        const links = productIds.map(pid => ({ promotion_id: saved.id, product_id: pid }));
        await getClient().from('promotion_products').insert(links);
    }
    return { ...promotion, id: saved.id };
};

// --- Zones and Tables ---
export const getZones = async (): Promise<Zone[]> => {
    const { data, error } = await getClient().from('zones').select('*, tables(*)').order('created_at');
    if (error) throw error;
    return (data as Zone[]) || [];
};

export const saveZone = async (zone: Pick<Zone, 'name' | 'rows' | 'cols'> & { id?: string }): Promise<Zone> => {
    const { id, ...zoneData } = zone;
    const { data, error } = await getClient().from('zones').upsert({ id, ...zoneData }).select('*, tables(*)').single();
    if (error) throw error;
    return data as Zone;
};

export const deleteZone = async (id: string): Promise<void> => {
    const { error } = await getClient().from('zones').delete().eq('id', id);
    if (error) throw error;
};

export const saveZoneLayout = async (zone: Zone): Promise<void> => {
    const { tables, ...zoneData } = zone;
    await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    const { data: existing } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    const existingIds = (existing || []).map(t => t.id);
    const newIds = tables.map(t => t.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    if (toDelete.length > 0) await getClient().from('tables').delete().in('id', toDelete);
    if (tables.length > 0) {
        const toSave = tables.map(({ created_at, zoneId, ...rest }) => ({ ...rest, zone_id: zone.id }));
        await getClient().from('tables').upsert(toSave);
    }
};

// --- Orders ---
export const saveOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'created_at'>): Promise<void> => {
    const payload = {
        customer: { ...order.customer, paymentProof: order.paymentProof },
        items: order.items,
        status: order.status,
        total: order.total,
        branch_id: order.branchId || null,
        order_type: order.orderType || null,
        table_id: order.tableId || null,
        general_comments: order.generalComments || null,
        payment_status: order.paymentStatus || 'pending'
    };
    const { error } = await getClient().from('orders').insert(payload);
    if (error) throw error;
};

export const getActiveOrders = async (): Promise<Order[]> => {
    const { data, error } = await getClient().from('orders').select('*').neq('status', 'Cancelled').order('created_at', { ascending: false });
    if (error) return [];
    return data.map((o: any) => ({
        id: o.id,
        customer: o.customer, 
        items: o.items,
        status: o.status,
        total: o.total,
        createdAt: new Date(o.created_at),
        branchId: o.branch_id,
        orderType: o.order_type,
        tableId: o.table_id,
        generalComments: o.general_comments,
        paymentStatus: o.payment_status,
        paymentProof: o.customer?.paymentProof 
    })) as Order[];
};

export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
    const dbUpdates: any = { ...updates };
    if (updates.branchId) { dbUpdates.branch_id = updates.branchId; delete dbUpdates.branchId; }
    if (updates.orderType) { dbUpdates.order_type = updates.orderType; delete dbUpdates.orderType; }
    if (updates.tableId) { dbUpdates.table_id = updates.tableId; delete dbUpdates.tableId; }
    if (updates.generalComments) { dbUpdates.general_comments = updates.generalComments; delete dbUpdates.generalComments; }
    if (updates.paymentStatus) { dbUpdates.payment_status = updates.paymentStatus; delete dbUpdates.paymentStatus; }
    const { error } = await getClient().from('orders').update(dbUpdates).eq('id', orderId);
    if (error) throw error;
};

export const subscribeToNewOrders = (onInsert: (payload: any) => void, onUpdate?: (payload: any) => void) => {
    const client = getClient();
    if (ordersChannel) client.removeChannel(ordersChannel);
    ordersChannel = client.channel('orders-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
             const o = payload.new;
             onInsert({
                id: o.id, customer: o.customer, items: o.items, status: o.status, total: o.total,
                createdAt: new Date(o.created_at), branchId: o.branch_id, orderType: o.order_type,
                tableId: o.table_id, generalComments: o.general_comments, paymentStatus: o.payment_status,
                paymentProof: o.customer?.paymentProof
             });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
            const o = payload.new;
            if (onUpdate) onUpdate({
                id: o.id, customer: o.customer, items: o.items, status: o.status, total: o.total,
                createdAt: new Date(o.created_at), branchId: o.branch_id, orderType: o.order_type,
                tableId: o.table_id, generalComments: o.general_comments, paymentStatus: o.payment_status,
                paymentProof: o.customer?.paymentProof
            });
        })
        .subscribe();
    return ordersChannel;
};

export const subscribeToMenuUpdates = (onUpdate: () => void) => {
    const client = getClient();
    if (menuChannel) client.removeChannel(menuChannel);
    menuChannel = client.channel('menu-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, onUpdate)
        .subscribe();
    return menuChannel;
};

export const unsubscribeFromChannel = () => {
    const client = getClient();
    if (ordersChannel) client.removeChannel(ordersChannel).then(() => ordersChannel = null);
    if (menuChannel) client.removeChannel(menuChannel).then(() => menuChannel = null);
};
