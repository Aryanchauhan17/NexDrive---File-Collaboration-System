import mongoose, { MongooseError } from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
    //which user this token belongs to
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required']
    },
    //actual refreshtoken string
    token: {
        type: String,
        required: [true, 'Token is required'],
        unique: true
    },
    //expiry of this token 
    expiresAt: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    // Extra security — store which device/browser created this token
    // Useful for "logout from all devices" feature
    userAgent: {
        type: String,
        default: null
    },
    //ipadd when token was created
    ipAddress: {
        type: String,
        default: null
    }
}, { timestamps: true })

refreshTokenSchema.index(
    {expiresAt: 1},
    {expireAfterSeconds: 0}
)

// Index for fast lookup by token string
refreshTokenSchema.index({ token: 1 })

// Index for finding all tokens of a user
// Used for "logout from all devices"
refreshTokenSchema.index({ userId: 1 })

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)
export default RefreshToken