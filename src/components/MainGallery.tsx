import React, { useState, useEffect } from 'react';
import GalleryImageUploader from './GalleryImageUploader';
import { supabase, ensureAuthenticated } from '../lib/supabaseClient';
import { cloudinaryConfig } from '../lib/cloudinaryConfig';
import { PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

interface GalleryImage {
  id: string;
  image_url: string;
  public_id: string;
  tags: string[];
  upload_date: string;
}

export default function MainGallery() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchImages = async (tag?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure we're authenticated before querying the database
      await ensureAuthenticated();
      
      let query = supabase
        .from('gallery_images')
        .select('*')
        .order('upload_date', { ascending: false });
      
      // If a tag is provided, filter by that tag
      if (tag && tag.trim()) {
        query = query.contains('tags', [tag.trim()]);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching images:', error);
        setError('Failed to fetch images. Please check your database connection.');
        return;
      }
      
      setImages(data || []);
    } catch (err) {
      console.error('Error in fetchImages:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (id: string, publicId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }
    
    setConfirmDelete(id);
    
    try {
      // Ensure we're authenticated before deleting
      await ensureAuthenticated();
      
      // 1. Delete from Cloudinary
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await generateSignature(`public_id=${publicId}&timestamp=${timestamp}`);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('signature', signature);
      formData.append('api_key', cloudinaryConfig.apiKey);
      formData.append('timestamp', timestamp.toString());
      
      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`, {
        method: 'POST',
        body: formData
      });
      
      if (!cloudinaryResponse.ok) {
        const cloudinaryError = await cloudinaryResponse.json();
        console.error('Cloudinary deletion error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
      
      // 2. Delete from Supabase
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // 3. Update local state
      setImages(images.filter(img => img.id !== id));
      
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete the image. Please try again.');
    } finally {
      setConfirmDelete(null);
    }
  };

  const generateSignature = async (paramsToSign: string) => {
    try {
      const response = await fetch('/api/cloudinary-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paramsToSign }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate signature');
      }
      
      const data = await response.json();
      return data.signature;
    } catch (err) {
      console.error('Error generating signature:', err);
      throw err;
    }
  };

  const handleEditTags = (id: string, tagsString: string) => {
    setEditingTags(tagsString);
    setEditingTagsId(id);
  };

  const handleSaveTags = async () => {
    if (!editingTags || !editingTagsId) return;
    
    try {
      // Ensure we're authenticated before updating
      await ensureAuthenticated();
      
      // Parse tags from comma-separated string
      const tagsArray = editingTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Update in Supabase
      const { error } = await supabase
        .from('gallery_images')
        .update({ tags: tagsArray })
        .eq('id', editingTagsId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setImages(images.map(img => 
        img.id === editingTagsId 
          ? { ...img, tags: tagsArray } 
          : img
      ));
      
      // Close the modal
      setEditingTags(null);
      setEditingTagsId(null);
      
    } catch (err) {
      console.error('Error updating tags:', err);
      alert('Failed to update tags. Please try again.');
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(searchTag as string);
  };

  const handleClearSearch = () => {
    setSearchTag(null);
    fetchImages();
  };

  const handleImageUploaded = (imageData: GalleryImage) => {
    setImages([imageData, ...images]);
    setShowAddModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold text-white">Image Gallery</h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTag || ''}
                onChange={(e) => setSearchTag(e.target.value)}
                placeholder="Search by tag..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {searchTag && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </form>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Image
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm animate-slideUp">
            <p className="font-medium mb-1">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mb-4"></div>
            <p className="text-gray-400">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-800/20 rounded-xl border border-gray-800/50">
            <p className="text-lg mb-2">No images found</p>
            <p className="text-sm">
              {searchTag ? `No images match the tag "${searchTag}"` : 'Upload your first image by clicking "Add Image"'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div 
                key={image.id} 
                className="group bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden animate-slideUp"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={image.image_url}
                    alt="Gallery"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 bg-gray-800/70 backdrop-blur-sm text-gray-200 text-xs rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTag(tag);
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-300 text-xs">
                      {new Date(image.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTags(image.id, image.tags.join(', '));
                      }}
                      className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
                      aria-label="Edit tags"
                    >
                      <PencilIcon className="h-5 w-5 text-blue-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(image.id, image.public_id);
                      }}
                      disabled={confirmDelete === image.id}
                      className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200 disabled:opacity-50"
                      aria-label="Delete image"
                    >
                      {confirmDelete === image.id ? (
                        <div className="h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <TrashIcon className="h-5 w-5 text-red-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 truncate max-w-[150px]">
                    ID: {image.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Tag Editing Modal */}
      {editingTags && editingTagsId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-md animate-slideUp">
            <h2 className="text-xl font-bold text-white mb-4">Edit Tags</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={editingTags}
                onChange={(e) => setEditingTags(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTags(null);
                  setEditingTagsId(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveTags()}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Image Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add New Image</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <GalleryImageUploader
              onImageUploaded={handleImageUploaded}
            />
          </div>
        </div>
      )}
    </div>
  );
} 