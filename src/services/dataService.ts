import { supabase } from '../lib/supabase';
import { Job, Invoice, Customer, InventoryItem, Settings, JobAttachment } from '../types';

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const dataService = {
    async getJobs(status?: string, engineerName?: string): Promise<Job[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            let query = supabase
                .from('jobs')
                .select('*, customers(*)')
                .order('date_scheduled', { ascending: false });

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            if (engineerName) {
                query = query.eq('engineer_name', engineerName);
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

        // 1. Insert the item
        const result = await supabase.from('job_items').insert([item]).select().single();

        // 2. If it's a part from inventory, decrement stock
        if (!result.error && item.inventory_id && item.type === 'part') {
            await this.adjustStock(item.inventory_id, -(item.quantity || 1));
        }

        return result;
    },

    async deleteJobItem(itemId: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        // 1. Get the item first to know its inventory link and quantity
        const { data: item } = await supabase
            .from('job_items')
            .select('inventory_id, quantity, type')
            .eq('id', itemId)
            .single();

        // 2. Delete the item
        const result = await supabase.from('job_items').delete().eq('id', itemId);

        // 3. If it was a part, restore stock
        if (!result.error && item && item.inventory_id && item.type === 'part') {
            await this.adjustStock(item.inventory_id, item.quantity || 1);
        }

        return result;
    },

    async adjustStock(inventoryId: string, amount: number): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        // Get current stock
        const { data } = await supabase.from('inventory').select('stock_level').eq('id', inventoryId).single();
        if (!data) return { error: 'Item not found' };

        const newStock = (data.stock_level || 0) + amount;

        return await supabase
            .from('inventory')
            .update({ stock_level: Math.max(0, newStock) })
            .eq('id', inventoryId);
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

        let shouldRecalculate = false;
        let customerIdToRecalculate: string | null = null;
        let shouldUpdateServiceDate = false;
        let jobType: string | undefined = undefined;

        if (updates.status === 'completed') {
            const { data: jobInfo } = await supabase
                .from('jobs')
                .select('status, customer_id, service_type')
                .eq('id', id)
                .single();

            if (jobInfo && jobInfo.status !== 'completed') {
                shouldRecalculate = true;
                customerIdToRecalculate = jobInfo.customer_id;
                jobType = updates.service_type || jobInfo.service_type;

                // Typical service types that should trigger a reminder reset
                const serviceTypes = ['Service', 'Routine Maintenance', 'Annual service & test', 'Milking Machine Test'];
                if (jobType && serviceTypes.some(t => jobType?.toLowerCase().includes(t.toLowerCase()))) {
                    shouldUpdateServiceDate = true;
                }
            }
        } else if (updates.status && (updates.status as string) !== 'completed') {
            // Check if it WAS completed
            const { data: jobInfo } = await supabase
                .from('jobs')
                .select('status, customer_id')
                .eq('id', id)
                .single();
            if (jobInfo && (jobInfo.status as string) === 'completed') {
                shouldRecalculate = true;
                customerIdToRecalculate = jobInfo.customer_id;
            }
        }

        const result = await supabase.from('jobs').update(updates).eq('id', id);

        // Trigger balance recalculation
        if (shouldRecalculate && customerIdToRecalculate && !result.error) {
            await this.recalculateCustomerBalance(customerIdToRecalculate);
        }

        // Update last_service_date if applicable
        if (shouldUpdateServiceDate && customerIdToRecalculate && !result.error) {
            const completionDate = updates.date_completed || new Date().toISOString();
            await supabase.from('customers').update({ 
                last_service_date: completionDate 
            }).eq('id', customerIdToRecalculate);
        }

        return result;
    },

    async deleteJob(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        try {
            // 1. Delete job items
            const { error: itemsError } = await supabase.from('job_items').delete().eq('job_id', id);
            if (itemsError) return { error: itemsError };

            // 2. Safely delete associated invoices and their items
            const { data: invoices } = await supabase.from('invoices').select('id').eq('job_id', id);
            if (invoices && invoices.length > 0) {
                const invoiceIds = invoices.map((i: any) => i.id);
                // Invoices might have payments in the future, but right now we just delete invoice_items
                await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
                await supabase.from('invoices').delete().in('id', invoiceIds);
            }

            // 3. Safely delete associated quotes and their items
            const { data: quotes } = await supabase.from('quotes').select('id').eq('job_id', id);
            if (quotes && quotes.length > 0) {
                const quoteIds = quotes.map((q: any) => q.id);
                await supabase.from('quote_items').delete().in('quote_id', quoteIds);
                await supabase.from('quotes').delete().in('id', quoteIds);
            }

            // 4. Delete statements linked to this job
            await supabase.from('statements').delete().eq('job_id', id);

            // 5. Finally, delete the job
            return await supabase.from('jobs').delete().eq('id', id);
        } catch (error) {
            console.error("Failed to delete job safely", error);
            return { error };
        }
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

        // Delete related invoice items first
        await supabase.from('invoice_items').delete().eq('invoice_id', id);

        return await supabase.from('invoices').delete().eq('id', id);
    },

    async getInvoiceItems(invoiceId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', invoiceId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching invoice items:', error);
            return [];
        }
    },

    async addInvoiceItems(items: any[]): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('invoice_items').insert(items).select();
    },

    async deleteStatement(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('statements').delete().eq('id', id);
    },

    async getSettings(): Promise<Settings | null> {
        if (!isSupabaseConfigured()) return null;
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return null;
        }
    },

    async updateSettings(updates: Partial<Settings>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase
            .from('settings')
            .upsert({
                ...updates,
                id: '00000000-0000-0000-0000-000000000000',
                updated_at: new Date().toISOString()
            });
    },

    async recalculateCustomerBalance(customerId: string): Promise<number> {
        if (!isSupabaseConfigured()) return 0;
        try {
            // 1. Sum of all completed jobs
            const { data: completedJobs } = await supabase.from('jobs').select('id').eq('customer_id', customerId).eq('status', 'completed');
            let totalJobValue = 0;
            if (completedJobs && completedJobs.length > 0) {
                const jobIds = completedJobs.map((j: any) => j.id);
                // Chunk queries if too many jobs, but simple array is fine for normal loads
                const { data: jobItems } = await supabase.from('job_items').select('total').in('job_id', jobIds);
                totalJobValue = (jobItems || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
            }

            // 2. Sum of all standalone invoices (where job_id is null)
            const { data: standaloneInvoices } = await supabase.from('invoices').select('total_amount').eq('customer_id', customerId).is('job_id', null);
            const totalStandaloneInvoices = (standaloneInvoices || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

            // 3. Sum of all payments (across all invoices)
            const { data: allInvoices } = await supabase.from('invoices').select('amount_paid').eq('customer_id', customerId);
            const totalPaid = (allInvoices || []).reduce((sum: number, inv: any) => sum + (inv.amount_paid || 0), 0);

            // 4. Calculate proper balance
            const newBalance = totalJobValue + totalStandaloneInvoices - totalPaid;

            await supabase.from('customers').update({ account_balance: newBalance }).eq('id', customerId);
            return newBalance;
        } catch (error) {
            console.error('Error recalculating bounds:', error);
            return 0;
        }
    },

    async getServiceReminders(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            // Fetch customers with service data
            const { data: customers, error } = await supabase
                .from('customers')
                .select('id, name, last_service_date, service_interval_months, machine_model, plant_type')
                .not('last_service_date', 'is', null);

            if (error) throw error;
            if (!customers) return [];

            const now = new Date();
            return customers.map((c: any) => {
                const lastDate = new Date(c.last_service_date);
                const interval = c.service_interval_months || 12;
                const nextDate = new Date(lastDate);
                nextDate.setMonth(nextDate.getMonth() + interval);

                // Calculate days until/since
                const diffTime = nextDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return {
                    ...c,
                    nextDate: nextDate.toISOString().split('T')[0],
                    daysRemaining: diffDays,
                    status: diffDays < 0 ? 'overdue' : diffDays <= 30 ? 'due_soon' : 'upcoming'
                };
            }).filter((r: any) => r.status !== 'upcoming').sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
        } catch (error) {
            console.error('Error fetching service reminders:', error);
            return [];
        }
    },
    async getJobAttachments(jobId: string): Promise<JobAttachment[]> {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase.from('job_attachments').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching job attachments:', error);
            return [];
        }
        return data || [];
    },

    async uploadJobAttachment(jobId: string, file: File, uploadedBy?: string): Promise<{ data: JobAttachment | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };

        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${jobId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { error: storageError } = await supabase.storage
                .from('photos')
                .upload(fileName, file);

            if (storageError) throw storageError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);

            // 3. Save to Metadata Table
            const { data, error } = await supabase.from('job_attachments').insert({
                job_id: jobId,
                file_url: publicUrl,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: uploadedBy
            }).select().single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error uploading job attachment:', error);
            return { data: null, error };
        }
    },

    async deleteJobAttachment(attachmentId: string, filePath: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        try {
            // 1. Delete from Storage (path needs to be extracted from URL or stored separately)
            // For now, we'll just try to delete from the metadata table
            // In a real app, you'd extract the storage path
            const { error: dbError } = await supabase.from('job_attachments').delete().eq('id', attachmentId);
            if (dbError) throw dbError;

            // Optional: Delete from storage if you have the path
            const pathMatch = filePath.match(/photos\/(.*)/);
            if (pathMatch && pathMatch[1]) {
                await supabase.storage.from('photos').remove([pathMatch[1]]);
            }

            return { error: null };
        } catch (error) {
            console.error('Error deleting job attachment:', error);
            return { error };
        }
    }
};
