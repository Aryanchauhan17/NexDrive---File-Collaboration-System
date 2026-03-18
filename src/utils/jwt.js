import jwt from 'jsonwebtoken'

//generate access token, short lived
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )
}

//generate refresh token, long lived(7 days)
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    )
}

//VERIFY ACCESS TOKEN// Returns decoded token data if valid
// Returns null if invalid or expired
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
        return null
    }
}

const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    } catch (error) {
        return null
    }
}

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
}