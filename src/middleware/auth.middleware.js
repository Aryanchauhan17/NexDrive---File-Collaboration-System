// src/middleware/auth.middleware.js

import { verifyAccessToken } from '../utils/jwt.js'
import User from '../models/user.model.js'
// import RefreshToken from '../models/refreshToken.model.js'
// import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'

const protect = async (req, res, next) => {
  try {
    let accessToken

    // ── Get token from Authorization header ───────────
    // Frontend sends token like: "Bearer eyJhbGc..."
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      accessToken = req.headers.authorization.split(' ')[1]
    }

    // No token provided
    if (!accessToken) {
      return next(createError(401, 'Please login to access this resource'))
    }

    // ── Check if token is blacklisted ─────────────────
    // When user logs out we blacklist their token in Redis
    const isBlacklisted = await redis.get(`blacklist:${accessToken}`)
    if (isBlacklisted) {
      return next(createError(401, 'Token is no longer valid, please login again'))
    }

    // ── Verify access token ───────────────────────────
    const decoded = verifyAccessToken(accessToken)

    if (!decoded) {
      return next(createError(401, 'Invalid or expired token'))
    }

    // ── Get user from database ────────────────────────
    const user = await User.findById(decoded.userId)

    if (!user) {
      return next(createError(401, 'User no longer exists'))
    }

    // ── Attach user to request ────────────────────────
    // Now all controllers can access req.user
    req.user = user

    logger.info(`User ${user.email} authenticated successfully`)

    next()

  } catch (error) {
    next(error)
  }
}

export default protect