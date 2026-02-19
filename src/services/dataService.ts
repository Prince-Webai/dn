import { supabase } from '../lib/supabase';
import { Job, Invoice, Customer, InventoryItem } from '../types';

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const dataService = {
    async getJobs(status?: string): Promise<Job[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            let query = supabase
                .from('jobs')
                .select('*, customers(*)')
                .order('date_scheduled', { ascending: false });

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching jobs:', error);
            return [];
        }
    },

    async getCustomers(): Promise<Customer[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    },

    async getInvoices(): Promise<Invoice[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, customers(*)')
                .order('date_issued', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
    },

    async getEngineers(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase.from('engineers').select('*').order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching engineers', error);
            return [];
        }
    },

    async getInventory(): Promise<InventoryItem[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase.from('inventory').select('*');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching inventory", error);
            return [];
        }
    },

    async createJob(job: Partial<Job>): Promise<{ data: Job | null, error: any }> {
        if (!isSupabaseConfigured()) {
            return { data: null, error: 'Supabase not configured' };
        }

        return await supabase.from('jobs').insert([job]).select().single();
    },

    async updateJob(id: string, updates: Partial<Job>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('jobs').update(updates).eq('id', id);
    },

    async deleteJob(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('jobs').delete().eq('id', id);
    },

    async deleteCustomer(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('customers').delete().eq('id', id);
    },

    async updateInvoice(id: string, updates: Partial<Invoice>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('invoices').update(updates).eq('id', id);
    },

    async deleteInvoice(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('invoices').delete().eq('id', id);
    }
};
