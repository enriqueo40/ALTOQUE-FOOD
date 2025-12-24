import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table, AppSettings, Order } from '../types';
import { INITIAL_SETTINGS } from '../constants';

// Configuración de Supabase
// Se utilizan las credenciales proporcionadas como fallback para garantizar el funcionamiento inmediato.
const supabaseUrl = process.env.SUPABASE_URL || "https://cnbntnnhxlvkvallumdg.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_A8zcPlJUlYq96qG7tWoANQ_48MtXARr";

let supabase: SupabaseClient | null = null;
let ordersChannel: RealtimeChannel | null = null;
let menuChannel: RealtimeChannel | null = null;

const getClient = (): SupabaseClient => {
    if (supabase) return supabase;
    
    // Si llegara a estar vacío (muy improbable con los fallbacks), inicializamos con strings vacíos para evitar errores de tipo.
    const finalUrl = supabaseUrl || "https://cnbntnnhxlvkvallumdg.supabase.co";
    const finalKey = supabaseAnonKey || "sb_publishable_A8zcPlJUlYq96qG7tWoANQ_48MtXARr";

    supabase = createClient(finalUrl, finalKey);
    return supabase;
};

// --- Settings Functions ---
export const getAppSettings = async (): Promise<AppSettings> => {
    try {
        const { data, error } = await getClient().from('app_settings').select('settings').eq('id', 1).single();
        if (!error && data?.settings && Object.keys(data.settings).length > 0) {
            return { ...INITIAL_SETTINGS, ...data.settings };
        }
    } catch (e) {
        console.error("Error fetching settings:", e);
    }
    return INITIAL_SETTINGS;
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    const { error } = await getClient().from('app_settings').upsert({ id: 1, settings, updated_at: new Date().toISOString() });
    if (error) throw error;
};

// --- Categories & Products ---
export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await getClient().from('categories').select('*').order('created_at');
    if (error) throw error;
    return data || [];
};

export const saveCategory = async (category: any) => {
    const { data, error } = await getClient().from('categories').upsert(category).select().single();
    if (error) throw error;
    return data;
};

export const deleteCategory = async (id: string) => {
    const { error } = await getClient().from('categories').delete().eq('id', id);
    if (error) throw error;
};

export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await getClient().from('products').select('*').order('name');
    if (error) throw error;
    return data || [];
};

export const saveProduct = async (product: any) => {
    const { data, error } = await getClient().from('products').upsert(product).select().single();
    if (error) throw error;
    return data;
};

export const updateProductAvailability = async (id: string, available: boolean) => {
    const { data, error } = await getClient().from('products').update({ available }).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteProduct = async (id: string) => {
    const { error } = await getClient().from('products').delete().eq('id', id);
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

export const savePersonalization = async (personalization: any) => {
    const { options, ...pData } = personalization;
    const { data: saved, error: pError } = await getClient().from('personalizations').upsert({
        id: pData.id,
        name: pData.name,
        label: pData.label,
        allow_repetition: pData.allowRepetition,
        min_selection: pData.minSelection,
        max_selection: pData.maxSelection,
    }).select().single();

    if (pError) throw pError;

    if (saved) {
        await getClient().from('personalization_options').delete().eq('personalization_id', saved.id);
        if (options?.length) {
            await getClient().from('personalization_options').insert(options.map((o: any) => ({ ...o, personalization_id: saved.id, available: true })));
        }
    }
    const all = await getPersonalizations();
    return all.find(p => p.id === saved.id)!;
};

export const deletePersonalization = async (id: string) => {
    const { error } = await getClient().from('personalizations').delete().eq('id', id);
    if (error) throw error;
};

export const updatePersonalizationOptionAvailability = async (optionId: string, available: boolean) => {
    const { data, error } = await getClient().from('personalization_options').update({ available }).eq('id', optionId).select().single();
    if (error) throw error;
    return data;
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

export const savePromotion = async (promotion: any) => {
    const { productIds, ...promoData } = promotion;
    const { data: saved, error: promoError } = await getClient().from('promotions').upsert({
        id: promoData.id,
        name: promoData.name,
        discount_type: promoData.discountType,
        discount_value: promoData.discountValue,
        applies_to: promoData.appliesTo,
        start_date: promoData.startDate || null,
        end_date: promoData.endDate || null,
    }).select().single();

    if (promoError) throw promoError;

    if (saved && productIds?.length) {
        await getClient().from('promotion_products').delete().eq('promotion_id', saved.id);
        await getClient().from('promotion_products').insert(productIds.map((pid: string) => ({ promotion_id: saved.id, product_id: pid })));
    }
    return { ...promotion, id: saved.id };
};

export const deletePromotion = async (promotionId: string) => {
    const { error } = await getClient().from('promotions').delete().eq('id', promotionId);
    if (error) throw error;
};

// --- Zones and Tables ---
export const getZones = async (): Promise<Zone[]> => {
    const { data, error } = await getClient().from('zones').select('*, tables(*)').order('created_at');
    if (error) throw error;
    return (data as Zone[]) || [];
};

export const saveZone = async (zone: any) => {
    const { data, error } = await getClient().from('zones').upsert(zone).select('*, tables(*)').single();
    if (error) throw error;
    return data as Zone;
};

export const deleteZone = async (id: string) => {
    const { error } = await getClient().from('zones').delete().eq('id', id);
    if (error) throw error;
};

export const saveZoneLayout = async (zone: Zone) => {
    const { tables, ...zoneData } = zone;
    await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    const { data: existing } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    const existingIds = (existing || []).map(t => t.id);
    const newIds = tables.map(t => t.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    if (toDelete.length) await getClient().from('tables').delete().in('id', toDelete);
    if (tables.length) {
        await getClient().from('tables').upsert(tables.map(({ created_at, zoneId, ...rest }) => ({ ...rest, zone_id: zone.id })));
    }
};

// --- Orders Real-time ---
export const saveOrder = async (order: any) => {
    const { error } = await getClient().from('orders').insert({
        customer: { ...order.customer, paymentProof: order.paymentProof },
        items: order.items,
        status: order.status,
        total: order.total,
        branch_id: order.branchId || null,
        order_type: order.orderType || null,
        table_id: order.tableId || null,
        general_comments: order.generalComments || order.general_comments || null,
        payment_status: order.paymentStatus || 'pending'
    });
    if (error) throw error;
};

export const getActiveOrders = async (): Promise<Order[]> => {
    const { data, error } = await getClient().from('orders').select('*').neq('status', 'Cancelled').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((o: any) => ({
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

export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => onInsert(p.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => onUpdate?.(p.new))
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
