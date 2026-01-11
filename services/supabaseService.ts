

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Category, Personalization, Promotion, PersonalizationOption, Zone, Table } from '../types';

// --- WARNING ---
// The credentials below are hardcoded for demonstration and development purposes as requested.
// In a production environment, you MUST use environment variables (Secrets)
// to keep your keys secure. Exposing keys in client-side code is a
// significant security risk.
const supabaseUrl = "https://cnbntnnhxlvkvallumdg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYm50bm5oeGx2a3ZhbGx1bWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjQ1MjksImV4cCI6MjA3ODY0MDUyOX0.TuovcK2Ao2tb3GM0I2j5n2BpL5DIVLSl-yjdoCHS9pM";


let supabase: SupabaseClient | null = null;

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
// NOTE: This function is no longer used by App.tsx to verify the connection
// before rendering, as the setup flow has been removed. It remains here
// in case it's needed for other diagnostic purposes.
export const checkDbConnection = async (): Promise<void> => {
    // This function performs a lightweight query to check if a core table exists.
    // If it fails, the app knows the database schema has not been set up.
    // We use `{ head: true }` to only check for existence without returning data.
    const { error } = await getClient().from('categories').select('id', { count: 'exact', head: true });

    if (error) {
        // This error will be caught by the App component, which will then show the SetupView.
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

    // Handle product links
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

    // Supabase returns tables as a nested array. We just need to ensure the type matches.
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
    
    // 1. Update the zone's properties (name, rows, cols)
    const { error: zoneError } = await getClient().from('zones').update({ name: zoneData.name, rows: zoneData.rows, cols: zoneData.cols }).eq('id', zoneData.id);
    if (zoneError) {
        console.error("Error updating zone properties:", zoneError);
        throw zoneError;
    }
    
    // 2. Get existing tables for this zone from the DB
    const { data: existingTables, error: fetchError } = await getClient().from('tables').select('id').eq('zone_id', zone.id);
    if (fetchError) throw fetchError;
    
    const existingTableIds = existingTables.map(t => t.id);
    const newTableIds = tables.map(t => t.id);

    // 3. Determine which tables to delete
    const tablesToDelete = existingTableIds.filter(id => !newTableIds.includes(id));
    if (tablesToDelete.length > 0) {
        const { error: deleteError } = await getClient().from('tables').delete().in('id', tablesToDelete);
        if (deleteError) {
            console.error("Error deleting old tables:", deleteError);
            throw deleteError;
        }
    }

    // 4. Upsert the current set of tables
    if (tables.length > 0) {
         const tablesToSave = tables.map(({ created_at, zoneId, ...rest }) => ({
            ...rest,
            zone_id: zone.id // Ensure zone_id is set and the original zoneId is removed
        }));
        const { error: upsertError } = await getClient().from('tables').upsert(tablesToSave);
        if (upsertError) {
            console.error("Error upserting tables:", upsertError);
            console.error("Data sent:", JSON.stringify(tablesToSave, null, 2));
            throw upsertError;
        }
    }
};