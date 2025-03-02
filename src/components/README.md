# Image Gallery System

This gallery system allows you to upload images to Cloudinary and store their metadata in Supabase for easy retrieval and management.

## Features

- Upload images directly to Cloudinary with progress tracking
- Store image metadata in Supabase database
- Tag images for better organization and searchability
- Edit tags after upload with an intuitive interface
- Tag suggestions based on existing tags in the database
- Two-step upload process allowing time to add tags before saving
- Search images by tags
- Responsive grid layout with hover effects
- Detailed loading states and error handling
- Complete image deletion (removes from both Cloudinary and Supabase)

## Setup Instructions

### 1. Cloudinary Setup

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Create an upload preset named `store_images` with the following settings:
   - Folder: `galleryimages` (or leave blank and specify the folder during upload)
   - Signing Mode: Unsigned
   - Access Mode: Public

3. Add your Cloudinary credentials to your environment variables:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_API_KEY=your_api_key
   VITE_CLOUDINARY_API_SECRET=your_api_secret
   ```

   **Important**: The API secret is required for image deletion functionality.

### 2. Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL script in `src/db/gallery_images.sql` to create the necessary table and policies
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of the SQL file
   - Run the script

4. Add your Supabase credentials to your environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Row Level Security (RLS) Configuration

This gallery system works with or without Row Level Security:

#### Option A: With RLS Disabled (Simpler Setup)
1. In your Supabase dashboard, go to Authentication > Policies
2. For the `gallery_images` table, ensure RLS is turned off
3. This allows direct access to the table without authentication

#### Option B: With RLS Enabled (More Secure)
1. In your Supabase dashboard, go to Authentication > Policies
2. For the `gallery_images` table, ensure RLS is turned on
3. Add the policies from the SQL script to control access
4. Set up authentication as described in the next section

### 4. Authentication Setup (Only if using RLS)

For the gallery to work properly with authenticated access, you need to set up authentication in Supabase:

1. Go to Authentication > Settings in your Supabase dashboard
2. Enable Email auth provider
3. Create a service account user if needed:
   - Go to Authentication > Users
   - Click "Add User"
   - Enter the email and password
4. Add these credentials to your environment variables:
   ```
   VITE_SUPABASE_SERVICE_EMAIL=your_service_account_email
   VITE_SUPABASE_SERVICE_PASSWORD=your_service_account_password
   ```

## How It Works

### Image Upload Process

1. User selects an image file through the uploader component
2. The file is validated for type and size
3. A preview is shown to the user
4. The image is uploaded to Cloudinary with progress tracking
5. After upload completes, the user is presented with a form to add or edit tags
   - Tag suggestions appear as the user types, based on existing tags in the database
   - The user can select from suggestions or enter new tags
6. When the user clicks "Save Image", the metadata (URL, public ID, tags, upload date) is stored in Supabase
7. The gallery is refreshed to show the new image

### Image Retrieval Process

1. When the gallery component loads, it fetches image metadata from Supabase
2. Images are displayed in a responsive grid with the newest images first
3. Users can search for images by tag
4. Hovering over an image shows its tags and upload date
5. Users can click on a tag to filter the gallery by that tag

### Tag Editing Process

1. When a user clicks the pencil icon on an image, a modal opens
2. The current tags are displayed in a comma-separated format
3. The user can edit, add, or remove tags
4. When saved, the tags are updated in the Supabase database
5. The gallery is refreshed to show the updated tags

### Tag Suggestion Process

1. As the user types in the tag input field, the system searches for matching tags
2. Suggestions are shown in a dropdown below the input field
3. The user can click on a suggestion to add it to their tags
4. Suggestions are based on all existing tags in the database
5. Only tags that match the current input text are shown
6. Already selected tags are excluded from suggestions

### Image Deletion Process

1. When a user clicks the delete button on an image, a confirmation dialog appears
2. If confirmed, the system:
   - Generates a secure signature for Cloudinary API authentication
   - Sends a deletion request to Cloudinary to remove the actual image file
   - Deletes the image metadata from the Supabase database
   - Updates the gallery view to reflect the changes
3. The delete operation is atomic - if either step fails, appropriate error handling is in place

## Components

### MainGallery

The main component that displays the gallery and handles image management.

```jsx
import MainGallery from './components/MainGallery';

function App() {
  return (
    <div className="App">
      <MainGallery />
    </div>
  );
}
```

### GalleryImageUploader

Component for uploading images to Cloudinary and storing metadata in Supabase.

```jsx
import GalleryImageUploader from './components/GalleryImageUploader';

function UploadPage() {
  const handleImageUploaded = () => {
    console.log('Image uploaded successfully!');
  };

  return (
    <div>
      <h1>Upload Image</h1>
      <GalleryImageUploader onImageUploaded={handleImageUploaded} />
    </div>
  );
}
```

## Troubleshooting

### Authentication Issues

If you encounter 401 (Unauthorized) errors:

1. Check if RLS is enabled in your Supabase project:
   - If RLS is disabled, you don't need authentication credentials
   - If RLS is enabled, ensure your service account credentials are correct
2. Verify that the RLS policies are set up properly in your Supabase database
3. If using anonymous access, make sure the appropriate policies are enabled

### Upload Issues

If images fail to upload:

1. Check that your Cloudinary credentials are correct
2. Verify that the upload preset exists and is configured correctly
3. Check the browser console for detailed error messages
4. Ensure your internet connection is stable
5. If the upload completes but saving fails, check your Supabase connection

### Tag Editing and Suggestion Issues

If tag editing or suggestions fail:

1. Check the browser console for detailed error messages
2. Verify that your Supabase connection is working
3. Ensure the table has the correct structure with a 'tags' column of type TEXT[]
4. If using RLS, verify that your policies allow UPDATE operations
5. If tag suggestions aren't appearing, check that you have existing tags in the database

### Deletion Issues

If image deletion fails:

1. Verify that your Cloudinary API key and secret are correctly set in the environment variables
2. Check that the public_id stored in Supabase matches the actual public_id in Cloudinary
3. Ensure your application has the necessary permissions to delete resources in Cloudinary
4. Check the browser console for detailed error messages

### Database Issues

If you encounter database errors:

1. Ensure the `gallery_images` table exists in your Supabase database
2. Check that the table structure matches the expected schema
3. Verify that the RLS policies allow the operations you're trying to perform
4. Make sure the uuid-ossp extension is enabled in your Supabase project

## Performance Considerations

- The gallery uses pagination and efficient queries to handle large collections of images
- Indexes are created on frequently queried fields for better performance
- Images are lazy-loaded to improve initial page load time
- Tag suggestions are limited to 5 items to prevent overwhelming the UI
- Consider implementing a cleanup strategy for unused Cloudinary images if needed

## Security Considerations

- The Cloudinary API secret is used server-side only for deletion operations
- Signatures for Cloudinary API calls are generated securely using SHA-1
- Supabase Row Level Security (RLS) policies control access to image metadata
- User confirmation is required before permanent deletion
- Input validation is performed on all user inputs

## License

This project is licensed under the MIT License. 