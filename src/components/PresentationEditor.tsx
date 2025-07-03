import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { uploadImage, cloudinaryConfig } from '../lib/cloudinaryConfig';

// Types definition
interface ImageCategory {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

interface PresentationImage {
  id: string;
  category_id: string;
  image_url: string;
  file_type: string;
  created_at: string;
}

interface PresentationSettings {
  id: string;
  show_classes: boolean;
  show_news: boolean;
  fullscreen: boolean;
  transition_speed: number;
  display_duration?: number;
  class_duration?: number;
  active_category_id: string | null;
  created_at: string;
}

const PresentationEditor: React.FC = () => {
  const [categories, setCategories] = useState<ImageCategory[]>([]);
  const [images, setImages] = useState<PresentationImage[]>([]);
  const [settings, setSettings] = useState<PresentationSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    fetchPresentationData();
  }, []);

  // Fetch all presentation data
  const fetchPresentationData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('presentation_categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('presentation_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        // PGRST116 is the error code for no rows returned
        throw settingsError;
      }

      setSettings(settingsData || {
        id: '1',
        show_classes: true,
        show_news: true,
        fullscreen: true,
        transition_speed: 5,
        display_duration: 5,
        class_duration: 5,
        active_category_id: null,
        created_at: new Date().toISOString()
      });

      // If we have categories and a selected active category, fetch its images
      if (categoriesData?.length > 0) {
        const activeCategory = settingsData?.active_category_id || categoriesData[0].id;
        setSelectedCategory(activeCategory);
        await fetchImagesForCategory(activeCategory);
      }
    } catch (err) {
      console.error('Error fetching presentation data:', err);
      setError('Failed to load presentation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch images for a specific category
  const fetchImagesForCategory = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('presentation_images')
        .select('*')
        .eq('category_id', categoryId)
        .not('file_type', 'eq', 'ppt-original') // Exclude original PowerPoint files
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images. Please try again.');
    }
  };

  // Handle category selection
  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    await fetchImagesForCategory(categoryId);
  };

  // Toggle settings (show_classes, show_news, fullscreen)
  const toggleSetting = async (setting: 'show_classes' | 'show_news' | 'fullscreen') => {
    if (!settings) return;

    try {
      const newValue = !settings[setting];
      
      const { error } = await supabase
        .from('presentation_settings')
        .upsert({
          ...settings,
          [setting]: newValue
        });

      if (error) throw error;

      setSettings({
        ...settings,
        [setting]: newValue
      });
    } catch (err) {
      console.error(`Error updating ${setting}:`, err);
      setError(`Failed to update setting. Please try again.`);
    }
  };

  // Set active category
  const setActiveCategory = async (categoryId: string) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('presentation_settings')
        .upsert({
          ...settings,
          active_category_id: categoryId
        });

      if (error) throw error;

      setSettings({
        ...settings,
        active_category_id: categoryId
      });
    } catch (err) {
      console.error('Error setting active category:', err);
      setError('Failed to set active category. Please try again.');
    }
  };

  // Create new category
  const createCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('presentation_categories')
        .insert([{
          name: newCategoryName.trim(),
          is_active: false
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories([data, ...categories]);
        setNewCategoryName('');
        setIsAddingCategory(false);
        
        // If this is the first category, select it
        if (categories.length === 0) {
          setSelectedCategory(data.id);
        }
      }
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Failed to create category. Please try again.');
    }
  };

  // Delete category and all associated images
  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category and all its images? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete all images in this category
      const { error: imagesError } = await supabase
        .from('presentation_images')
        .delete()
        .eq('category_id', categoryId);

      if (imagesError) throw imagesError;

      // Then delete the category
      const { error: categoryError } = await supabase
        .from('presentation_categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      // Update local state
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      // If the deleted category was selected, select another one
      if (selectedCategory === categoryId) {
        const nextCategory = categories.find(cat => cat.id !== categoryId);
        if (nextCategory) {
          setSelectedCategory(nextCategory.id);
          fetchImagesForCategory(nextCategory.id);
        } else {
          setSelectedCategory(null);
          setImages([]);
        }
      }

      // If the deleted category was active, update settings
      if (settings?.active_category_id === categoryId) {
        const nextCategory = categories.find(cat => cat.id !== categoryId);
        const updatedSettings = {
          ...settings,
          active_category_id: nextCategory?.id || null
        };
        
        await supabase
          .from('presentation_settings')
          .upsert(updatedSettings);
        
        setSettings(updatedSettings);
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category. Please try again.');
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCategory) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const totalFiles = files.length;
    let uploadedCount = 0;

    try {
      const newImages: PresentationImage[] = [];

      // Upload each file to Cloudinary
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        
        // Check if file is PowerPoint
        const isPowerPoint = file.name.toLowerCase().endsWith('.ppt') || 
                            file.name.toLowerCase().endsWith('.pptx') ||
                            file.type === 'application/vnd.ms-powerpoint' ||
                            file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        
        try {
          const cloudinaryResponse = await uploadImage(file);
          uploadedCount++;
          setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));

          if (!cloudinaryResponse.secure_url) {
            throw new Error('Failed to upload file to Cloudinary');
          }

          console.log('Cloudinary response:', cloudinaryResponse);

          // Save the image reference in Supabase
          const { data, error } = await supabase
            .from('presentation_images')
            .insert([{
              category_id: selectedCategory,
              image_url: cloudinaryResponse.secure_url,
              file_type: isPowerPoint ? 'ppt' : cloudinaryResponse.file_type
            }])
            .select()
            .single();

          if (error) throw error;
          if (data) newImages.push(data);
          
          // For PowerPoint files, show a success message
          if (isPowerPoint) {
            console.log("PowerPoint file processed successfully");
          }
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          // Continue with other files even if one fails
        }
      }

      // Update local state with new images
      setImages([...newImages, ...images]);
      
      // Reset the file input
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Failed to upload one or more files. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete an image
  const deleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('presentation_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Update local state
      setImages(images.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image. Please try again.');
    }
  };

  // Update display duration
  const updateDisplayDuration = async (value: number) => {
    if (!settings?.id) return;
    
    try {
      const { error } = await supabase
        .from('presentation_settings')
        .update({ display_duration: value })
        .eq('id', settings.id);
      
      if (error) throw error;
      
      // Update local state
      setSettings({
        ...settings,
        display_duration: value
      });
    } catch (error) {
      console.error('Error updating display duration:', error);
      setError('Failed to update display duration. Please try again.');
    }
  };

  // Update class display duration
  const updateClassDuration = async (value: number) => {
    if (!settings?.id) return;
    
    try {
      const { error } = await supabase
        .from('presentation_settings')
        .update({ class_duration: value })
        .eq('id', settings.id);
      
      if (error) throw error;
      
      // Update local state
      setSettings({
        ...settings,
        class_duration: value
      });
    } catch (error) {
      console.error('Error updating class display duration:', error);
      setError('Failed to update class display duration. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
        <h1 className="text-2xl font-bold text-white mb-8">Presentation Editor</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mb-4"></div>
            <p className="text-gray-400">Loading presentation settings...</p>
          </div>
        ) : (
          <>
            {/* Display Settings */}
            <div className="bg-dark-card/50 rounded-xl p-6 mb-8 border border-gray-800/30">
              <h2 className="text-xl font-semibold text-white mb-4">Display Settings</h2>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-medium">Show Current Classes</h3>
                    <p className="text-gray-400 text-sm">Display currently running classes on presentation screens</p>
                  </div>
                  <button 
                    onClick={() => toggleSetting('show_classes')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      settings?.show_classes 
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {settings?.show_classes ? (
                      <span className="flex items-center gap-1">
                        <CheckIcon className="w-5 h-5" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XMarkIcon className="w-5 h-5" /> Disabled
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-medium">Show News</h3>
                    <p className="text-gray-400 text-sm">Display latest news on presentation screens</p>
                  </div>
                  <button 
                    onClick={() => toggleSetting('show_news')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      settings?.show_news 
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {settings?.show_news ? (
                      <span className="flex items-center gap-1">
                        <CheckIcon className="w-5 h-5" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XMarkIcon className="w-5 h-5" /> Disabled
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-medium">Fullscreen Mode</h3>
                    <p className="text-gray-400 text-sm">Automatically enter fullscreen mode when presentation view loads</p>
                  </div>
                  <button 
                    onClick={() => toggleSetting('fullscreen')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      settings?.fullscreen 
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {settings?.fullscreen ? (
                      <span className="flex items-center gap-1">
                        <CheckIcon className="w-5 h-5" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XMarkIcon className="w-5 h-5" /> Disabled
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-medium">Image Display Duration</h3>
                    <p className="text-gray-400 text-sm">How long each image is displayed before showing the next one (in seconds)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateDisplayDuration(Math.max(1, (settings?.display_duration || 5) - 1))}
                      className="p-1 bg-gray-800 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="min-w-[50px] text-center text-white font-medium">
                      {settings?.display_duration || settings?.transition_speed || 5}s
                    </span>
                    <button 
                      onClick={() => updateDisplayDuration(Math.min(30, (settings?.display_duration || 5) + 1))}
                      className="p-1 bg-gray-800 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-white font-medium">Class Display Duration</h3>
                    <p className="text-gray-400 text-sm">How long each class is displayed in the carousel (in seconds)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateClassDuration(Math.max(3, (settings?.class_duration || 10) - 1))}
                      className="p-1 bg-gray-800 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="min-w-[50px] text-center text-white font-medium">
                      {settings?.class_duration || 10}s
                    </span>
                    <button 
                      onClick={() => updateClassDuration(Math.min(30, (settings?.class_duration || 10) + 1))}
                      className="p-1 bg-gray-800 rounded text-gray-400 hover:bg-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Categories */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Image Categories</h2>
                {isAddingCategory ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={createCategory}
                      className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-white"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                      }}
                      className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="flex items-center px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Category
                  </button>
                )}
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border border-dashed border-gray-700 rounded-xl">
                  <p>No categories yet. Create one to start adding images.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div 
                      key={category.id}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedCategory === category.id 
                          ? 'bg-blue-900/30 border-blue-500/50' 
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/30'
                      }`}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium">{category.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategory(category.id);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-medium ${
                              settings?.active_category_id === category.id
                                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                            }`}
                          >
                            {settings?.active_category_id === category.id ? 'Active' : 'Set Active'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategory(category.id);
                            }}
                            className="p-1.5 bg-red-900/20 hover:bg-red-800/40 rounded-lg"
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Category Images */}
            {selectedCategory && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    Images in {categories.find(c => c.id === selectedCategory)?.name}
                  </h2>
                  <label className="flex items-center px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer">
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Images & Presentations
                    <input
                      type="file"
                      accept="image/*,.ppt,.pptx"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {isUploading && (
                  <div className="mb-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-300 font-medium">Uploading images...</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {images.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border border-dashed border-gray-700 rounded-xl">
                    <p>No images in this category. Upload some images to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden">
                        <img 
                          src={image.image_url} 
                          alt="Presentation image" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center">
                          <button
                            onClick={() => deleteImage(image.id)}
                            className="p-2 bg-red-600/80 hover:bg-red-600 rounded-full"
                          >
                            <TrashIcon className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PresentationEditor; 