import { NavLink } from 'react-router-dom';
import { useNewOrders } from '../../hooks/useNewOrders';

export default function StoreNavigation() {
  const { hasNewOrders } = useNewOrders();

  return (
    <nav className="flex space-x-4 mb-6">
      <NavLink
        to="/dashboard/store/products"
        replace
        className={({ isActive }) =>
          `px-4 py-2 rounded transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        Products
      </NavLink>
      <NavLink
        to="/dashboard/store/orders"
        replace
        className={({ isActive }) =>
          `px-4 py-2 rounded transition-colors relative ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        Orders
        {hasNewOrders && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </NavLink>
    </nav>
  );
} 