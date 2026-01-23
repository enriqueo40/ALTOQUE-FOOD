
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table, AppSettings, Order } from '../types';
import { INITIAL_SETTINGS } from '../constants';


// --- WARNING ---
// The credentials below are hardcoded for demonstration and development purposes as requested.
// In a production environment, you MUST use environment variables (Secrets)
// to keep your keys secure. Exposing keys in client-side code is a
// significant security risk.
const supabaseUrl = "https://cnbntnnhxlvkvallumdg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYm50bm5oeGx2a3ZhbGx1bWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjQ1MjksImV4cCI6MjA3ODY0MDUyOX0.TuovcK2Ao2tb3GM0I2j5n2BpL5DIVLSl-yjdoCHS9pM";


let supabase: SupabaseClient | null = null;
let ordersChannel: RealtimeChannel | null = null;
let menuChannel: RealtimeChannel | null = null;

// --- OBSERVER PATTERN FOR ORDERS ---
type OrderCallback = (payload: any) => void;
const orderInsertListeners: OrderCallback[] = [];
const orderUpdateListeners: OrderCallback[] = [];

const getClient = (): SupabaseClient => {
    if (supabase) return supabase;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase URL or Anon Key is not defined.");
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
};

export const checkDbConnection = async (): Promise<void> => {
    const { error } = await getClient().from('categories').select('id', { count: 'exact', head: true });
    if (error) throw error;
};

export const getAppSettings = async (): Promise<AppSettings> => {
    const { data, error } = await getClient().from('app_settings').select('settings').eq('id', 1).single();
    if (!error && data && data.settings && Object.keys(data.settings).length > 0) {
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
    const { error } = await getClient().from('app_settings').update({ settings, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) throw error;
};

export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await getClient().from('categories').select('*').order('created_at');
    if (error) throw error;
    return data || [];
};

export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'> & { id?: string }): Promise<Category> => {
    const { id, ...categoryData } = category;
    const { data, error } = await getClient().from('categories').upsert({ id, ...categoryData }).select();
    if (error || !data?.[0]) throw error || new Error("Could not save category.");
    return data[0];
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await getClient().from('categories').delete().eq('id', categoryId);
    if (error) throw error;
};

export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await getClient().from('products').select('*').order('name');
    if (error) throw error;
    return data || [];
};

export const saveProduct = async (product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> => {
    const { id, ...productData } = product;
    const { data, error } = await getClient().from('products').upsert({ id, ...productData }).select();
    if (error || !data?.[0]) throw error || new Error("Could not save product.");
    return data[0];
};

export const updateProductAvailability = async (productId: string, available: boolean): Promise<Product> => {
    const { data, error } = await getClient().from('products').update({ available }).eq('id', productId).select().single();
    if (error || !data) throw error || new Error("Could not update availability.");
    return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await getClient().from('products').delete().eq('id', productId);
    if (error) throw error;
};

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

export const updatePersonalizationOptionAvailability = async (optionId: string, available: boolean): Promise<PersonalizationOption> => {
    const { data, error } = await getClient().from('personalization_options').update({ available }).eq('id', optionId).select().single();
    if (error || !data) throw error || new Error("Could not update option availability.");
    return data;
};

export const savePersonalization = async (personalization: Omit<Personalization, 'id' | 'created_at'> & { id?: string }): Promise<Personalization> => {
    const { options, ...personalizationData } = personalization;
    const { data: savedPersonalization, error: pError } = await getClient().from('personalizations').upsert({
        id: personalizationData.id,
        name: personalizationData.name,
        label: personalizationData.label,
        allow_repetition: personalizationData.allowRepetition,
        min_selection: personalizationData.minSelection,
        max_selection: personalizationData.maxSelection,
    }).select().single();
    if (pError || !savedPersonalization) throw pError || new Error("Could not save personalization");
    await getClient().from('personalization_options').delete().eq('personalization_id', savedPersonalization.id);
    if (options && options.length > 0) {
        const optionsToInsert = options.map(opt => ({
            personalization_id: savedPersonalization.id,
            name: opt.name,
            price: opt.price,
            available: true
        }));
        await getClient().from('personalization_options').insert(optionsToInsert);
    }
    const finalData = await getPersonalizations();
    return finalData.find(p => p.id === savedPersonalization.id)!;
};

export const deletePersonalization = async (personalizationId: string): Promise<void> => {
    const { error } = await getClient().from('personalizations').delete().eq('id', personalizationId);
    if (error) throw error;
};

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
    const { data: savedPromo, error: promoError } = await getClient().from('promotions').upsert({
        id: promoData.id,
        name: promoData.name,
        discount_type: promoData.discountType,
        discount_value: promoData.discountValue,
        applies_to: promoData.appliesTo,
        start_date: promoData.startDate || null,
        end_date: promoData.endDate || null,
    }).select().single();
    if (promoError || !savedPromo) throw promoError || new Error("Could not save promotion");
    await getClient().from('promotion_products').delete().eq('promotion_id', savedPromo.id);
    if (productIds && productIds.length > 0) {
        const linksToInsert = productIds.map(pid => ({ promotion_id: savedPromo.id, product_id: pid }));
        await getClient().from('promotion_products').insert(linksToInsert);
    }
    return { ...promotion, id: savedPromo.id };
};

export const deletePromotion = async (promotionId: string): Promise<void> => {
    const { error } = await getClient().from('promotions').delete().eq('id', promotionId);
    if (error) throw error;
};

export const getZones = async (): Promise<Zone[]> => {
    const { data, error } = await getClient().from('zones').select('*, tables(*)').order('created_at');
    if (error) throw error;
    return (data as Zone[]) || [];
};

export const saveZone = async (zone: Pick<Zone, 'name' | 'rows' | 'cols'> & { id?: string }): Promise<Zone> => {
    const { id, ...zoneData } = zone;
    const { data, error } = await getClient().from('zones').upsert({ id, ...zoneData }).select('*, tables(*)').single();
    if (error || !data) throw error || new Error("Could not save zone.");
    return data as Zone;
};

export const deleteZone = async (zoneId: string): Promise<void> => {
    const { error } = await getClient().from('zones').delete().eq('id', zoneId);
    if (error) throw error;
};

export const saveZoneLayout = async (zone: Zone): Promise<void> => {
    const { tables, ...zoneData } = zone;
    await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    const { data: existingTables } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    const existingTableIds = (existingTables || []).map(t => t.id);
    const newTableIds = tables.map(t => t.id);
    const tablesToDelete = existingTableIds.filter(id => !newTableIds.includes(id));
    if (tablesToDelete.length > 0) await getClient().from('tables').delete().in('id', tablesToDelete);
    if (tables.length > 0) {
        const tablesToSave = tables.map(({ created_at, zoneId, ...rest }) => ({ ...rest, zone_id: zone.id }));
        await getClient().from('tables').upsert(tablesToSave);
    }
};

export const saveOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'created_at'>): Promise<Order> => {
    const dbOrderPayload = {
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

    const { data, error } = await getClient().from('orders').insert(dbOrderPayload).select().single();
    if (error || !data) throw new Error(error?.message || 'Database error saving order');
    
    return {
        id: data.id,
        customer: data.customer,
        items: data.items,
        status: data.status,
        total: data.total,
        createdAt: new Date(data.created_at),
        branchId: data.branch_id,
        orderType: data.order_type,
        tableId: data.table_id,
        generalComments: data.general_comments,
        paymentStatus: data.payment_status,
        paymentProof: data.customer?.paymentProof
    };
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
    if (updates.paymentProof) { delete dbUpdates.paymentProof; } 
    const { error } = await getClient().from('orders').update(dbUpdates).eq('id', orderId);
    if (error) throw new Error(error.message || 'Unknown database error');
};

const transformOrderPayload = (payload: any) => ({
    id: payload.id,
    customer: payload.customer,
    items: payload.items,
    status: payload.status,
    total: payload.total,
    createdAt: new Date(payload.created_at),
    branchId: payload.branch_id,
    orderType: payload.order_type,
    tableId: payload.table_id,
    generalComments: payload.general_comments,
    paymentStatus: payload.payment_status,
    paymentProof: payload.customer?.paymentProof
});

export const subscribeToNewOrders = (onInsert: (payload: any) => void, onUpdate?: (payload: any) => void) => {
    const client = getClient();
    orderInsertListeners.push(onInsert);
    if (onUpdate) orderUpdateListeners.push(onUpdate);
    if (!ordersChannel) {
        ordersChannel = client.channel('orders-channel');
        ordersChannel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                 const transformed = transformOrderPayload(payload.new);
                 orderInsertListeners.forEach(l => l(transformed));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                 const transformed = transformOrderPayload(payload.new);
                 orderUpdateListeners.forEach(l => l(transformed));
            })
            .subscribe();
    }
    return () => {
        const iIndex = orderInsertListeners.indexOf(onInsert);
        if (iIndex > -1) orderInsertListeners.splice(iIndex, 1);
        if (onUpdate) {
            const uIndex = orderUpdateListeners.indexOf(onUpdate);
            if (uIndex > -1) orderUpdateListeners.splice(uIndex, 1);
        }
    };
}

export const subscribeToMenuUpdates = (onUpdate: () => void) => {
    const client = getClient();
    if (menuChannel) client.removeChannel(menuChannel).then(() => { menuChannel = null; });
    menuChannel = client.channel('menu-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personalizations' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personalization_options' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, onUpdate)
        .subscribe();
    return menuChannel;
};

export const unsubscribeFromChannel = () => {
    const client = getClient();
    if (ordersChannel) client.removeChannel(ordersChannel).then(() => { ordersChannel = null; });
    if (menuChannel) client.removeChannel(menuChannel).then(() => { menuChannel = null; });
}
