import React, { useState, useRef, useEffect } from 'react';
import { cloudinaryConfig } from '../lib/cloudinaryConfig';
import { supabase, ensureAuthenticated } from '../lib/supabaseClient';

interface GalleryImageUploaderProps {
  onImageUploaded: (imageData: ImageMetadata) => void;
  onMultipleImagesUploaded?: (imagesData: ImageMetadata[]) => void;
  allowMultiple?: boolean;
}

// Define interface for image metadata
export interface ImageMetadata {
  id: string;
  public_id: string;
  image_url: string;
  tags: string[];
  upload_date: string;
}

export default function GalleryImageUploader({ 
  onImageUploaded, 
  onMultipleImagesUploaded, 
  allowMultiple = false 
}: GalleryImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string>('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploadedImagesData, setUploadedImagesData] = useState<any[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing tags when component mounts
  useEffect(() => {
    fetchExistingTags();
  }, []);

  // Filter tag suggestions based on input
  useEffect(() => {
    if (tags.trim() === '') {
      setTagSuggestions([]);
      return;
    }

    // Get the last tag being typed (after the last comma)
    const lastTagInput = tags.split(',').pop()?.trim().toLowerCase() || '';
    
    if (lastTagInput) {
      const filteredSuggestions = existingTags
        .filter(tag => 
          tag.toLowerCase().includes(lastTagInput) && 
          !tags.split(',').map(t => t.trim()).includes(tag)
        )
        .slice(0, 5); // Limit to 5 suggestions
      
      setTagSuggestions(filteredSuggestions);
    } else {
      setTagSuggestions([]);
    }
  }, [tags, existingTags]);

  const fetchExistingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('tags');
      
      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }
      
      // Extract all unique tags from the data
      const allTags = data
        .flatMap(item => item.tags || [])
        .filter(Boolean);
      
      // Remove duplicates
      const uniqueTags = [...new Set(allTags)];
      
      setExistingTags(uniqueTags);
    } catch (err) {
      console.error('Error fetching existing tags:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset states
    setError(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadedImagesData([]);
    setPreviewUrls([]);
    setCurrentFileIndex(0);
    setTotalFiles(files.length);

    // Create previews for all files
    const previews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError(`File "${file.name}" is not a valid image file (JPEG, PNG, WEBP, or GIF)`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the maximum size of 10MB`);
        continue;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === Math.min(files.length, 5)) { // Show max 5 previews
          setPreviewUrls(previews);
        }
      };
      reader.readAsDataURL(file);
    }

    // Start upload process
    setIsUploading(true);
    
    // Process files sequentially
    const uploadedData = [];
    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i + 1);
      try {
        const result = await uploadSingleFile(files[i], i);
        if (result) {
          uploadedData.push(result);
        }
      } catch (error) {
        console.error(`Error uploading file ${i + 1}:`, error);
        setError(`Error uploading file ${i + 1}. Please try again.`);
      }
    }

    // All uploads complete
    setUploadedImagesData(uploadedData);
    setUploadComplete(true);
    setIsUploading(false);
    
    // Focus on the tags input to encourage adding tags
    setTimeout(() => {
      if (tagsInputRef.current) {
        tagsInputRef.current.focus();
      }
    }, 100);
  };

  const uploadSingleFile = async (file: File, index: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'store_images');
      formData.append('folder', 'galleryimages');
      
      // Generate a unique public_id to avoid conflicts
      const uniqueId = `gallery_${Date.now()}_${index}`;
      formData.append('public_id', uniqueId);
      
      // Add tags if provided
      const tagArray = tags.trim() ? tags.split(',').map(tag => tag.trim()) : [];
      if (tagArray.length > 0) {
        formData.append('tags', tagArray.join(','));
      }

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`);
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      // Handle response
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const cloudinaryResponse = JSON.parse(xhr.responseText);
          resolve(cloudinaryResponse);
        } else {
          let errorMsg = `Upload of file ${index + 1} failed. Please try again.`;
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.error?.message || errorMsg;
          } catch (e) {
            // If we can't parse the response, use the default error message
          }
          console.error('Upload failed:', xhr.responseText);
          reject(new Error(errorMsg));
        }
      };
      
      // Handle network errors
      xhr.onerror = () => {
        console.error('Network error during upload');
        reject(new Error('Network error. Please check your internet connection and try again.'));
      };
      
      // Send the request
      xhr.send(formData);
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleCancelUpload = () => {
    setPreviewUrls([]);
    setError(null);
    setTags('');
    setUploadComplete(false);
    setUploadedImagesData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTagSelect = (tag: string) => {
    // Get all tags except the last one (which is being typed)
    const existingTagsArray = tags.split(',').slice(0, -1).map(t => t.trim());
    
    // Add the selected tag
    existingTagsArray.push(tag);
    
    // Join back with commas and add a trailing comma for the next tag
    setTags(existingTagsArray.join(', ') + ', ');
    
    // Hide suggestions
    setShowSuggestions(false);
    
    // Focus back on the input
    if (tagsInputRef.current) {
      tagsInputRef.current.focus();
    }
  };

  const handleTagInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleTagInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleCompleteUpload = async () => {
    if (uploadedImagesData.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Ensure we're authenticated before saving to Supabase
      await ensureAuthenticated();
      
      // Parse tags from the input
      const tagArray = tags.trim() 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
        : [];
      
      // Process each uploaded image
      const savedImages: ImageMetadata[] = [];
      
      for (const imageData of uploadedImagesData) {
        const { data, error } = await supabase
          .from('gallery_images')
          .insert([{
            image_url: imageData.secure_url,
            public_id: imageData.public_id,
            tags: tagArray,
            upload_date: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          console.error('Error saving to Supabase:', error);
          setError(`Database error: ${error.message}`);
          continue;
        }
        
        savedImages.push(data);
      }
      
      // Reset the form
      setPreviewUrls([]);
      setUploadProgress(0);
      setTags('');
      setUploadComplete(false);
      setUploadedImagesData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh the list of existing tags
      fetchExistingTags();
      
      // Notify parent component
      if (savedImages.length === 1) {
        onImageUploaded(savedImages[0]);
      } else if (savedImages.length > 1 && onMultipleImagesUploaded) {
        onMultipleImagesUploaded(savedImages);
      }
      
    } catch (err) {
      console.error('Error saving to Supabase:', err);
      setError('Failed to save image metadata to database.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="gallery-image-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isUploading 
              ? 'border-blue-600 bg-blue-600/10' 
              : error 
                ? 'border-red-600 bg-red-600/10' 
                : uploadComplete
                  ? 'border-green-600 bg-green-600/10'
                  : 'border-gray-600 bg-[#2A2A2A] hover:bg-[#333333]'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {previewUrls.length > 0 ? (
            <div className="relative w-full h-full p-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square overflow-hidden rounded-md">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && previewUrls.length > 5 && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">+{previewUrls.length - 5} more</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!isUploading && !uploadComplete && (
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <span className="text-white opacity-0 hover:opacity-100">
                    Click to change images
                  </span>
                </div>
              )}
              {uploadComplete && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    Upload Complete
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className={`w-8 h-8 mb-4 ${error ? 'text-red-400' : 'text-gray-400'}`}
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP or GIF (max 10MB{allowMultiple ? ' each' : ''})</p>
              {allowMultiple && <p className="text-xs text-blue-400 mt-1">You can select multiple files</p>}
            </div>
          )}
          <input
            id="gallery-image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={allowMultiple}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading || uploadComplete}
          />
        </label>
      </div>

      {/* Tags input */}
      <div className="space-y-2 relative">
        <label htmlFor="image-tags" className="block text-sm font-medium text-gray-300">
          Tags (comma separated)
        </label>
        <input
          id="image-tags"
          ref={tagsInputRef}
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onFocus={handleTagInputFocus}
          onBlur={handleTagInputBlur}
          placeholder="e.g. landscape, nature, building"
          className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
            uploadComplete ? 'focus:ring-green-500 border-green-600' : 'focus:ring-blue-500'
          }`}
          disabled={isUploading}
        />
        
        {/* Tag suggestions */}
        {showSuggestions && tagSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            <ul className="py-1">
              {tagSuggestions.map((tag, index) => (
                <li 
                  key={index}
                  className="px-3 py-2 text-white hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleTagSelect(tag)}
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <p className="text-xs text-gray-400">
          {uploadComplete 
            ? "Add or edit tags before saving your images" 
            : "Add tags to help organize your images (optional)"}
        </p>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            {allowMultiple 
              ? `Uploading file ${currentFileIndex} of ${totalFiles}... ${uploadProgress}%` 
              : `Uploading to Cloudinary... ${uploadProgress}%`}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <p className="font-medium mb-1">Error:</p>
          <p>{error}</p>
          {error.includes('database') && (
            <p className="mt-2 text-xs">
              Note: This may be due to missing database tables or permissions. Please make sure the 'gallery_images' table exists in your Supabase database and has the correct permissions set up.
            </p>
          )}
        </div>
      )}

      {uploadComplete && (
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={handleCancelUpload}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCompleteUpload}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Save {uploadedImagesData.length > 1 ? `${uploadedImagesData.length} Images` : 'Image'}
          </button>
        </div>
      )}

      {previewUrls.length > 0 && !isUploading && !uploadComplete && (
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={handleCancelUpload}
            className="px-3 py-1 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
} 