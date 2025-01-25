import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNews = async () => {
    try {
      if (!newItem.title || !newItem.content) {
        setError('Please fill in all fields');
        return;
      }

      const { data, error } = await supabase
        .from('news')
        .insert([{
          title: newItem.title,
          content: newItem.content
        }])
        .select()
        .single();

      if (error) throw error;

      setNews([data, ...news]);
      setShowAddForm(false);
      setNewItem({ title: '', content: '' });
      setError(null);
    } catch (err) {
      console.error('Error adding news:', err);
      setError('Failed to add news. Please try again.');
    }
  };

  const handleEditNews = async () => {
    if (!editingNews) return;

    try {
      const { data, error } = await supabase
        .from('news')
        .update({
          title: editingNews.title,
          content: editingNews.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNews.id)
        .select()
        .single();

      if (error) throw error;

      setNews(news.map(item => item.id === data.id ? data : item));
      setEditingNews(null);
    } catch (err) {
      console.error('Error updating news:', err);
      setError('Failed to update news. Please try again.');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!confirm('Are you sure you want to delete this news item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNews(news.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting news:', err);
      setError('Failed to delete news. Please try again.');
    }
  };

  const NewsForm = ({ item, onSubmit, onCancel }: { 
    item: Partial<NewsItem>, 
    onSubmit: () => void,
    onCancel: () => void 
  }) => {
    const [formData, setFormData] = useState({
      title: item.title || '',
      content: item.content || ''
    });

    useEffect(() => {
      setFormData({
        title: item.title || '',
        content: item.content || ''
      });
    }, [item]);

    const handleChange = (field: 'title' | 'content', value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
      if ('id' in item) {
        setEditingNews(prev => ({ ...prev!, ...formData }));
      } else {
        setNewItem(prev => ({ ...prev, ...formData }));
      }
      onSubmit();
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2"
            placeholder="Enter news title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            rows={6}
            className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2"
            placeholder="Enter news content"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition-colors"
          >
            {'id' in item ? 'Update News' : 'Add News'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-[#2A2A2A] text-white rounded-md py-2 hover:bg-[#3A3A3A] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const NewsCard = ({ item }: { item: NewsItem }) => {
    return (
      <div className="bg-[#1E1E1E] rounded-lg p-4 group relative">
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={() => setEditingNews(item)}
            className="p-2 rounded-full bg-[#2A2A2A] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <PencilIcon className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => handleDeleteNews(item.id)}
            className="p-2 rounded-full bg-[#2A2A2A] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30"
          >
            <TrashIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
        <p className="text-gray-400 whitespace-pre-wrap mb-4">{item.content}</p>
        
        <div className="text-sm text-gray-500">
          Created: {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
          {item.updated_at !== item.created_at && (
            <span className="ml-2">
              • Updated: {format(new Date(item.updated_at), 'MMM d, yyyy h:mm a')}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 py-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">News</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add News
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Add/Edit News Modal */}
        {(showAddForm || editingNews) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1E1E1E] rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingNews ? 'Edit News' : 'Add News'}
              </h3>
              <NewsForm
                item={editingNews || newItem}
                onSubmit={editingNews ? handleEditNews : handleAddNews}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingNews(null);
                }}
              />
            </div>
          </div>
        )}

        {/* News List */}
        <div className="grid gap-4">
          {news.length > 0 ? (
            news.map(item => (
              <NewsCard key={item.id} item={item} />
            ))
          ) : (
            <div className="bg-[#1E1E1E] rounded-lg p-4 text-gray-400 text-center">
              No news available
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 