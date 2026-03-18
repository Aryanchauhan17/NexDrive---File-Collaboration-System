import Permission from "../models/permission.model.js";
import File from "../models/file.model.js"
import Folder from "../models/folder.model.js"
import ShareLink from "../models/shareLink.model.js"
import User from "../models/user.model.js";
import { invalidatePermissionCache } from "../middleware/rbac.middleware.js";
import redis from "../config/redis.js";
import logger from "../utils/logger.js";
import createError from "../utils/createError.js";
import crypto from 'crypto'
import { type } from "os";

// Share With User 
// POST /api/share
//Sharing = creating a Permission document that links a User to a File/Folder with a specific Role.
//Sharing does not copy the file. It just creates a Permission document in MongoDB that says:
//"User B has EDITOR access to File X"
//That's it. One new document in the permissions collection.
// ## Two Scenarios This Handles
// ```
// // Scenario 1 — First time sharing
// // ─────────────────────────────────
// // No existing permission found
// // → Create new permission document
// // → User B gets access for first time

// // Scenario 2 — Already shared, changing role
// // ───────────────────────────────────────────
// // Existing permission found (viewer)
// // → Update role to editor
// // → No duplicate created
// // → User B's access upgraded
const shareWithUser = async(req, res, next) => {
    try {
        const { email, resourceId, resourceType, role } = req.body
        if(!email || !resourceId || !resourceType || !role){
            return next(createError(400, 'Please provide email, resourceId, resourceType and role'))
        }

        if(!['viewer', 'editor'].includes(role)){
            return next(createError(400, 'Role must be viewer or editor'))
        }
        if(!['file', 'folder'].includes(resourceType)){
            return next(createError(400, 'Resource type should be file or folder'))
        }

        const userToShare = await User.findOne({ email })
        if(!userToShare){
            return next(createError(404, 'User not found'))
        }

        if(userToShare._id.toString() === req.user._id.toString()){
            return next(createError(400, 'You cannot share with yourself'))
        }

        let resource
        if(resourceType === 'file'){
            resource = await File.findById(resourceId)
        } else {
            resource = await Folder.findById(resourceId)
        }

        if(!resource){
            return next(createError(404, `${resourceType} not found`))
        }

        // Helper to upsert a single permission
        const upsertPermission = async (userId, resId, resType, resRole) => {
            const existing = await Permission.findOne({ userId, resourceId: resId })
            if(existing){
                await existing.updateOne({ role: resRole })
            } else {
                await Permission.create({ userId, resourceId: resId, resourceType: resType, role: resRole })
            }
        }

        // Share the main resource
        await upsertPermission(userToShare._id, resourceId, resourceType, role)

        // If sharing a folder — cascade to all files and subfolders inside
        if(resourceType === 'folder'){
            // Get all files inside this folder
            const filesInFolder = await File.find({ folderId: resourceId, isDeleted: false })
            for(const file of filesInFolder){
                await upsertPermission(userToShare._id, file._id, 'file', role)
            }

            // Get all subfolders inside this folder
            const subFolders = await Folder.find({ parentFolderId: resourceId, isDeleted: false })
            for(const subFolder of subFolders){
                await upsertPermission(userToShare._id, subFolder._id, 'folder', role)

                // Cascade into subfolders' files too
                const subFiles = await File.find({ folderId: subFolder._id, isDeleted: false })
                for(const file of subFiles){
                    await upsertPermission(userToShare._id, file._id, 'file', role)
                }
            }

            logger.info(`Folder ${resourceId} shared with ${email} as ${role} — cascaded to ${filesInFolder.length} files`)
        }

        logger.info(`${resourceType} shared with ${email} as ${role} by ${req.user.email}`)

        res.status(201).json({
            success: true,
            message: `${resourceType} shared with ${email} as ${role}`
        })
    } catch (error) {
        next(error)
    }
}

// Change Role
// PUT /api/share/:permissionId
// changeRole     → UPDATE permission document
//                  User still has access but different role
const changeRole = async(req, res, next) => {
    try {
        const { role } = req.body
        if(!role || !['editor', 'viewer'].includes(role)){
            return next(createError(400, 'Role must be editor or viewer'))
        }

        const permission = await Permission.findById(req.params.id)

        if(!permission){
            return next(createError(404, 'Permission not found'))
        }
        // Cannot change owner role
        if(permission.role === 'owner'){
            return next(createError(400, 'Cannot change owner role'))
        }

        //change role
        await permission.updateOne({ role })

        // Invalidate cache
        await invalidatePermissionCache(permission.userId, permission.resourceId)

        logger.info(`Role changed to ${role} for permission ${req.params.id}`)
        res.status(200).json({
            success: true,
            message: `Role changed to ${role}`
        })
    } catch (error) {
        next(error)
    }
}

// Revoke Access
// DELETE /api/share/:permissionId
// revokeAccess   → DELETE permission document
//                  User has NO access at all
const revokeAccess = async(req, res, next) => {
    try {
        const permission = await Permission.findById(req.params.id)
        if(!permission){
            return next(createError(404, 'Permission not found'))
        }

        // Cannot revoke owner access
        if(permission.role === 'owner'){
            return next(createError(400, 'Cannot revoke owner access'))
        }

        await Permission.deleteOne({ _id: req.params.id })

        //Invalidate Permission cache
        await invalidatePermissionCache(permission.userId, permission.resourceId)

        logger.info(`Access revoked for permission ${req.params.id}`)

        res.status(200).json({
            success: true,
            message: 'Access revoked successfully'
        })
    } catch (error) {
        next(error)
    }
}

// Get Resource Permissions
// GET /api/share/:resourceId

const getPermissions = async(req, res, next) => {
    try {
        const permissions = await Permission.find({
            resourceId: req.params.id
        }).populate('userId', 'name email avatar')

        res.status(200).json({
            success: true,
            count: permissions.length,
            permissions
        })
    } catch (error) {
        next(error)
    }
}

// Generate Public Link 
// POST /api/share/link

const generatePublicLink = async(req, res, next) => {
    try {
        const { fileId, expiresIn, password } = req.body
        if(!fileId){
            return next(createError(400, 'Please provide fieId'))
        }

        // Check if file exists
        const file = await File.findById(fileId)
        if(!file){
            return next(createError(404, 'File not found'))
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex')

        //calculate expiry date
        let expiresAt = null
        if(expiresIn){
            expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
        }

        // Create share link
        const shareLink = await ShareLink.create({
            fileId,
            token,
            password: password || null,
            expiresAt,
            createdBy: req.user._id
        })

        const publicUrl = `${process.env.CLIENT_URL}/share/${token}`

        logger.info(`Public link generated for file ${fileId} by ${req.user.email}`)

        res.status(201).json({
            success: true,
            message: 'Public link generated',
            url: publicUrl,
            token,
            expiresAt
        })
    } catch (error) {
        next(error)
    }
}

// Access Via Public Link 
// GET /api/share/link/:token

const accessPublicLink = async(req, res, next) => {
    try {
        const { token } = req.params
        const { password } = req.query

        // Find share link
        const shareLink = await ShareLink.findOne({ token })

        if(!shareLink || !shareLink.isActive){
            return next(createError(404, 'Link not found or it is inactive'))
        }

        //check expiry
        if(shareLink.expiresAt && shareLink.expiresAt < new Date()){
            return next(createError(400, 'Link expired'))
        }

        // Check password if set
        if(shareLink.password && shareLink.password !==password){
            return next(createError(401, 'Invalid password'))
        }

        // Get file
        const file = await File.findById(shareLink.fileId)
        if(!file || file.isDeleted){
            return next(createError(404, 'File not found'))
        }

        // Increment access count
        await shareLink.updateOne({
            accessCount: shareLink.accessCount + 1
        })

        res.status(200).json({
            success: true,
            file: {
                name: file.name,
                type: file.type,
                size: file.size,
                url: file.url
            }
        })
    } catch (error) {
        next(error)
    }
}
export {
  shareWithUser,
  changeRole,
  revokeAccess,
  getPermissions,
  generatePublicLink,
  accessPublicLink
}
