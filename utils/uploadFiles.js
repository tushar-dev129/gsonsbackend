const cloudinary = require('./cloudinary')

const CourseUpload = (fileBuffer) => {
  console.log('Uploading course video...');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'courses',
        resource_type: 'video', // Ensures Cloudinary handles video format
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Upload successful:', result.secure_url);
          resolve(result);
        }
      }
    );

    // Send the buffer data to the upload stream
    stream.end(fileBuffer);
  });
};

const QuestionUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "questions",
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

const deleteVideos = async (publicId) => {
  console.log(publicId)
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video", // works for images, videos, and raw files
    });
    console.log("Deleted:", result);
    return result;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};
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

module.exports = { CourseUpload, QuestionUpload, deleteVideos, deleteImages, AvatarUpload, PostUpload }

