import User from "../models/user.model.js";
import File from "../models/file.model.js";
import Folder from "../models/folder.model.js";
import Permission from "../models/permission.model.js";
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'

// Get Profile
// GET /api/user/profile
const getProfile = async(req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
        if(!user){
            return next(createError(404, 'User not found'))
        }
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                storageUsed: user.storageUsed,
                quota: user.quota,
                createdAt: user.createdAt
            }
        })
    } catch (error) {
        next(error)
    }
}

// Update Profile
// PUT /api/user/profile

const updateProfile = async(req, res, next) => {
    try {
        const { name, avatar } = req.body
        if(!name){
            return next(createError(400, 'Please provide a name'))
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, avatar },
            { new: true, runValidators: true }
        )

        logger.info(`Profile updated for user ${user.email}`)

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan
            }
        })
    } catch (error) {
        next(error)
    }
}

// Change Password
// PUT /api/user/change-password

const changePassword = async(req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        if(!currentPassword || !newPassword){
            return next(createError(400, 'Please provide current and new password'))
        }

        if(newPassword.length < 6){
            return next(createError(400, 'New password must be at least 6 characters'))
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password')

        // Check current password
        const isMatch = await user.comparePassword(currentPassword)
        if(!isMatch){
            return next(createError(401, 'Current password is incorrect'))
        }

        // Update password
        // pre save hook will hash it automatically
        user.password = newPassword
        await user.save()

        logger.info(`Password changed for ${user.email}`)

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (error) {
        next(error)
    }
} 

// Get Storage Usage
// GET /api/user/storage

const getStorageUsage = async(req, res, next) => {
    try {
        const userId = req.user._id

        // Check Redis cache
        const cacheKey = `storage:${userId}`
        const cachedStorage = await redis.get(cacheKey)

        if(cachedStorage){
            return res.status(200).json({
                success: true,
                storage: JSON.parse(cachedStorage),
                fromCache:true
            })
        }

        const user = await User.findById(userId)

        // Get file count
        const permissions = await Permission.find({
            userId,
            role: 'owner'
        })

        const resourceIds = permissions.map(p => p.resourceId)
        const fileCount = await File.countDocuments({
            _id: { $in: resourceIds },
            isDeleted: false
        })

        const folderCount = await Folder.countDocuments({
            _id: { $in: resourceIds },
            isDeleted: false
        })

        const storage = {
            used: user.storageUsed,
            quota: user.quota,
            available: user.quota - user.storageUsed,
            usedPercentage: Math.round((user.storageUsed / user.quota) * 100),
            fileCount,
            folderCount
        }

        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(storage))

        res.status(200).json({
            success: true,
            storage
        })

    } catch (error) {
        next(error)
    }
}

// Get Recent Files 
// GET /api/user/recent

const getRecentFiles = async(req, res, next) => {
    try {
        const userId = req.user._id
        // Get all permissions for this user
        const permissions = await Permission.find({ userId })
        const resourceIds = permissions.map(p => p.resourceId)

        // Get 10 most recently updated files
        const recentFiles = await File.find({
            _id: { $in: resourceIds },
            isDeleted: false
        })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('ownerId', 'name email avatar')

        res.status(200).json({
            success: true,
            count: recentFiles.length,
            files: recentFiles
        })
    } catch (error) {
        next(error)
    }
}

// Get Starred Files
// GET /api/user/starred

const getStarredFiles = async(req, res, next) => {
    try {
        const userId = req.user._id
        const permissions = await Permission.find({ userId })
        const resourceIds = permissions.map(p => p.resourceId)

        const starredFiles = await File.find({
            _id: { $in: resourceIds },
            isStarred: true,
            isDeleted: false
        }).populate('ownerId', 'name email avatar')

        const starredFolders = await Folder.find({
            _id: { $in: resourceIds },
            isStarred: true,
            isDeleted: false
        })

        res.status(200).json({
            success: true,
            starredFiles,
            starredFolders
        })
    } catch (error) {
        next(error)
    }
}

export {
    getProfile,
    updateProfile,
    changePassword,
    getStorageUsage,
    getRecentFiles,
    getStarredFiles
}