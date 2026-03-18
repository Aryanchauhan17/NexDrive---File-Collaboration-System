import express from 'express'
import {
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
  renameFile,
  starFile,
  getTrash,
  restoreFile
} from '../controllers/file.controller.js'
import protect from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/rbac.middleware.js'
import { uploadSingle } from '../middleware/upload.middleware.js'

const router = express.Router()

// All routes require authentication
// protect middleware runs on every route

// File CRUD 

// Upload file
router.post('/upload', protect, uploadSingle, uploadFile)

//get all files
router.get('/', protect, getFiles)

//Get trash
router.get('/trash', protect, getTrash)

//Get single file
router.get('/:id', protect, checkPermission(['owner', 'editor', 'viewer']), getFile)

// Rename file — only owner and editor
router.put('/:id', protect, checkPermission(['owner', 'editor']), renameFile)

// Star file — only owner
router.put('/:id/star', protect, checkPermission(['owner', 'editor']), starFile)

//delete file - only owner
router.delete('/:id',protect, checkPermission(['owner']), deleteFile)

// Restore file from trash — only owner
router.put('/:id/restore', protect, checkPermission(['owner']), restoreFile)

export default router
