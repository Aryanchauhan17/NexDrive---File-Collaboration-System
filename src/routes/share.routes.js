import express from 'express'
import {
  shareWithUser,
  changeRole,
  revokeAccess,
  getPermissions,
  generatePublicLink,
  accessPublicLink
} from '../controllers/share.controller.js'
import protect from '../middleware/auth.middleware.js'

const router = express.Router()

// Share file/folder with a user
router.post('/', protect, shareWithUser)

// Get all permissions for a resource
router.get('/:id', protect, getPermissions)

// Change role of a permission
router.put('/:id', protect, changeRole)

// Revoke access
router.delete('/:id', protect, revokeAccess)

// Generate public link
router.post('/link', protect, generatePublicLink)

// Access via public link — no auth needed
// Anyone with the link can access
router.get('/link/:token', accessPublicLink)

export default router