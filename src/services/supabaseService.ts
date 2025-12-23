
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table, AppSettings, Order } from '../types';
import { INITIAL_SETTINGS } from '../constants';

// --- WARNING ---
// Credentials below are used for development purposes as requested.
const supabaseUrl = "https://cnbntnnhxlvkvallumdg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYm50bm5oeGx2a3ZhbGx1bWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjQ1MjksImV4cCI6MjA3ODY0MDUyOX0.TuovcK2Ao2tb3GM0I2j5n2BpL5DIVLSl-yjdoCHS9pM";

let supabase: SupabaseClient | null = null;
let ordersChannel: RealtimeChannel | null = null;
let menuChannel: RealtimeChannel | null = null;

const getClient = (): SupabaseClient => {
    if (supabase) return supabase;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase URL or Anon Key is not defined.");
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
    const { data, error } = await getClient()
        .from('categories')
        .select('id, name, created_at')
        .order('created_at');
    if (error) throw error;
    return data || [];
};

export const saveCategory = async (category: Omit<Category, 'id' | 'created_at'> & { id?: string }): Promise<Category> => {
    const { id, ...categoryData } = category;
    const { data, error } = await getClient()
        .from('categories')
        .upsert({ id, ...categoryData })
        .select();
    if (error) throw error;
    if (!data?.[0]) throw new Error("Could not save category.");
    return data[0];
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await getClient().from('categories').delete().eq('id', categoryId);
    if (error) throw error;
};

// --- Products Functions ---
// Fix: Updated getProducts to fetch personalizationIds from join table
export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await getClient()
        .from('products')
        .select('*, product_personalizations(personalization_id)')
        .order('name');
    if (error) throw error;
    
    return (data || []).map((p: any) => ({
        ...p,
        personalizationIds: p.product_personalizations?.map((pp: any) => pp.personalization_id) || []
    })) as Product[];
};

// Fix: Added missing updateProductPersonalizationLinks to handle the join table
export const updateProductPersonalizationLinks = async (productId: string, personalizationIds: string[]): Promise<void> => {
    const client = getClient();
    // Remove existing links
    await client.from('product_personalizations').delete().eq('product_id', productId);

    // Insert new links
    if (personalizationIds.length > 0) {
        const links = personalizationIds.map(id => ({
            product_id: productId,
            personalization_id: id
        }));
        const { error } = await client.from('product_personalizations').insert(links);
        if (error) throw error;
    }
};

export const saveProduct = async (product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> => {
    const { id, ...productData } = product;
    // Exclude personalizationIds from direct table update
    const { personalizationIds, ...dataToUpsert } = productData as any;
    const { data, error } = await getClient()
        .from('products')
        .upsert({ id, ...dataToUpsert })
        .select();
    if (error) throw error;
    if (!data?.[0]) throw new Error("Could not save product.");
    return data[0];
};

export const updateProductAvailability = async (productId: string, available: boolean): Promise<Product> => {
    const { data, error } = await getClient()
        .from('products')
        .update({ available })
        .eq('id', productId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await getClient().from('products').delete().eq('id', productId);
    if (error) throw error;
};

// --- Personalizations Functions ---
export const getPersonalizations = async (): Promise<Personalization[]> => {
    const { data, error } = await getClient()
        .from('personalizations')
        .select('*, options:personalization_options(*)');
    if (error) throw error;
    return (data?.map(p => ({
        ...p,
        allowRepetition: p.allow_repetition,
        minSelection: p.min_selection,
        maxSelection: p.max_selection
    })) || []) as Personalization[];
};

export const updatePersonalizationOptionAvailability = async (optionId: string, available: boolean): Promise<PersonalizationOption> => {
    const { data, error } = await getClient()
        .from('personalization_options')
        .update({ available })
        .eq('id', optionId)
        .select()
        .single();
    if (error) throw error;
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
    const { error: deleteError } = await getClient().from('personalization_options').delete().eq('personalization_id', savedPersonalization.id);
    if (deleteError) throw deleteError;
    if (options && options.length > 0) {
        const optionsToInsert = options.map(opt => ({
            personalization_id: savedPersonalization.id,
            name: opt.name,
            price: opt.price,
            available: true
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

export const deleteZone = async (zoneId: string): Promise<void> => {
    const { error } = await getClient().from('zones').delete().eq('id', zoneId);
    if (error) throw error;
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

// --- Orders Functions ---
export const saveOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'created_at'>): Promise<void> => {
    const dbOrder