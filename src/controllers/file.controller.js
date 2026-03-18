//This file handles all file operations — upload, download, get files, delete, rename, star, and 
// version history.

import File from '../models/file.model.js'
import Folder from '../models/folder.model.js'
import Permission from '../models/permission.model.js'
import cloudinary from '../config/cloudinary.js'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'

// Upload File 
// POST /api/files/upload

const uploadFile = async(req, res, next) => {
    try {
        //req.file is attached by multer middleware
        if(!req.file){
            return next(createError(400, 'No file uploaded'))
        }

        const { folderId } = req.body
        // If folderId provided, check if folder exists
        if(folderId){
            const folder = await Folder.findById(folderId)
            if(!folder){
                return next(createError(404, 'Folder not found'))
            }
        }

        // Check storage quota
        const fileSize = req.file.size
        const user = req.user

        if(user.storageUsed + fileSize > user.quota){
            return next(createError(400, 'Storage quota exceeded'))
        }
        //if storage is there, store the file's metadata to mongoDB
        const file = await File.create({
            name: req.file.originalname,
            type: req.file.mimetype,
            size: fileSize,
            url: req.file.path,
            cloudinaryId: req.file.filename,
            ownerId: user._id,
            folderId: folderId || null
        })

        // Create owner permission
        await Permission.create({
            userId: user._id,
            resourceId: file._id,
            resourceType: 'file',
            role: 'owner'
        })

        // Update user storage used
        await user.updateOne({
            storageUsed: user.storageUsed + fileSize
        })

        // Invalidate files cache
        await redis.del(`files:${user._id}`)
        await redis.del(`storage:${user._id}`)

        logger.info(`File uploaded: ${file.name} by ${user.email}`)
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file
        })

    } catch (error) {
        next(error)
    }
}

// Get All Files
// GET /api/files

const getFiles = async(req, res, next) => {
    try {
        const userId = req.user._id
        const { folderId } = req.query

        // Get all permissions for this user
        const permissions = await Permission.find({ userId })
        const resourceIds = permissions.map(p => p.resourceId)

        // Get files based on permissions
        const files = await File.find({
            _id: { $in: resourceIds },
            isDeleted: false,
            folderId: folderId || null
        }).populate('ownerId', 'name email avatar')

        // Attach role to each file from permissions
        const filesWithRole = files.map(file => {
            const perm = permissions.find(p => p.resourceId.toString() === file._id.toString())
            return {
                ...file.toObject(),
                role: perm ? perm.role : 'viewer'
            }
        })

        res.status(200).json({
            success: true,
            count: filesWithRole.length,
            files: filesWithRole
        })
    } catch (error) {
        next(error)
    }
}

// Get Single File
// GET /api/files/:id

const getFile = async(req, res, next) => {
    try {
        const file = await File.findById(req.params.id).populate('ownerId', 'name email avatar')
        if(!file || file.isDeleted){
            return next(createError(404, 'File not found'))
        }
        res.status(200).json({
            success: true,
            file
        })

    } catch (error) {
        next(error)
    }
}

//  Delete File
// DELETE /api/files/:id

const deleteFile = async(req, res, next) => {
    try {
        const file = await File.findById(req.params.id)
        if(!file || file.isDeleted){
            return next(createError(404, 'file not found'))
        }
        // Soft delete — move to trash
        await file.updateOne({
            isDeleted: true,
            deletedAt: new Date()
        })

        //update user storage
        await req.user.updateOne({
            storageUsed: req.user.storageUsed - file.size
        })
        //invalidate cache
        logger.info(`File deleted: ${file.name} by ${req.user.email}`)
        await redis.del(`files:${req.user._id}`)
        await redis.del(`storage:${req.user._id}`)

        return res.status(200).json({
            success: true,
            message: 'File moved to trash'
        })

    } catch (error) {
        next(error)
    }
}

// Rename File
// PUT /api/files/:id

const renameFile = async(req, res, next) => {
    try {
        const { name } = req.body
        if(!name){
            return next(createError(400, 'Please provide a new name'))
        }
        //find the file to be renamed
        const file = await File.findById(req.params.id)

        if(!file || file.isDeleted){
            return next(createError(401, 'File not found'))
        }

        await file.updateOne({ name })

        // Invalidate cache
        await redis.del(`files:${req.user._id}`)

        logger.info(`File renamed to ${name} by ${req.user.email}`)

        return res.status(200).json({
            success: true,
            message: 'File renamed successfully'
        })
    } catch (error) {
        next(error)
    }
}

// Star File
// PUT /api/files/:id/star

const starFile = async(req, res, next) => {
    try {
        const file = await File.findById(req.params.id)
        if(!file || file.isDeleted){
            return next(createError(404, 'File not found'))
        }

        await file.updateOne({ isStarred: !file.isStarred })

        res.status(200).json({
            success: true,
            message: file.isStarred? 'File is unstarred': 'File is starred'
        })
    } catch (error) {
        next(error)
    }
}

// Get Trash
// GET /api/files/trash

const getTrash = async(req, res, next) => {
    try {
        const userId = req.user._id
        const permissions = await Permission.find({
        userId,
        role: 'owner'
    })

        const resourceIds = permissions.map(p => p.resourceId)

        const trashedFiles = await File.find({
        _id: { $in: resourceIds },
        isDeleted: true
        })

        res.status(200).json({
            success: true,
            count: trashedFiles.length,
            files: trashedFiles
        })

    } catch (error) {
        next(error)
    }
}

// Restore File 
// PUT /api/files/:id/restore

const restoreFile = async(req, res, next) => {
    try {
        const file = await File.findById(req.params.id)

        if(!file){
            return next(createError(404, 'File not found'))
        }

        await file.updateOne({
            isDeleted: false,
            deletedAt: null
        })

        //update storage
        await req.user.updateOne({
            storageUsed: req.user.storageUsed + file.size
        })

        logger.info(`File restored ${file.name} by ${req.user.email}`)
        return res.status(200).json({
            success: true,
            message: 'File restored successfully'
        })
    } catch (error) {
        next(error)
    }
}

export {
    uploadFile,
    getFiles,
    getFile,
    deleteFile,
    renameFile,
    starFile,
    getTrash,
    restoreFile
}
