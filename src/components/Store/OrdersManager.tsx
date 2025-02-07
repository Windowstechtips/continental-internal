import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  invoice_id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  payment_status: string;
  status: string;
  viewed: boolean;
  isNew: boolean;
  store_order_items?: Array<{
    id: number;
    quantity: number;
    price_at_time: number;
    store_products: {
      name: string;
    } | null;
  }>;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      console.log('Attempting to fetch orders...');

      // First test if we can access any table
      const { data: testData, error: testError } = await supabase
        .from('store_products')
        .select('*')
        .limit(1);

      console.log('Test query result:', { testData, testError });

      // Now try to get orders
      const { data, error } = await supabase
        .from('store_orders')
        .select(`
          *,
          store_order_items (
            id,
            quantity,
            price_at_time,
            store_products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      console.log('Orders query result:', { data, error });

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      console.log('Orders data:', data);

      // Mark orders as new if they're less than 24 hours old and haven't been viewed
      const ordersWithNewStatus = (data || []).map(order => ({
        ...order,
        viewed: localStorage.getItem(`order_${order.id}_viewed`) === 'true',
        isNew: new Date(order.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      }));

      setOrders(ordersWithNewStatus);
    } catch (err) {
      console.error('Full error object:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function createTestOrder() {
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .insert([
          {
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '1234567890',
            total_amount: 1000,
            invoice_id: 'TEST-' + Date.now(),
            payment_status: 'pending',
            status: 'pending'
          }
        ])
        .select();

      if (error) throw error;
      
      console.log('Created test order:', data);
      loadOrders();  // Reload the orders
    } catch (err) {
      console.error('Error creating test order:', err);
      setError('Failed to create test order');
    }
  }

  async function updateOrderStatus(orderId: number, newStatus: string, type: 'status' | 'payment') {
    try {
      const { error } = await supabase
        .from('store_orders')
        .update({
          [type === 'status' ? 'status' : 'payment_status']: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      loadOrders();  // Reload the orders
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
    }
  }

  // Mark an order as viewed
  const markAsViewed = async (orderId: number) => {
    try {
      localStorage.setItem(`order_${orderId}_viewed`, 'true');
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, viewed: true } : order
      ));
    } catch (err) {
      console.error('Error marking order as viewed:', err);
    }
  };

  // Separate orders into active and completed
  const activeOrders = orders.filter(order => order.status !== 'complete');
  const completedOrders = orders.filter(order => order.status === 'complete');

  async function deleteOrder(orderId: number) {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('store_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.filter(order => order.id !== orderId));
    } catch (err) {
      console.error('Error deleting order:', err);
      setError('Failed to delete order');
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl text-gray-200">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl text-red-400">{error}</div>
        <button
          onClick={loadOrders}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl text-gray-200 mb-4">No orders found</div>
        <button
          onClick={createTestOrder}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Test Order
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-200">Orders</h1>
      </div>
      
      {/* Active Orders */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Active Orders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeOrders.map(order => (
            <div 
              key={order.id} 
              className="bg-gray-800 rounded-lg p-4 space-y-3 relative"
              onClick={() => !order.viewed && markAsViewed(order.id)}
            >
              {/* New Order Indicator */}
              {!order.viewed && order.isNew && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}

              {/* Order Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-200">
                    Order #{order.invoice_id}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Date: {new Date(order.updated_at || order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-bold text-gray-200">
                    Rs. {order.total_amount.toFixed(2)}
                  </p>
                  <div className="flex flex-col gap-1">
                    <select
                      value={order.status || 'pending'}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value, 'status')}
                      className={`px-2 py-0.5 rounded text-xs border-0 cursor-pointer ${
                        order.status === 'complete' ? 'bg-green-900/50 text-green-200' :
                        order.status === 'ready_for_pickup' ? 'bg-blue-900/50 text-blue-200' :
                        order.status === 'cancelled' ? 'bg-red-900/50 text-red-200' :
                        order.status === 'unpaid' ? 'bg-orange-900/50 text-orange-200' :
                        'bg-yellow-900/50 text-yellow-200'
                      }`}
                    >
                      <option value="pending">Order Pending</option>
                      <option value="unpaid">Order UnPaid</option>
                      <option value="ready_for_pickup">Order Ready for Pickup</option>
                      <option value="complete">Order Complete</option>
                      <option value="cancelled">Order Cancelled</option>
                    </select>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="flex-1 px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-200 hover:bg-blue-800/50 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOrder(order.id);
                        }}
                        className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-200 hover:bg-red-800/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-900 rounded p-3">
                <h3 className="text-xs font-medium text-gray-400 mb-2">Customer Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm text-gray-200">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-gray-200">{order.customer_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm text-gray-200">{order.customer_email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-gray-200">{order.customer_address}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-700">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Completed Orders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {completedOrders.map(order => (
              <div 
                key={order.id} 
                className="bg-gray-800/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">
                      Order #{order.invoice_id}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {new Date(order.updated_at || order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-300">
                    Rs. {order.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {order.customer_name} • {order.customer_phone}
                </div>
                <div className="flex flex-col gap-1">
                  <select
                    value={order.status || 'complete'}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value, 'status')}
                    className={`w-full px-2 py-0.5 rounded text-xs border-0 cursor-pointer ${
                      order.status === 'complete' ? 'bg-green-900/50 text-green-200' :
                      order.status === 'ready_for_pickup' ? 'bg-blue-900/50 text-blue-200' :
                      order.status === 'cancelled' ? 'bg-red-900/50 text-red-200' :
                      order.status === 'unpaid' ? 'bg-orange-900/50 text-orange-200' :
                      'bg-yellow-900/50 text-yellow-200'
                    }`}
                  >
                    <option value="pending">Order Pending</option>
                    <option value="unpaid">Order UnPaid</option>
                    <option value="ready_for_pickup">Order Ready for Pickup</option>
                    <option value="complete">Order Complete</option>
                    <option value="cancelled">Order Cancelled</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="flex-1 px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-200 hover:bg-blue-800/50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrder(order.id);
                      }}
                      className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-200 hover:bg-red-800/50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-200">
                  Order #{selectedOrder.invoice_id}
                </h2>
                <p className="text-sm text-gray-400">
                  Created: {new Date(selectedOrder.created_at).toLocaleString()}
                  {selectedOrder.updated_at && selectedOrder.updated_at !== selectedOrder.created_at && (
                    <span> • Updated: {new Date(selectedOrder.updated_at).toLocaleString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="bg-gray-900 rounded p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Order Status</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedOrder.status === 'complete' ? 'bg-green-900/50 text-green-200' :
                    selectedOrder.status === 'ready_for_pickup' ? 'bg-blue-900/50 text-blue-200' :
                    selectedOrder.status === 'cancelled' ? 'bg-red-900/50 text-red-200' :
                    selectedOrder.status === 'unpaid' ? 'bg-orange-900/50 text-orange-200' :
                    'bg-yellow-900/50 text-yellow-200'
                  }`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-900 rounded p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm text-gray-200">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-gray-200">{selectedOrder.customer_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm text-gray-200">{selectedOrder.customer_email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Delivery Address</p>
                    <p className="text-sm text-gray-200">{selectedOrder.customer_address}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-900 rounded p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.store_order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <p className="text-sm text-gray-200">{item.store_products?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-200">Rs. {(item.price_at_time * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">@ Rs. {item.price_at_time.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-sm font-medium text-gray-200">Total Amount</span>
                    <span className="text-lg font-bold text-gray-200">Rs. {selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 