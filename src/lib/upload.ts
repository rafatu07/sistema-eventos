import cloudinary from './cloudinary';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
}

export const uploadPDFToCloudinary = async (
  pdfBuffer: Buffer,
  fileName: string,
  folder: string = 'certificates'
): Promise<UploadResult> => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
      {
        resource_type: 'raw',
        folder: folder,
        public_id: fileName,
        format: 'pdf',
        access_mode: 'public',
        type: 'upload',
      }
    );

    // Usar URL retornada pelo Cloudinary diretamente
    return {
      publicId: result.public_id,
      url: result.secure_url,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error('Error uploading PDF to Cloudinary:', error);
    throw new Error('Failed to upload PDF to Cloudinary');
  }
};

export const uploadImageToCloudinary = async (
  imageBuffer: Buffer,
  fileName: string,
  folder: string = 'certificates'
): Promise<UploadResult> => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBuffer.toString('base64')}`,
      {
        resource_type: 'image',
        folder: folder,
        public_id: fileName,
        format: 'png',
        access_mode: 'public',
        type: 'upload',
        quality: 'auto:best',
        fetch_format: 'auto',
      }
    );

    return {
      publicId: result.public_id,
      url: result.secure_url,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

export const deletePDFFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
  } catch (error) {
    console.error('Error deleting PDF from Cloudinary:', error);
    throw new Error('Failed to delete PDF from Cloudinary');
  }
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

