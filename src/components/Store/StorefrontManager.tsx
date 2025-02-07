import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ImageUploader from './ImageUploader';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  created_at: string;
  updated_at: string;
  subject: string;
  grade: string;
  syllabus: 'Cambridge' | 'Edexcel';
}

const SUBJECTS = ['Math', 'Science', 'English', 'Physics', 'Chemistry', 'Biology'];
const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
const SYLLABUSES = ['Cambridge', 'Edexcel'];

export default function StorefrontManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newProduct: Product = {
      id: 0,
      name: '',
      description: '',
      price: 0,
      image_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subject: '',
      grade: 'Grade 9',
      syllabus: 'Cambridge' as const
    };
    setEditingProduct(newProduct);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const price = parseFloat(editingProduct.price.toString());
      if (isNaN(price)) {
        throw new Error('Invalid price value');
      }

      const productData = {
        id: editingProduct.id,
        name: editingProduct.name,
        description: editingProduct.description,
        price,
        image_url: editingProduct.image_url,
        subject: editingProduct.subject,
        grade: editingProduct.grade,
        syllabus: editingProduct.syllabus,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('store_products')
        .upsert(productData, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please check all fields and try again.');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      // First check if product has any orders
      const { data: orderItems, error: checkError } = await supabase
        .from('store_order_items')
        .select('id')
        .eq('product_id', deletingProduct.id)
        .limit(1);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        alert('Cannot delete this product because it has existing orders. Consider marking it as unavailable instead.');
        setDeletingProduct(null);
        return;
      }

      // If no orders exist, proceed with deletion
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', deletingProduct.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  if (isLoading) return <div className="p-4 text-gray-200">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-200">Store Products</h2>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Add New Product
        </button>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center overflow-y-auto p-4 z-50">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-2xl border border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-200">
              {editingProduct.id ? 'Edit Product' : 'New Product'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <ImageUploader
                onImageUploaded={(url) => setEditingProduct({...editingProduct, image_url: url})}
                currentImageUrl={editingProduct.image_url}
              />

              {editingProduct.id !== 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Product ID</label>
                  <input
                    type="text"
                    value={editingProduct.id}
                    className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-400 border-gray-600"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">Automatically assigned by the system</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-200 border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-200 border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Price (Rs.)</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                  className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-200 border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Subject</label>
                <input
                  type="text"
                  value={editingProduct.subject}
                  onChange={(e) => setEditingProduct({...editingProduct, subject: e.target.value})}
                  className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-200 border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Grade</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct({...editingProduct, grade: 'Grade 9'})}
                    className={`flex-1 py-2 px-4 rounded ${
                      editingProduct.grade === 'Grade 9'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Grade 9
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({...editingProduct, grade: 'Grade 10'})}
                    className={`flex-1 py-2 px-4 rounded ${
                      editingProduct.grade === 'Grade 10'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Grade 10
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Syllabus</label>
                <select
                  value={editingProduct.syllabus}
                  onChange={(e) => setEditingProduct({...editingProduct, syllabus: e.target.value as 'Cambridge' | 'Edexcel'})}
                  className="w-full p-2 border rounded bg-[#2A2A2A] text-gray-200 border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {SYLLABUSES.map(syllabus => (
                    <option key={syllabus} value={syllabus}>{syllabus}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-200">Delete Product</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete "{deletingProduct.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border border-gray-700 rounded-lg p-4 bg-[#2A2A2A] shadow-md hover:shadow-lg transition-shadow">
            <div className="relative pb-[60%] mb-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover rounded-md"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-200">{product.name}</h3>
                <span className="text-sm text-gray-400">#{product.id}</span>
              </div>
              <p className="text-gray-400 text-sm">{product.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-900/50 text-blue-200 text-xs rounded">{product.subject}</span>
                <span className="px-2 py-1 bg-green-900/50 text-green-200 text-xs rounded">{product.grade}</span>
                <span className="px-2 py-1 bg-purple-900/50 text-purple-200 text-xs rounded">{product.syllabus}</span>
              </div>
              <p className="font-bold text-gray-200">Rs. {product.price.toFixed(2)}</p>
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                  title="Edit product"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="text-red-400 hover:text-red-300 transition-colors p-1"
                  title="Delete product"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 