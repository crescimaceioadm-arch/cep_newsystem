import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtyovchqqnbwdtnbtfic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eW92Y2hxcW5id2R0bmJ0ZmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTQ0MTksImV4cCI6MjA4MTI3MDQxOX0.4kIPNtEDun0F4EDHEHBt7Bn4Fcl1G44HxaNLNuaSAuQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
