import Folder from '../models/folder.model.js'
import File from '../models/file.model.js'
import Permission from '../models/permission.model.js'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'
import { json } from 'express'

// Create Folder 
// POST /api/folders

const createFolder = async(req, res, next) => {
    try {
        const { name, parentFolderId } = req.body

        if(!name){
            return next(createError(401, 'Please provide a folder name'))
        }
        // If parentFolderId provided check if it exists in the database
        if(parentFolderId){
            const parentFolder = await Folder.findById(parentFolderId)
            if(!parentFolder){
                return next(createError(404, 'Parent folder not found'))
            }
        }
        // Create folder
        const folder = await Folder.create({
            name,
            ownerId: req.user._id,
            parentFolderId: parentFolderId || null
        })
        // Create owner permission for this folder, only owner can create a folder
        await Permission.create({
            userId: req.user._id,
            resourceId: folder._id,
            resourceType: 'folder',
            role: 'owner'
        })

        // Invalidate folders cache
        await redis.del(`folders:${req.user._id}`)

        logger.info(`Folder created: ${name} by ${req.user.email}`)

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            folder
        })

    } catch (error) {
        next(error)
    }
}

// Get All Folders 
// GET /api/folders
const getFolders = async(req, res, next) => {
    try {
        const userId = req.user._id
        const { parentFolderId } = req.query

        // Check Redis cache, temporary disable
        // const cacheKey = `folders:${userId}:${parentFolderId || 'root'}`
        // const cachedFolders = await redis.get(cacheKey)

        // //if folders, are there in the cache, just directly return it
        // if(cachedFolders){
        //     return res.status(200).json({
        //         success: true,
        //         folders: JSON.parse(cachedFolders),
        //         fromCache: true
        //     })
        // }

        // Get all permissions for this user
        const permissions = await Permission.find({ userId })
        const resourceIds = permissions.map(p => p.resourceId)

        //get folders based on permissions
        const folders = await Folder.find({
            _id: { $in: resourceIds },
            isDeleted: false,
            parentFolderId: parentFolderId || null
        }).populate('ownerId', 'name email avatar')

        //cache for 5 minutes, temporary disable
        //await redis.setex(cacheKey, 300, JSON.stringify(folders))

        const foldersWithRole = folders.map(folder => {
            const perm = permissions.find(p => p.resourceId.toString() === folder._id.toString())
            return {
                ...folder.toObject(),
                role: perm ? perm.role : 'viewer'
            }
        })

        res.status(200).json({
            success: true,
            count: foldersWithRole.length,
            folders: foldersWithRole
        })

    } catch (error) {
        next(error)
    }
}

// Get Single Folder 
// GET /api/folders/:id

const getFolder = async(req, res, next) => {
    try {
        const folder = await Folder.findById(req.params.id).populate('ownerId', 'name email avatar')
        if(!folder || folder.isDeleted){
            return next(createError(404, 'File not found'))
        }
        // Get contents of folder i.e., files
        const files = await Folder.find({
            folderId: folder._id,
            isDeleted: false
        })

        const subFolders = await Folder.find({
            parentFolderId: folder._id,
            isDeleted: false
        })

        res.status(200).json({
            success: true,
            folder,
            contents: {
                folders: subFolders,
                files
            }
        })

    } catch (error) {
        next(error)
    }
}

// Rename Folder 
// PUT /api/folders/:id

const renameFolder = async(req, res, next) => {
    try {
        const { name } = req.body
        if(!name){
            return next(createError(400, 'Please provide a new name'))
        }
        //find the folder first
        const folder = await Folder.findById(req.params.id)

        if(!folder || folder.isDeleted){
            return next(createError(404, 'Folder not found'))
        }
        await Folder.updateOne( { _id: folder._id}, {name} )

        //invalidate cache
        await redis.del(`folders:${req.user._id}`)
        logger.info(`Folder renamed to ${name} by ${req.user.email}`)

        res.status(200).json({
            success: true,
            message: 'Folder renamed successfully'
        })
    } catch (error) {
        next(error)
    }
}

// Star Folder 
// PUT /api/folders/:id/star

const starFolder = async(req, res, next) => {
    try {
        const folder = await Folder.findById(req.params.id)
        if(!folder || folder.isDeleted){
            return next(createError(404, 'Folder not found'))
        }

        //update folder
        await folder.updateOne({ isStarred: !folder.isStarred })
        res.status(200).json({
            success: true,
            message: folder.isStarred ? 'Folder unstarred' : 'Folder starred'
        })

    } catch (error) {
        next(error)
    }
}

// Delete Folder 
// DELETE /api/folders/:id

const deleteFolder = async(req, res, next) => {
    try {
        const folder = await Folder.findById(req.params.id)
        if(!folder || folder.isDeleted){
            return next(createError(404, 'Folder not found'))
        }

        //soft delete the folder, deleting from the databases
        await Folder.updateOne(
            { _id: folder._id },
            { isDeleted: true, deletedAt: new Date() }
        )

        //soft delete all files inside folder, deleting from the databases
        await File.updateMany(
            { folderId: folder._id },
            { isDeleted: true, deletedAt: new Date() }
        )

        //Soft delete all subfolders, deleting from the databases
        await Folder.updateMany(
            { parentFolderId: folder._id },
            { isDeleted: true, deletedAt: new Date() }
        )

        // Invalidate cache
        await redis.del(`folders: ${req.user._id}`)

        logger.info(`Folder deleted ${folder.name} by ${req.user.email}`)

        res.status(200).json({
            success: true,
            message: 'Folder moved to trash'
        })

    } catch (error) {
        next(error)
    }
}

// Restore Folder
// PUT /api/folders/:id/restore

const restoreFolder = async(req, res, next) => {
    try {
        const folder = await Folder.findById(req.params.id)
        if(!folder ){
            return next(createError(404, 'Folder not found'))
        }
        // Restore folder
        await folder.updateOne({
            isDeleted: false,
            deletedAt: null
        })


        //Restore all files inside folder
        await File.updateMany(
            { folderId: folder._id },
            { isDeleted: false, deletedAt: null }
        )

        //Restore all subfolders 
        await Folder.updateMany(
            { parentFolderId: folder._id },
            { isDeleted: false, deletedAt: null }
        )

        // Invalidate cache
        await redis.del(`folders:${req.user._id}`)
        logger.info(`Folder restored ${folder.name} by ${req.user.email}`)

        res.status(200).json({
            success: true,
            message: 'Folder restored successfully'
        })
    } catch (error) {
        next(error)
    }
}

const getTrash = async (req, res, next) => {
  try {
    const userId = req.user._id
    const permissions = await Permission.find({
      userId,
      role: 'owner'
    })

    const resourceIds = permissions.map(p => p.resourceId)

    const trashedFolders = await Folder.find({
      _id: { $in: resourceIds },
      isDeleted: true
    })

    res.status(200).json({
      success: true,
      count: trashedFolders.length,
      folders: trashedFolders
    })

  } catch (error) {
    next(error)
  }
}

export {
    createFolder,
    getFolders,
    getFolder,
    renameFolder,
    starFolder,
    deleteFolder,
    restoreFolder,
    getTrash
}