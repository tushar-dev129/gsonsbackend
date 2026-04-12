const cloudinary = require('./cloudinary')





const deleteImages = async (publicId) => {
  console.log(publicId)
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image", // works for images, videos, and raw files
    });
    console.log("Deleted:", result);
    return result;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};

const AvatarUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

const PostUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "posts",
        resource_type: "image",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

const CategoryUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "categories",
        resource_type: "image",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};


const BulkUpload = async (files, folder) => {
  const uploadedFiles = [];
  for (const file of files) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "image",
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      stream.end(file.buffer);
    });
    uploadedFiles.push({
      url: result.secure_url,
      publicUrl: result.public_id,
      originalName: file.name
    });
  }
  return uploadedFiles;
};

const GalleryUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "gallery",
        resource_type: "image",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

const DynamicCategoryUpload = (fileBuffer, folderName, originalName) => {
  return new Promise((resolve, reject) => {
    // Generate a timestamp
    const timestamp = Date.now();
    let publicId = undefined;

    if (originalName) {
      // Remove extension from originalName, e.g. "image.png" -> "image"
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      // Sanitize name: remove spaces, special chars
      const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9_\-]/g, '_');
      publicId = `${sanitizedName}_${timestamp}`;
    } else {
      publicId = `upload_${timestamp}`;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: "auto",
        public_id: publicId,
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { deleteImages, AvatarUpload, PostUpload, BulkUpload, CategoryUpload, GalleryUpload, DynamicCategoryUpload }
