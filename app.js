import './src/config/env.js'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server } from 'socket.io'
import presenceSocket from './src/socket/presence.socket.js'
import notificationSocket from './src/socket/notification.socket.js'
import cookieParser from 'cookie-parser'
import connectDB from './src/config/db.js'
import logger from './src/utils/logger.js'
import './src/config/redis.js'
import './src/config/cloudinary.js'
import errorHandler from './src/middleware/errorHandler.js'
import authRoutes from './src/routes/auth.routes.js'
import fileRoutes from './src/routes/file.routes.js'
import folderRoutes from './src/routes/folder.routes.js'
import shareRoutes from './src/routes/share.routes.js'
import userRoutes from './src/routes/user.routes.js'

const app = express()
const server = http.createServer(app)

connectDB()


//middlewares
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))
app.use('/api/auth', authRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/share', shareRoutes)
app.use('/api/user', userRoutes)


app.get('/', (req, res) => {
  res.json({ message: 'NexDrive API is running' })
})
// Must be last middleware
app.use(errorHandler)
const PORT = process.env.PORT || 5000
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
})
app.set('io', io)
presenceSocket(io)
const notifications = notificationSocket(io)
app.set('notifications', notifications)

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})

