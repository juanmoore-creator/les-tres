const SUPABASE_URL = 'https://dyvixfpupvnlsyzzlipn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dml4ZnB1cHZubHN5enpsaXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MzYwMDUsImV4cCI6MjA4MzQxMjAwNX0.b31giJWjEDFcKfd5RAHCr8TkrM7EnJBhrJdebaWFKmM';

// Assuming supabase is loaded via CDN in the HTML file
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
