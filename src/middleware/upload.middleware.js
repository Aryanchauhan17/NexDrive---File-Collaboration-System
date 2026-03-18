import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'
import createError from '../utils/createError.js'
// Cloudinary Storage 
// This tells multer to upload files directly to Cloudinary
// instead of saving them locally on the server

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async(req, file) => {
        // Determine folder in Cloudinary based on file type
        let folder = 'nexdrive/files'

        if(file.mimetype.startsWith('image/')){
            folder = 'nexdrive/images'
        }else if(file.mimetype.startsWith('video/')){
            folder = 'nexdrive/videos'
        }else if(file.mimetype === 'application/pdf'){
            folder = 'nexdrive/pdfs'
        }

        return {
            folder: folder,
            //keep original file name
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
            //allow all resources type
            resource_type: 'auto'
        }
    }
})

// File Filter 
// Allowed file types

const allowedMimeTypes = [
    // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  // Text
  'text/plain',
  'text/csv'
]

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true)
  } else {
    // Reject file
    cb(createError(400, `File type ${file.mimetype} is not allowed`), false)
  }
}

// Multer Config
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        // Max file size — 100MB
        fileSize: 100 * 1024 * 1024
    }
})

// Export upload handlers 

// For uploading a single file
// Usage: router.post('/upload', protect, uploadSingle, controller)

const uploadSingle = upload.single('file')

// For uploading multiple files at once (max 10)
const uploadMultiple = upload.array('files', 10)

export { uploadSingle, uploadMultiple }