import mongoose, { mongo } from "mongoose";
const folderSchema = new mongoose.Schema({
    //folder name
    name: {
        type: String,
        required: [true, 'Folder name is required'],
        trim: true,
        minLength: [1, 'Folder name cant be empty'],
        maxLength: [100, 'Folder name cant exceed 100 characters']
    },
    // Who created this folder
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner is required']
    },
    // Which folder this folder is inside
    // null means it is in root (My Drive)
    parentFolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null
    },
    //is the folder starred by owner
    isStarred: {
        type: Boolean,
        default: false
    },
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },

    // When folder was moved to trash
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })
//indexes for faster query
folderSchema.index({ ownerId: 1 })
folderSchema.index({ parentFolderId: 1 })
folderSchema.index({ isDeleted: 1 })

const Folder = mongoose.model('Folder', folderSchema)

export default Folder
