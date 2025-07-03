export const cloudinaryConfig = {
  cloudName: 'dhvyx76fy',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
  apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || ''
};

interface CloudinaryResponse {
  secure_url: string;
  file_type: string;
  public_id?: string;
}

/**
 * Uploads a file (image or presentation) to Cloudinary using an unsigned upload
 * @param file The file to upload
 * @returns Promise with the Cloudinary response and file type
 */
export const uploadImage = async (file: File): Promise<CloudinaryResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    // Using ml_default which is the default unsigned upload preset in Cloudinary
    formData.append('upload_preset', 'ml_default'); 
    formData.append('cloud_name', cloudinaryConfig.cloudName);

    // Determine file type
    const fileType = getFileType(file);
    
    // For all files, try uploading as image resource type first
    console.log(`Uploading ${fileType} file to Cloudinary:`, cloudinaryConfig.cloudName);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary image upload error:', response.status, errorText);
        throw new Error(`Image upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      return { 
        secure_url: result.secure_url, 
        file_type: fileType,
        public_id: result.public_id
      };
    } catch (imageError) {
      // Only for PowerPoint files, try raw upload as fallback
      if (fileType === 'ppt') {
        console.error('Image upload method failed for PowerPoint, trying raw upload:', imageError);
        
        const rawResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/raw/upload`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (!rawResponse.ok) {
          const errorText = await rawResponse.text();
          console.error('Cloudinary raw upload error:', rawResponse.status, errorText);
          throw new Error(`Raw upload failed: ${rawResponse.statusText}`);
        }

        const rawResult = await rawResponse.json();
        console.log('PowerPoint raw upload successful:', rawResult);
        
        return { 
          secure_url: rawResult.secure_url, 
          file_type: 'ppt',
          public_id: rawResult.public_id
        };
      }
      
      // For other file types, just propagate the error
      throw imageError;
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Determine the file type based on extension
 * @param file The file to check
 * @returns string representing the file type ('image' or 'ppt')
 */
function getFileType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Check if file is a PowerPoint file
  if (['ppt', 'pptx'].includes(extension)) {
    return 'ppt';
  }
  
  // Default to image
  return 'image';
} 