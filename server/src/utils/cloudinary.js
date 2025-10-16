const cloudinary = require('cloudinary').v2

function isCloudinaryEnabled() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
}

function configureCloudinary() {
  if (!isCloudinaryEnabled()) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function uploadImage(filePath) {
  if (!isCloudinaryEnabled()) throw new Error('Cloudinary not configured')
  const res = await cloudinary.uploader.upload(filePath, {
    folder: process.env.CLOUDINARY_FOLDER || 'healthylife/meals',
    resource_type: 'image',
  })
  return res.secure_url
}

module.exports = { configureCloudinary, uploadImage, isCloudinaryEnabled }
