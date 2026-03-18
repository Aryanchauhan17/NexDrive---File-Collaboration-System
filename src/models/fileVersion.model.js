import mongoose from "mongoose";

const fileVersionSchema = new mongoose.Schema({
    //which file this version belongs to
    fileId: {
        type: String,
        ref: 'File',
        required: [true, 'FileId is required']

    },
    // Cloudinary ID of this specific version
    // Each version has its own cloudinary upload
    cloudinaryId: {
        type: String,
        required: [true, 'Cloudinary Id is required']
    },
    //url of the specific version
    url: {
        type: String,
        required: [true, 'URL is required']
    },
    // Version number — 1, 2, 3, 4...
    versionNumber: {
        type: Number,
        required: [true, 'Version number is required']
    },
    //size of this version in bytes
    size: {
        type: Number,
        required: [true, 'Size is required']
    },
    //who uploaded this file
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    //optional note about what changes in this version
    changeNote: {
        type: String,
        default: null,
        maxLength: [200, 'Change note cannot exceed more than 200 characters']
    }
}, { timestamps: true })

//indexes
fileVersionSchema.index({ fileId: 1 })
fileVersionSchema.index({ fileId: 1, versionNumber: -1 })//-1 so that we get the latest versions first and then the 
//older versions 

const FileVersion = mongoose.model('FileVersion', fileVersionSchema)
export default FileVersion
