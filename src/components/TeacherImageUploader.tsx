import React, { useState, useRef } from 'react';
import { cloudinaryConfig } from '../lib/cloudinaryConfig';

interface TeacherImageUploaderProps {
  onImageUploaded: (imageUrl: string, publicId: string) => void;
  initialImageUrl?: string;
}

export default function TeacherImageUploader({ onImageUploaded, initialImageUrl }: TeacherImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading'>('idle');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadProgress(0);
    setUploadStage('idle');

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WEBP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start upload process
    setIsUploading(true);
    setUploadStage('uploading');

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'store_images'); // Using the same preset as gallery images
    formData.append('folder', 'teacherimages'); // Specific folder for teacher images
    
    // Generate a unique public_id to avoid conflicts
    const uniqueId = `teacher_${Date.now()}`;
    formData.append('public_id', uniqueId);

    try {
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
          
          // Call the callback with the image URL and public ID
          onImageUploaded(cloudinaryResponse.secure_url, cloudinaryResponse.public_id);
          
          // Reset states
          setIsUploading(false);
          setUploadStage('idle');
          
        } else {
          let errorMsg = 'Upload failed. Please try again.';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.error?.message || errorMsg;
          } catch (e) {
            // If we can't parse the response, use the default error message
          }
          console.error('Upload failed:', xhr.responseText);
          setError(`Cloudinary error: ${errorMsg}`);
          setIsUploading(false);
          setUploadStage('idle');
        }
      };
      
      // Handle network errors
      xhr.onerror = () => {
        console.error('Network error during upload');
        setError('Network error. Please check your internet connection and try again.');
        setIsUploading(false);
        setUploadStage('idle');
      };
      
      // Send the request
      xhr.send(formData);
    } catch (err) {
      console.error('Error during upload:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsUploading(false);
      setUploadStage('idle');
    }
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

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="teacher-image-upload"
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
            isUploading 
              ? 'border-blue-500 bg-blue-500/10' 
              : error 
                ? 'border-red-500 bg-red-500/10' 
                : 'border-gray-700 bg-dark-card hover:bg-dark-cardHover hover:border-blue-500/50'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="relative w-full h-full group">
              <img
                src={previewUrl}
                alt="Teacher preview"
                className="w-full h-full object-contain p-2 rounded-lg transition-all duration-300 group-hover:scale-105"
              />
              {!isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-lg">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-3 py-1.5 rounded-lg text-sm">
                    Click to change image
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className={`w-10 h-10 mb-4 ${error ? 'text-red-400' : 'text-gray-400'}`}
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
              <p className="mb-2 text-sm text-gray-300">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP or GIF (max 5MB)</p>
            </div>
          )}
          <input
            id="teacher-image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {isUploading && (
        <div className="space-y-2 animate-fadeIn">
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm animate-slideUp">
          <p className="font-medium mb-1">Error:</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 