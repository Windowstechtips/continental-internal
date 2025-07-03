# Cloudinary Setup Guide

To enable image uploads in the Presentation Editor, you need to configure Cloudinary properly. Here's a step-by-step guide:

## 1. Create a Cloudinary Account

If you don't already have one:
1. Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account
2. Verify your email address

## 2. Get Your Cloud Name

1. Log in to your Cloudinary dashboard
2. Note your **Cloud Name** (visible at the top of your dashboard)
3. Make sure it matches the `cloudName` value in `src/lib/cloudinaryConfig.ts`

## 3. Set Up an Upload Preset

For security reasons, client-side uploads need an unsigned upload preset:

1. In your Cloudinary dashboard, go to **Settings** > **Upload** tab
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Set the following:
   - **Preset name**: `ml_default` (or create a custom name and update it in the code)
   - **Signing Mode**: Set to **Unsigned**
   - **Folder**: Optional - set a specific folder for your uploads
   - **Access Mode**: Set to **Public**

5. Save the preset

## 4. CORS Configuration

Make sure CORS is properly configured:

1. In your Cloudinary dashboard, go to **Settings** > **Security** tab
2. Scroll down to **CORS allowed origins**
3. Add your website domain (or `*` for development)
4. Save the changes

## 5. Testing

After setting up the upload preset:
1. Try uploading an image through the Presentation Editor
2. Check your browser's console for any error messages
3. Verify that the image appears in your Cloudinary Media Library

## Troubleshooting

If uploads are still failing:

1. Check that the upload preset name in the code matches exactly what's in your Cloudinary dashboard
2. Verify that your upload preset is set to "unsigned" mode
3. Make sure your Cloudinary plan has sufficient monthly credits/transformations
4. Try a smaller image file to rule out file size limits

## Additional Resources

- [Cloudinary Upload API Documentation](https://cloudinary.com/documentation/image_upload_api_reference)
- [Unsigned Upload Documentation](https://cloudinary.com/documentation/upload_images#unsigned_upload) 