import express from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  getStorageUsage,
  getRecentFiles,
  getStarredFiles
} from '../controllers/user.controller.js'
import protect from '../middleware/auth.middleware.js'

const router = express.Router()

// GET /api/user/profile
router.get('/profile', protect, getProfile)

// PUT /api/user/profile
router.put('/profile', protect, updateProfile)

// PUT /api/user/change-password
router.put('/change-password', protect, changePassword)

// GET /api/user/storage
router.get('/storage', protect, getStorageUsage)

// GET /api/user/recent
router.get('/recent', protect, getRecentFiles)

// GET /api/user/starred
router.get('/starred', protect, getStarredFiles)

export default router