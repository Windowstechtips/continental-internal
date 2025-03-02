# Teacher Image Uploader

This component allows you to upload teacher profile images directly to Cloudinary and store the image URL in the Supabase database.

## Features

- Upload images directly to Cloudinary with progress tracking
- Store image URLs in the `picture_id` field of the `teachers_content` table
- Drag and drop support
- Image preview
- Detailed error handling and loading states
- Automatic image validation (file type and size)

## Usage

The `TeacherImageUploader` component is integrated into the `TeachersEditor` component in the Site Editor. When adding or editing a teacher, you can:

1. Click on the upload area or drag and drop an image
2. The image will be uploaded to Cloudinary in the `teacherimages` folder
3. Once the upload is complete, the Cloudinary URL will be automatically stored in the `picture_id` field
4. The image will be displayed in the teacher card in the Site Editor

## Implementation Details

### Component Props

```typescript
interface TeacherImageUploaderProps {
  onImageUploaded: (imageUrl: string, publicId: string) => void;
  initialImageUrl?: string;
}
```

- `onImageUploaded`: Callback function that receives the Cloudinary image URL and public ID
- `initialImageUrl`: Optional URL of an existing image to display (for editing teachers)

### Cloudinary Configuration

The component uses the same Cloudinary configuration as the Gallery Image Uploader:

- Cloud Name: Defined in `cloudinaryConfig.ts`
- Upload Preset: `store_images`
- Folder: `teacherimages`

### Image Validation

- Supported file types: JPEG, PNG, WEBP, GIF
- Maximum file size: 5MB

## Integration with Supabase

The image URL is stored in the `picture_id` field of the `teachers_content` table. This allows the teacher profile images to be displayed on the website.

## Error Handling

The component includes comprehensive error handling for:
- Invalid file types
- File size limits
- Network errors
- Cloudinary API errors

## Styling

The component uses the same styling as the rest of the application, with:
- Drag and drop area with visual feedback
- Progress bar during upload
- Error messages with detailed information
- Responsive design that works on all screen sizes

## Future Improvements

Potential future improvements could include:
- Image cropping functionality
- Multiple image upload for teacher galleries
- Image optimization options
- Direct integration with device cameras for mobile uploads 