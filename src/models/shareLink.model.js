import mongoose from "mongoose";

const shareLinkSchema = new mongoose.Schema({
    //which fie this klink points to
    fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: [true, 'File is required']
  },

  // Unique random token for the link
  // This is what goes in the URL
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true
  },

  // Optional password protection
  // Stored as bcrypt hash
  password: {
    type: String,
    default: null,
    select: false
  },

  // Optional expiry date
  // null means never expires
  expiresAt: {
    type: Date,
    default: null
  },

  // Who created this link
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // How many times this link has been accessed
  accessCount: {
    type: Number,
    default: 0
  },

  // Is this link active or disabled
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

//indexes
shareLinkSchema.index({ token: 1 })
shareLinkSchema.index({ fileId: 1 })

const ShareLink = mongoose.model('ShareLink', shareLinkSchema)

export default ShareLink