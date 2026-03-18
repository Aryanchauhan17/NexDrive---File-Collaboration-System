import User from '../models/user.model.js'
import RefreshToken from '../models/refreshToken.model.js'
// import Permission from '../models/permission.model.js'
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} from '../utils/jwt.js'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import createError from '../utils/createError.js'

// Register 
// POST /api/auth/register

const register = async(req, res, next) => {
    try {
        const { name, email, password } = req.body
        if(!name || !email || !password){
            return next(createError(400, 'Please provide name, email and password'))
        }
        //check if user already exists
        const existedUser = await User.findOne({ email })
        if(existedUser){
            return next(createError(400, 'Email already registered'))
        }

        // Create new user
        // Password gets hashed automatically by pre save hook
        const user = await User.create({
            name,
            email,
            password
        })

        //generate tokens
        const accessToken = generateAccessToken(user._id)
        const refreshToken = generateRefreshToken(user._id)

        //save refreshtoken in the database(in the refreshToken.model.js)
        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),//7 days
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        })

        // Send refresh token as HTTP only cookie
        // HTTP only means JavaScript cannot access it
        // This protects against XSS attacks
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        })

        logger.info(`New user registered: ${email}`)

        //send response
        res.status(201).json({
            success: true,
            message: 'Registration Successful',
            accessToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                plam: user.plan,
                storageUsed: user.storageUsed,
                quota: user.quota
            }
        })
    } catch (error) {
        next(error)
    }
}

// Login 
// POST /api/auth/login
const login = async(req, res, next) => {
    try {
        const { email, password } = req.body
    if(!email || !password){
        return next(createError(400, 'Please provide email and password'))
    }

    // Find user — include password field
    // (password has select:false so we need to explicitly include it)
    const user = await User.findOne({email}).select('+password')

    if(!user){
        return next(createError(401, 'Invalid email and password'))
    }
    //compare password
    const isMatch = await user.comparePassword(password)
    if(!isMatch){
        return next(createError(401, 'Invalid email or password'))
    }

    //generate tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    //save refresh token in the database
    await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
    })

    // Send refresh token as HTTP only cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    logger.info(`User logged in ${email}`)
    res.status(200).json({
        success: true,
        message: 'Login successful',
        accessToken,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            plan: user.plan,
            storageUsed: user.storageUsed,
            quota: user.quota
        }
    })
    } catch (error) {
        next(error)
    }
}

// Logout 
// POST /api/auth/logout

const logout = async(req, res, next) => {
    try {
        // Get access token from header
        const accessToken = req.headers.authorization?.split(' ')[1]

        //get refresh token from cookies
        const refreshToken = req.cookies.refreshToken

        // Blacklist access token in Redis
        // TTL = 15 minutes (same as token expiry)
        if(accessToken){
            await redis.setex(
                `blacklist:${accessToken}`,
                15 * 60,//15 muinutes in seconds
                'true'
            )
        }
        //delete refresh token fromdatabase
        if(refreshToken){
            await RefreshToken.deleteOne({ token: refreshToken })
        }

        //clear cookie
        res.clearCookie('refreshToken')

        logger.info(`User logged out: ${req.user?.email}`)

        res.status(200).json({
            success: true,
            message: 'User Logged out successfully'
        })
    } catch (error) {
        next(error)
    }
}

// Refresh Token
// POST /api/auth/refresh-token
// Called automatically when access token expires

const refreshToken = async(req, res, next) => {
    try {
        //get refresh token from cookies
        const token = req.cookies.refreshToken

        if(!token){
            return next(createError(401, 'No refresh token provided'))
        }
        //verify refresh token
        const decoded = verifyRefreshToken(token)
        if(!decoded){
            return next(createError(401, 'Invalid refresh token'))
        }

        // Check if refresh token exists in database
        const savedToken = await RefreshToken.findOne({ token })

        if(!savedToken){
            return next(createError(401, 'Refrsh token not found'))
        }
        // Check if expired, delete it
        if(savedToken.expiresAt < new Date()){
            await RefreshToken.deleteOne({ token })
            return next(createError(401, 'Refresh token expired'))
        }

        //  Token Rotation 
        // Delete old refresh token
        await RefreshToken.deleteOne({ token })

        //generate new tokens
        const newAccessToken = generateAccessToken(decoded.userId)
        const newRefreshToken = generateRefreshToken(decoded.userId)

        //save new refresh token to database
        RefreshToken.create({
            userId: decoded.userId,
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        })

        //set new refresh token in cookies
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.status(200).json({
            success: true,
            accessToken: newAccessToken
        })
    } catch (error) {
        next(error)
    }
}

export { register, login, logout, refreshToken }