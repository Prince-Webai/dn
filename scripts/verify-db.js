
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually since we are running in node
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvValue = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const supabaseKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying Supabase connection...');

    // Check Customers Table
    const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('count', { count: 'exact', head: true });

    if (customerError) {
        console.error('❌ Error connecting to customers table:', customerError.message);
        if (customerError.code === '42P01') {
            console.error('   Hint: The table "customers" does not exist. Please run the SQL from schema.sql in your Supabase SQL Editor.');
        }
    } else {
        console.log('✅ Connected to "customers" table.');
    }

    // Check Inventory Table
    const { error: inventoryError } = await supabase
        .from('inventory')
        .select('count', { count: 'exact', head: true });

    if (inventoryError) {
        console.error('❌ Error connecting to inventory table:', inventoryError.message);
    } else {
        console.log('✅ Connected to "inventory" table.');
    }

    // Check Invoices Table
    const { error: invoiceError } = await supabase
        .from('invoices')
        .select('count', { count: 'exact', head: true });

    if (invoiceError) {
        console.error('❌ Error connecting to invoices table:', invoiceError.message);
    } else {
        console.log('✅ Connected to "invoices" table.');
    }
}

verify();
