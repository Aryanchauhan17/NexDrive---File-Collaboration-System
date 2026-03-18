// src/middleware/rbac.middleware.js

import Permission from '../models/permission.model.js'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'

// ── Check Permission ──────────────────────────────────
// roles = array of allowed roles
// e.g. checkPermission(['owner', 'editor'])
// e.g. checkPermission(['owner'])

const checkPermission = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id
      const resourceId = req.params.id

      if (!resourceId) {
        return next(createError(400, 'Resource ID is required'))
      }

      // ── Check Redis cache first ─────────────────────
      // Cache key: permission:userId:resourceId
      const cacheKey = `permission:${userId}:${resourceId}`
      const cachedRole = await redis.get(cacheKey)

      let role

      if (cachedRole) {
        // Permission found in cache — no DB query needed
        role = cachedRole
        logger.info(`Permission served from cache for user ${userId}`)
      } else {
        // ── Check database ──────────────────────────
        const permission = await Permission.findOne({
          userId,
          resourceId
        })

        if (!permission) {
          return next(createError(403, 'You do not have permission to access this resource'))
        }

        role = permission.role

        // ── Save to Redis cache ─────────────────────
        // Cache for 5 minutes (300 seconds)
        // So next request won't hit database
        await redis.setex(cacheKey, 300, role)
      }

      // ── Check if role is allowed ────────────────────
      if (!allowedRoles.includes(role)) {
        return next(createError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`))
      }

      // ── Attach role to request ──────────────────────
      req.userRole = role

      next()

    } catch (error) {
      next(error)
    }
  }
}

// ── Invalidate Permission Cache ───────────────────────
// Call this when permissions change
// e.g. when sharing or revoking access
const invalidatePermissionCache = async (userId, resourceId) => {
  const cacheKey = `permission:${userId}:${resourceId}`
  await redis.del(cacheKey)
}

export { checkPermission, invalidatePermissionCache }