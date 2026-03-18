import express from 'express'
import {
    createFolder,
    getFolders,
    getFolder,
    renameFolder,
    starFolder,
    deleteFolder,
    restoreFolder,
    getTrash
} from '../controllers/folder.controller.js'

import protect from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/rbac.middleware.js'

const router = express.Router()

// Create folder
router.post('/', protect, createFolder)

// Get all folders
router.get('/', protect, getFolders)

router.get('/trash', protect, getTrash)

// Get single folder with contents
router.get('/:id', protect, checkPermission(['owner', 'editor', 'viewer']), getFolder)

// Rename folder — owner and editor only
router.put('/:id', protect, checkPermission(['owner', 'editor']), renameFolder)

// Star folder — owner only
router.put('/:id/star', protect, checkPermission(['owner']), starFolder)

// Delete folder — owner only
router.delete('/:id', protect, checkPermission(['owner']), deleteFolder)

// Restore folder — owner only
router.put('/:id/restore', protect, checkPermission(['owner']), restoreFolder)

export default router
