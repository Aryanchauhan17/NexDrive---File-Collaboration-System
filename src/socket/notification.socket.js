import logger from "../utils/logger.js";

const notificationSocket = (io) => {
    // Send Notification to Specific User 
    // Called from controllers when something happens
    const sendNotification = (userId, notification) => {
        io.to(`user:${userId}`).emit('notification', {
            ...notification,
            createdAt: new Date()
        })

        logger.info(`Notification sent to user ${userId}: ${notification.message}`)
    }
    // Send File Activity to File Room 
    // Called when file is updated, shared etc
    const sendFileActivity = (fileId, activity) => {
        io.to(`file:${fileId}`).emit('file:activity', {
            ...activity,
            createdAt: new Date()
        })
    }
    return {
        sendNotification,
        sendFileActivity
    }
}
export default notificationSocket