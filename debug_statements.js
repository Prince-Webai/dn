
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yahacllvgudcngeowsap.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaGFjbGx2Z3VkY25nZW93c2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTA3NzQsImV4cCI6MjA4NzAyNjc3NH0.H-vgqcVbou9RVCiH250YMCXYCEh-K9RtzKYwywXxinQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugStatements() {
    console.log('Checking statements table...')
    const { data, count, error } = await supabase
        .from('statements')
        .select('*', { count: 'exact' })

    if (error) {
        console.error('Error fetching statements:', error)
    } else {
        console.log('Total statements found:', data.length)
    }

    // INSERT TEST
    console.log('Attempting to insert dummy statement...')
    const { data: insertData, error: insertError } = await supabase
        .from('statements')
        .insert([{
            statement_number: 'TEST-' + Date.now(),
            total_amount: 100,
            date_generated: new Date().toISOString()
        }])
        .select()

    if (insertError) {
        console.error('Insert Error:', insertError)
    } else {
        console.log('Insert Success:', insertData)
    }
}

debugStatements()
