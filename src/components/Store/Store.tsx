import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StoreNavigation from './StoreNavigation';
import StorefrontManager from './StorefrontManager';
import OrdersManager from './OrdersManager';

export default function Store() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Store Management</h1>
      <StoreNavigation />
      
      <Routes>
        <Route index element={<Navigate to="products" replace />} />
        <Route path="products" element={<StorefrontManager />} />
        <Route path="orders" element={<OrdersManager />} />
      </Routes>
    </div>
  );
} 