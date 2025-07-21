import React, { useState, useEffect, useMemo } from 'react';
import GalleryImageUploader from './GalleryImageUploader';
import { supabase, ensureAuthenticated } from '../lib/supabaseClient';
import { cloudinaryConfig } from '../lib/cloudinaryConfig';
import { PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface GalleryImage {
  id: string;
  image_url: string;
  public_id: string;
  tags: string[];
  upload_date: string;
}

export default function MainGallery() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [bulkTags, setBulkTags] = useState<string>('');
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'byTag'>('all');
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Effect to fetch all unique tags
  useEffect(() => {
    fetchAllTags();
  }, []);

  // Effect to fetch images when component mounts or when activeTag changes
  useEffect(() => {
    if (viewMode === 'all') {
      fetchImages(searchTag || undefined);
    } else {
      fetchImages(activeTag || undefined);
    }
  }, [activeTag, viewMode, searchTag]);

  // Filtered images based on active tag
  const filteredImages = useMemo(() => {
    if (viewMode === 'all' || !activeTag) {
      return images;
    }
    return images.filter(image => image.tags.includes(activeTag));
  }, [images, activeTag, viewMode]);

  // Calculate tag counts for all images
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    images.forEach(image => {
      image.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [images]);

  const handleBulkTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkTags(e.target.value);
  };

  const handleBulkTagsSubmit = async () => {
    if (!bulkTags.trim()) {
      setError('Please enter at least one tag');
      return;
    }

    try {
      // Ensure we're authenticated
      await ensureAuthenticated();
      
      // Parse the tags from the comma-separated string
      const tagArray = bulkTags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      // Get the IDs of all currently filtered images
      const imageIds = filteredImages.map(img => img.id);
      
      // Start loading state
      setIsBulkDeleting(true);
      setBulkDeleteProgress(0);
      
      // Update all images in batches to avoid timeouts
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < imageIds.length; i += batchSize) {
        const batch = imageIds.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      let processed = 0;
      const totalImages = imageIds.length;
      
      for (const batch of batches) {
        // Update each image in the batch
        for (const id of batch) {
          const image = images.find(img => img.id === id);
          if (!image) continue;
          
          // Combine existing tags with new tags, removing duplicates
          const combinedTags = [...new Set([...image.tags, ...tagArray])];
          
          const { error } = await supabase
            .from('gallery_images')
            .update({ tags: combinedTags })
            .eq('id', id);
          
          if (error) {
            console.error('Error updating tags for image', id, error);
          }
          
          // Update progress
          processed++;
          setBulkDeleteProgress(Math.round((processed / totalImages) * 100));
        }
      }
      
      // Update local state
      const updatedImages = images.map(img => {
        if (imageIds.includes(img.id)) {
          // Combine existing tags with new tags, removing duplicates
          const combinedTags = [...new Set([...img.tags, ...tagArray])];
          return { ...img, tags: combinedTags };
        }
        return img;
      });
      
      setImages(updatedImages);
      
      // Update all tags
      const newAllTags = [...new Set([...allTags, ...tagArray])].sort();
      setAllTags(newAllTags);
      
      // Close the modal
      setShowBulkTagModal(false);
      setBulkTags('');
      
    } catch (err) {
      console.error('Error updating tags:', err);
      setError('Failed to update tags. Please try again.');
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteProgress(0);
    }
  };

  const handleDeleteAll = async () => {
    if (filteredImages.length === 0) return;
    
    setIsBulkDeleting(true);
    setBulkDeleteProgress(0);
    
    try {
      // Ensure we're authenticated
      await ensureAuthenticated();
      
      const totalImages = filteredImages.length;
      let processed = 0;
      
      // Delete images in batches
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < filteredImages.length; i += batchSize) {
        const batch = filteredImages.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      for (const batch of batches) {
        // Process each image in the batch
        const deletePromises = batch.map(async (image) => {
          try {
            // 1. Delete from Cloudinary
            const timestamp = Math.round(new Date().getTime() / 1000);
            const signature = await generateSignature(`public_id=${image.public_id}&timestamp=${timestamp}`);
            
            const formData = new FormData();
            formData.append('public_id', image.public_id);
            formData.append('signature', signature);
            formData.append('api_key', cloudinaryConfig.apiKey);
            formData.append('timestamp', timestamp.toString());
            
            await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`, {
              method: 'POST',
              body: formData
            });
            
            // 2. Delete from Supabase
            await supabase
              .from('gallery_images')
              .delete()
              .eq('id', image.id);
            
            return image.id;
          } catch (err) {
            console.error(`Error deleting image ${image.id}:`, err);
            return null;
          }
        });
        
        // Wait for all deletions in this batch to complete
        const deletedIds = await Promise.all(deletePromises);
        
        // Update progress
        processed += batch.length;
        setBulkDeleteProgress(Math.round((processed / totalImages) * 100));
      }
      
      // Update local state
      const remainingImages = images.filter(img => !filteredImages.includes(img));
      setImages(remainingImages);
      
      // Update tags
      const usedTags = new Set<string>();
      remainingImages.forEach(img => {
        img.tags.forEach(tag => usedTags.add(tag));
      });
      
      const updatedTags = allTags.filter(tag => usedTags.has(tag));
      setAllTags(updatedTags);
      
      // Reset view if needed
      if (viewMode === 'byTag' && activeTag && !usedTags.has(activeTag)) {
        setActiveTag(null);
        setViewMode('all');
      }
      
      // Close the modal
      setShowDeleteAllModal(false);
      
    } catch (err) {
      console.error('Error during bulk deletion:', err);
      setError('An error occurred during bulk deletion. Some images may not have been deleted.');
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteProgress(0);
    }
  };

  const fetchAllTags = async () => {
    try {
      // Ensure we're authenticated
      await ensureAuthenticated();
      
      const { data, error } = await supabase
        .from('gallery_images')
        .select('tags');
      
      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }
      
      // Extract all unique tags
      const allTagsArray = data
        .flatMap(item => item.tags || [])
        .filter(Boolean);
      
      // Remove duplicates and sort alphabetically
      const uniqueTags = [...new Set(allTagsArray)].sort();
      
      setAllTags(uniqueTags);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

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
      
      // 3. Update local state and refresh tags
      const deletedImage = images.find(img => img.id === id);
      const remainingImages = images.filter(img => img.id !== id);
      setImages(remainingImages);
      
      // 4. Refresh tags if needed
      if (deletedImage) {
        // Check if any tags are now unused
        const usedTags = new Set<string>();
        
        remainingImages.forEach(img => {
          img.tags.forEach(tag => usedTags.add(tag));
        });
        
        // Remove tags that are no longer used
        const updatedTags = allTags.filter(tag => usedTags.has(tag));
        if (updatedTags.length !== allTags.length) {
          setAllTags(updatedTags);
        }
        
        // 5. Reset active tag if it no longer exists
        if (activeTag && !usedTags.has(activeTag)) {
          setActiveTag(null);
          setViewMode('all');
        }
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image. Please try again.');
    } finally {
      setConfirmDelete(null);
    }
  };

  const generateSignature = async (paramsToSign: string) => {
    try {
      // IMPORTANT SECURITY WARNING: This is NOT secure for production environments!
      // In production, this function should call a secure backend API endpoint
      // that keeps your API secret safe.
      
      // For development/testing purposes only:
      const apiSecret = cloudinaryConfig.apiSecret;
      if (!apiSecret) {
        throw new Error('Missing Cloudinary API secret');
      }
      
      // Generate the SHA-1 signature
      const encoder = new TextEncoder();
      const data = encoder.encode(paramsToSign + apiSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      
      // Convert the hash to a hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return signature;
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
      // Ensure we're authenticated
      await ensureAuthenticated();
      
      // Parse the tags from the comma-separated string
      const tagArray = editingTags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      // Update the image in Supabase
      const { error } = await supabase
        .from('gallery_images')
        .update({ tags: tagArray })
        .eq('id', editingTagsId);
      
      if (error) {
        throw error;
      }
      
      // Find the image being edited
      const editedImage = images.find(img => img.id === editingTagsId);
      const oldTags = editedImage ? [...editedImage.tags] : [];
      
      // Update the local state
      setImages(images.map(img => 
        img.id === editingTagsId 
          ? { ...img, tags: tagArray } 
          : img
      ));
      
      // Update all tags
      const allCurrentTags = new Set<string>();
      
      // Collect all tags from all images (including the updated one)
      images.forEach(img => {
        if (img.id === editingTagsId) {
          tagArray.forEach(tag => allCurrentTags.add(tag));
        } else {
          img.tags.forEach(tag => allCurrentTags.add(tag));
        }
      });
      
      // Set the updated tags
      setAllTags(Array.from(allCurrentTags).sort());
      
      // Reset the editing state
      setEditingTags(null);
      setEditingTagsId(null);
      
      // If we're currently viewing by tag and that tag was removed, go back to all images
      if (viewMode === 'byTag' && activeTag && !tagArray.includes(activeTag)) {
        setActiveTag(null);
        setViewMode('all');
      }
    } catch (err) {
      console.error('Error updating tags:', err);
      setError('Failed to update tags. Please try again.');
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(searchTag || undefined);
    setActiveTag(null);
    setViewMode('all');
  };

  const handleClearSearch = () => {
    setSearchTag(null);
    fetchImages();
    setActiveTag(null);
    setViewMode('all');
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    setViewMode('byTag');
    setSearchTag(null);
  };

  const handleAllImagesClick = () => {
    setActiveTag(null);
    setViewMode('all');
    setSearchTag(null);
    fetchImages();
  };

  const handleImageUploaded = (imageData: GalleryImage) => {
    setImages(prevImages => [imageData, ...prevImages]);
    setShowAddModal(false);
    
    // Update tags
    const newTags = imageData.tags.filter(tag => !allTags.includes(tag));
    if (newTags.length > 0) {
      setAllTags(prevTags => [...prevTags, ...newTags].sort());
    }
  };

  const handleMultipleImagesUploaded = (imagesData: GalleryImage[]) => {
    setImages(prevImages => [...imagesData, ...prevImages]);
    setShowAddModal(false);
    
    // Update tags
    const newTags = new Set<string>();
    imagesData.forEach(image => {
      image.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          newTags.add(tag);
        }
      });
    });
    
    if (newTags.size > 0) {
      setAllTags(prevTags => [...prevTags, ...Array.from(newTags)].sort());
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
              Add Images
            </button>
          </div>
        </div>

        {/* Tag Tabs */}
        {allTags.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex space-x-2 pb-2 min-w-max">
              <button
                onClick={handleAllImagesClick}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  viewMode === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                All Images
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {images.length}
                </span>
              </button>
              
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    activeTag === tag
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <TagIcon className="h-4 w-4 mr-1" />
                  {tag}
                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {tagCounts[tag] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Bulk Actions */}
        {filteredImages.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setShowBulkTagModal(true)}
              className="px-4 py-2 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/40 transition-colors flex items-center text-sm"
            >
              <TagIcon className="h-4 w-4 mr-2" />
              Rename All ({filteredImages.length} images)
            </button>
            
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-4 py-2 bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/40 transition-colors flex items-center text-sm"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete All ({filteredImages.length} images)
            </button>
          </div>
        )}
        
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
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-800/20 rounded-xl border border-gray-800/50">
            <p className="text-lg mb-2">No images found</p>
            <p className="text-sm">
              {viewMode === 'byTag' 
                ? `No images with the tag "${activeTag}"`
                : searchTag 
                  ? `No images match the tag "${searchTag}"` 
                  : 'Upload your first image by clicking "Add Images"'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-md animate-slideUp my-8">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-2xl animate-slideUp my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add New Images</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <GalleryImageUploader
              onImageUploaded={handleImageUploaded}
              onMultipleImagesUploaded={handleMultipleImagesUploaded}
              allowMultiple={true}
            />
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-md animate-slideUp my-8">
            <h2 className="text-xl font-bold text-white mb-4">Bulk Add Tags</h2>
            <p className="text-sm text-gray-300 mb-4">
              Enter tags to add to all currently displayed images ({filteredImages.length} images). Separate multiple tags with commas.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={bulkTags}
                onChange={handleBulkTagsChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tag1, tag2, tag3"
                disabled={isBulkDeleting}
              />
            </div>
            
            {isBulkDeleting && (
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${bulkDeleteProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Processing {bulkDeleteProgress}%
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkTagModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                disabled={isBulkDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTagsSubmit}
                disabled={isBulkDeleting || !bulkTags.trim()}
                className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center ${
                  !bulkTags.trim() 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                }`}
              >
                {isBulkDeleting ? (
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <TagIcon className="h-5 w-5 mr-2" />
                )}
                {isBulkDeleting ? 'Processing...' : 'Add Tags'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-dark-card border border-gray-800 rounded-xl shadow-glass-strong p-6 w-full max-w-md animate-slideUp my-8">
            <h2 className="text-xl font-bold text-white mb-4">Delete All Images</h2>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to delete all {filteredImages.length} images? This action cannot be undone.
            </p>
            
            {isBulkDeleting && (
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${bulkDeleteProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Deleting {bulkDeleteProgress}%
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                disabled={isBulkDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isBulkDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center"
              >
                {isBulkDeleting ? (
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <TrashIcon className="h-5 w-5 mr-2" />
                )}
                {isBulkDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 