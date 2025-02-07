import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Order {
  id: number;
  created_at: string;
}

export function useNewOrders() {
  const [hasNewOrders, setHasNewOrders] = useState(false);

  useEffect(() => {
    const checkForNewOrders = async () => {
      try {
        // Get orders from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: orders, error } = await supabase
          .from('store_orders')
          .select('id, created_at')
          .gt('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Check if any of these orders haven't been viewed
        const newOrders = orders?.filter((order: Order) => {
          const isViewed = localStorage.getItem(`order_${order.id}_viewed`) === 'true';
          return !isViewed;
        });

        setHasNewOrders(Boolean(newOrders?.length));
      } catch (error) {
        console.error('Error checking for new orders:', error);
      }
    };

    // Check immediately
    checkForNewOrders();

    // Set up polling every minute
    const interval = setInterval(checkForNewOrders, 60000);

    // Clean up
    return () => clearInterval(interval);
  }, []);

  return { hasNewOrders };
}

// Default export
export default useNewOrders; 