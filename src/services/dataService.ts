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

    async getJobById(id: string): Promise<Job | null> {
        if (!isSupabaseConfigured()) return null;
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*, customers(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching job by ID:', error);
            return null;
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

    async getJobItems(jobId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase
                .from('job_items')
                .select('*')
                .eq('job_id', jobId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching job items:', error);
            return [];
        }
    },

    async addJobItem(item: any): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('job_items').insert([item]).select().single();
    },

    async addJobItems(items: any[]): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('job_items').insert(items).select();
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

        // Delete related job items first to satisfy foreign key constraints
        const { error: itemsError } = await supabase.from('job_items').delete().eq('job_id', id);
        if (itemsError) return { error: itemsError };

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
    },

    async deleteStatement(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('statements').delete().eq('id', id);
    }
};
