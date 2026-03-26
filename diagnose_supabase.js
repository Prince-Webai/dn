import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
let url = '', key = '', serviceKey = '';
try {
    const env = fs.readFileSync('.env', 'utf8');
    url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1] || '';
    key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1] || '';
    serviceKey = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || '';
} catch (e) {
    console.error('Failed to read .env file');
}

console.log('Testing with URL:', url);

async function test() {
    if (!url || !key) {
        console.error('URL or Key missing');
        return;
    }

    // 1. Test Anon Key
    const supabase = createClient(url, key);
    console.log('Testing Anon Key access...');
    
    const collections = ['customers', 'jobs', 'service_reports', 'warranty_reports'];
    
    for (const table of collections) {
        try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`- Table [${table}] Error:`, error.message);
            } else {
                console.log(`- Table [${table}] Success: ${count} rows`);
            }
        } catch (e) {
            console.error(`- Table [${table}] Exception:`, e.message);
        }
    }

    if (serviceKey) {
        console.log('\nTesting Service Role Key access...');
        try {
            const admin = createClient(url, serviceKey);
            for (const table of collections) {
                const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
                if (error) {
                    console.error(`- Table [${table}] Admin Error:`, error.message);
                } else {
                    console.log(`- Table [${table}] Admin Success: ${count} rows`);
                }
            }
        } catch (e) {
            console.error('Admin test exception:', e.message);
        }
    }
}

test();
