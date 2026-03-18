import { Socket } from "socket.io";
import redis from "../config/redis.js";
import logger from "../utils/logger.js";

const presenceSocket = (io) => {
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`)

    //  User Comes Online
    // Frontend emits this when user logs in
    socket.on('user:online', async(userId) => {
        try {
            // Store user's socket ID in Redis
            // So we know which socket belongs to which user
            await redis.setex(`online: ${userId}`, 300, socket.id)
            // Join a personal room for this user
            // Used to send notifications directly to this user
            socket.join(`user: ${userId}`)

            // Tell everyone this user is online
            io.emit('user:status', {
                userId,
                status: 'online'
            })
            logger.info(`User ${userId} is online`)
        } catch (error) {
            logger.error(`Presence error: ${error.message}`)
        }
    })
    // User Opens a File
    // Frontend emits this when user opens a file
    socket.on('file:view', async({ userId, fileId }) => {
        try {
            // Join the file's room
            // Everyone viewing same file is in same room
            socket.join(`file:${fileId}`)

            // Store which file this user is viewing in Redis
            await redis.setex(`viewing ${userId}`, 300, fileId)

            // Tell everyone in the file room someone joined
            socket.to(`file:${fileId}`).emit('file:viewer:joined', {
                userId,
                fileId
            })

            logger.info(`User ${userId} is Viewing file ${fileId}`)

        } catch (error) {
            logger.error(`File view error: ${error.message}`)
        }
    })
    // User Leaves a File
    socket.on('file:leave', async({ userId, fileId }) => {
        try {
            // Leave the file room
            socket.leave(`file:${fileId}`)

            // Remove viewing status from Redis
            await redis.del(`viewing: ${userId}`)

            // Tell everyone in the room someone left
            socket.to(`file: ${fileId}`).emit('file:viewer:left', {
                userId,
                fileId
            })

            logger.info(`User ${userId} left the file ${fileId}`)
        } catch (error) {
            logger.error(`File leave error: ${error.message}`)
        }
    })
    //  Get Online Users 
    socket.on('users:online', async(userIds) => {
        try {
            // Check which users are online in Redis
            const onlineUsers = []
            for(const userId in userIds){
                const socketId = await redis.get(`online:${userId}`)
                if(socketId){
                    onlineUsers.push(userId)
                }
            }

            // Send back list of online users
            socket.emit('users:online:result', onlineUsers)
        } catch (error) {
            logger.error(`Online users error: ${error.message}`)
        }
    })
    //  User Disconnects 
    socket.on('disconnect', async() => {
        try {
            logger.info(`Socket disconnected: ${socket.id}`)
        } catch (error) {
            logger.error(`Disconnect error: ${error.message}`)
        }
    })
    
    })
}
export default presenceSocket