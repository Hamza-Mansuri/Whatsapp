import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

/**
 * Uploads a file buffer to Cloudinary using a stream.
 * @param {Buffer} fileBuffer - The memory buffer from multer.
 * @param {String} folder - The destination folder in Cloudinary.
 * @param {String} resourceType - 'image', 'video', 'raw', or 'auto'.
 * @returns {Promise<Object>} The Cloudinary response object.
 */
export const uploadToCloudinary = (fileBuffer, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary by its public ID.
 * @param {String} publicId - The Cloudinary public ID.
 * @param {String} resourceType - 'image', 'video', etc.
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = (publicId, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error('Cloudinary destroy error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};
