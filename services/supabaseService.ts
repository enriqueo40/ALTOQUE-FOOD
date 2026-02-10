
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

// Helper function to get the client or throw an error.
// This uses a singleton pattern to create the client only once.
const getClient = (): SupabaseClient => {
    if (supabase) {
        return supabase;
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase URL or Anon Key is not defined in services/supabaseService.ts.");
    }

    // Initialize the client and store it.
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
};

// --- Connection Check ---
export const checkDbConnection = async (): Promise<void> => {
    const { error } = await getClient().from('categories').select('id', { count: 'exact', head: true });
    if (error) {
        throw error;
    }
};

// --- Settings Functions ---
export const getAppSettings = async (): Promise<AppSettings> => {
    const { data, error } = await getClient()
        .from('app_settings')
        .select('settings')
        .eq('id', 1)
        .single();

    if (!error && data && data.settings && Object.keys(data.settings).length > 0) {
        const mergedSettings = { ...JSON.parse(JSON.stringify(INITIAL_SETTINGS)), ...data.settings };
        return mergedSettings;
    }

    if (error && error.code !== 'PGRST116') { 
         console.error("An unexpected error occurred while fetching app settings:", error);
    }
    
    console.warn("App settings are missing or empty. Initializing defaults.");

    try {
        const settingsToSave = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
        await saveAppSettings(settingsToSave);
        return settingsToSave;
    } catch (saveError) {
        console.error("Fatal: Could not initialize app settings.", saveError);
        return JSON.parse(JSON.stringify(INITIAL_SETTINGS));
    }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    const { error } = await getClient()
        .from('app_settings')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('id', 1);

    if (error) {
        console.error("Error saving app settings:", error);
        throw error;
    }
};


// --- Categories Functions ---
export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await getClient().from('categories').select('*').order('created_at');
    if (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
    return data || [];
};

export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'> & { id?: string }): Promise<Category> => {
    const { id, ...categoryData } = category;
    const { data, error } = await getClient()
        .from('categories')
        .upsert({ id, ...categoryData })
        .select();

    if (error) {
        console.error("Error saving category:", error);
        throw error;
    }
    if (!data?.[0]) {
        throw new Error("Could not save category.");
    }
    return data[0];
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await getClient().from('categories').delete().eq('id', categoryId);
    if (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};


// --- Products Functions ---
export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await getClient().from('products').select('*').order('name');
    if (error) {
        console.error("Error fetching products:", error);
        throw error;
    }
    return data || [];
};

export const saveProduct = async (product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> => {
    const { id, ...productData } = product;
    const { data, error } = await getClient()
        .from('products')
        .upsert({ id, ...productData })
        .select();

    if (error) {
        console.error("Error saving product:", error);
        throw error;
    }
     if (!data?.[0]) {
        throw new Error("Could not save product.");
    }
    return data[0];
};

export const updateProductAvailability = async (productId: string, available: boolean): Promise<Product> => {
    const { data, error } = await getClient()
        .from('products')
        .update({ available })
        .eq('id', productId)
        .select()
        .single();

    if (error) {
        console.error("Error updating product availability:", error);
        throw error;
    }
    if (!data) {
        throw new Error("Could not update product availability.");
    }
    return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await getClient().from('products').delete().eq('id', productId);
    if (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
};

// --- Personalizations Functions ---
export const getPersonalizations = async (): Promise<Personalization[]> => {
    const { data, error } = await getClient()
        .from('personalizations')
        .select('*, options:personalization_options(*)');
        
    if (error) {
        console.error("Error fetching personalizations:", error);
        throw error;
    }

    return (data?.map(p => {
        const { allow_repetition, min_selection, max_selection, ...rest } = p;
        return {
            ...rest,
            allowRepetition: allow_repetition,
            minSelection: min_selection,
            maxSelection: max_selection
        };
    }) || []) as Personalization[];
};

export const updatePersonalizationOptionAvailability = async (optionId: string, available: boolean): Promise<PersonalizationOption> => {
    const { data, error } = await getClient()
        .from('personalization_options')
        .update({ available })
        .eq('id', optionId)
        .select()
        .single();

    if (error) {
        console.error("Error updating personalization option availability:", error);
        throw error;
    }
    if (!data) {
        throw new Error("Could not update option availability.");
    }
    return data;
};

export const savePersonalization = async (personalization: Omit<Personalization, 'id' | 'created_at'> & { id?: string }): Promise<Personalization> => {
    const { options, ...personalizationData } = personalization;
    
    const { data: savedPersonalization, error: pError } = await getClient()
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
    
    if (pError) throw pError;
    if (!savedPersonalization) throw new Error("Could not save personalization");

    // Clear old options
    const { error: deleteError } = await getClient().from('personalization_options').delete().eq('personalization_id', savedPersonalization.id);
    if (deleteError) throw deleteError;

    // Insert new options
    if (options && options.length > 0) {
        const optionsToInsert = options.map(opt => ({
            personalization_id: savedPersonalization.id,
            name: opt.name,
            price: opt.price,
            available: true // Default to true on save
        }));
        const { error: optionsError } = await getClient().from('personalization_options').insert(optionsToInsert);
        if (optionsError) throw optionsError;
    }

    const finalData = await getPersonalizations();
    return finalData.find(p => p.id === savedPersonalization.id)!;
};

export const deletePersonalization = async (personalizationId: string): Promise<void> => {
    const { error } = await getClient().from('personalizations').delete().eq('id', personalizationId);
    if (error) throw error;
};

// --- Promotions Functions ---
export const getPromotions = async (): Promise<Promotion[]> => {
    const { data, error } = await getClient().from('promotions').select('*, promotion_products(product_id)');
    if (error) throw error;
    
    return data?.map(promo => {
        const { discount_type, discount_value, applies_to, start_date, end_date, promotion_products, ...rest } = promo;
        return {
            ...rest,
            discountType: discount_type,
            discountValue: discount_value,
            appliesTo: applies_to,
            productIds: promotion_products.map((p: any) => p.product_id),
            startDate: start_date,
            endDate: end_date,
        };
    }) || [];
};

export const savePromotion = async (promotion: Omit<Promotion, 'id' | 'created_at'> & { id?: string }): Promise<Promotion> => {
    const { productIds, ...promoData } = promotion;

    const { data: savedPromo, error: promoError } = await getClient()
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
    
    if (promoError) throw promoError;
    if (!savedPromo) throw new Error("Could not save promotion");

    const { error: deleteError } = await getClient().from('promotion_products').delete().eq('promotion_id', savedPromo.id);
    if (deleteError) throw deleteError;

    if (productIds && productIds.length > 0) {
        const linksToInsert = productIds.map(pid => ({ promotion_id: savedPromo.id, product_id: pid }));
        const { error: linkError } = await getClient().from('promotion_products').insert(linksToInsert);
        if (linkError) throw linkError;
    }

    return { ...promotion, id: savedPromo.id };
};

export const deletePromotion = async (promotionId: string): Promise<void> => {
    const { error } = await getClient().from('promotions').delete().eq('id', promotionId);
    if (error) throw error;
};

// --- Zones and Tables Functions ---

export const getZones = async (): Promise<Zone[]> => {
    const { data, error } = await getClient()
        .from('zones')
        .select('*, tables(*)')
        .order('created_at');

    if (error) {
        console.error("Error fetching zones:", error);
        throw error;
    }
    return (data as Zone[]) || [];
};

export const saveZone = async (zone: Pick<Zone, 'name' | 'rows' | 'cols'> & { id?: string }): Promise<Zone> => {
    const { id, ...zoneData } = zone;
    const { data, error } = await getClient()
        .from('zones')
        .upsert({ id, ...zoneData })
        .select('*, tables(*)')
        .single();

    if (error) {
        console.error("Error saving zone:", error);
        throw error;
    }
    if (!data) throw new Error("Could not save zone.");
    return data as Zone;
};

export const deleteZone = async (zoneId: string): Promise<void> => {
    const { error } = await getClient().from('zones').delete().eq('id', zoneId);
    if (error) {
        console.error("Error deleting zone:", error);
        throw error;
    }
};

export const saveZoneLayout = async (zone: Zone): Promise<void> => {
    const { tables, ...zoneData } = zone;
    
    const { error: zoneError } = await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    if (zoneError) throw zoneError;
    
    const { data: existingTables, error: fetchError } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    if (fetchError) throw fetchError;
    
    const existingTableIds = existingTables.map(t => t.id);
    const newTableIds = tables.map(t => t.id);

    const tablesToDelete = existingTableIds.filter(id => !newTableIds.includes(id));
    if (tablesToDelete.length > 0) {
        const { error: deleteError } = await getClient().from('tables').delete().in('id', tablesToDelete);
        if (deleteError) throw deleteError;
    }

    if (tables.length > 0) {
         const tablesToSave = tables.map(({ created_at, zoneId, ...rest }) => ({
            ...rest,
            zone_id: zone.id 
        }));
        const { error: upsertError } = await getClient().from('tables').upsert(tablesToSave);
        if (upsertError) throw upsertError;
    }
};

// --- Orders Functions (Real-time) ---
export const saveOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'created_at'>): Promise<void> => {
    const dbOrderPayload = {
        customer: {
            ...order.customer,
// FIX: Removed incorrect and redundant access to `order.paymentProof`. 
// The `paymentProof` is correctly located within `order.customer` which is already spread.
        },
        items: order.items,
        status: order.status,
        total: order.total,
        branch_id: order.branchId || null,       
        order_type: order.orderType || null,      
        table_id: order.tableId || null,          
        general_comments: order.generalComments || null, 
        payment_status: order.paymentStatus || 'pending',
        tip: order.tip || 0
    };

    const { error } = await getClient().from('orders').insert(dbOrderPayload);

    if (error) {
        console.error('Error saving order:', error);
        throw new Error(error.message || 'Database error saving order');
    }
};

export const getActiveOrders = async (): Promise<Order[]> => {
    const { data, error } = await getClient()
        .from('orders')
        .select('*')
        .neq('status', 'Cancelled') 
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
    
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
// FIX: Removed `paymentProof` from the top-level Order object to maintain type consistency.
// It is correctly nested inside the `customer` object.
        tip: o.tip
    })) as Order[];
};

export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
    const dbUpdates: any = { ...updates };
    if (updates.branchId) { dbUpdates.branch_id = updates.branchId; delete dbUpdates.branchId; }
    if (updates.orderType) { dbUpdates.order_type = updates.orderType; delete dbUpdates.orderType; }
    if (updates.tableId) { dbUpdates.table_id = updates.tableId; delete dbUpdates.tableId; }
    if (updates.generalComments) { dbUpdates.general_comments = updates.generalComments; delete dbUpdates.generalComments; }
    if (updates.paymentStatus) { dbUpdates.payment_status = updates.paymentStatus; delete dbUpdates.paymentStatus; }
// FIX: Removed invalid check for `updates.paymentProof` as it doesn't exist on the `Order` type.
    
    const { error } = await getClient().from('orders').update(dbUpdates).eq('id', orderId);
    if (error) {
        console.error('Error updating order:', error);
        throw new Error(error.message || 'Unknown database error');
    }
};

// Real-time Subscription for Admin (Orders)
export const subscribeToNewOrders = (
    onInsert: (payload: any) => void, 
    onUpdate?: (payload: any) => void
) => {
    const client = getClient();
    if (ordersChannel) {
        client.removeChannel(ordersChannel).then(() => { ordersChannel = null; });
    }
    
    ordersChannel = client.channel('orders-channel');
    const transform = (order: any) => ({
        id: order.id,
        customer: order.customer,
        items: order.items,
        status: order.status,
        total: order.total,
        createdAt: new Date(order.created_at),
        branchId: order.branch_id,
        orderType: order.order_type,
        tableId: order.table_id,
        generalComments: order.general_comments,
        paymentStatus: order.payment_status,
        paymentProof: order.customer?.paymentProof,
        tip: order.tip
    });
    
    ordersChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
             onInsert(transform(payload.new));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
            if (onUpdate) {
                onUpdate(transform(payload.new));
            }
        })
        .subscribe();
    
    return ordersChannel;
}

// Real-time Subscription for Menu (Customers)
export const subscribeToMenuUpdates = (onUpdate: () => void) => {
    const client = getClient();
    if (menuChannel) {
        client.removeChannel(menuChannel).then(() => { menuChannel = null; });
    }

    menuChannel = client.channel('menu-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personalizations' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personalization_options' }, onUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, onUpdate)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime subscription active for Menu Updates.');
            }
        });
    
    return menuChannel;
};

export const unsubscribeFromChannel = () => {
    const client = getClient();
    if (ordersChannel) {
        client.removeChannel(ordersChannel).then(() => { ordersChannel = null; });
    }
    if (menuChannel) {
        client.removeChannel(menuChannel).then(() => { menuChannel = null; });
    }
}
