import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if user is authenticated
export const isAuthenticated = async () => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

// Since RLS is turned off, we don't need to authenticate
// This function is kept for compatibility but will just return true
export const signInAnonymously = async () => {
  // With RLS off, we don't need to authenticate
  console.log('Authentication skipped - RLS is turned off');
  return true;
};

// Ensure authentication before performing database operations
// With RLS off, this will just proceed without authentication
export const ensureAuthenticated = async () => {
  // When RLS is off, we can skip authentication
  return true;
}; 