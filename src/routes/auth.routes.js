import express from 'express'
import {
    register,
    login,
    logout,
    refreshToken
} from '../controllers/auth.controller.js'
import protect from '../middleware/auth.middleware.js'

const router = express.Router()

// Public Routes 
// No authentication required

// POST /api/auth/register
router.post('/register', register)

// POST /api/auth/login
router.post('/login', login)

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken)

// Protected Routes 
// Authentication required — protect middleware runs first

// POST /api/auth/logout
router.post('/logout', protect, logout)

export default router