import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
    //who has the permission
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    // ID of the file or folder
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Resource is required']
    },
    //is it a file or a folder
    resourceType: {
        type: String,
        enum: ['file', 'folder'],
        required: [true, 'Resource type is required']
    },
    role: {
        type: String,
        enum: ['owner', 'editor', 'viewer'],
        required: [true, 'Role is required']
    }
}, { timestamps: true })

// Indexes
// We frequently query by userId and resourceId together
permissionSchema.index({userId: 1, resourceId: 1})
permissionSchema.index({resourceId: 1})

const Permission = mongoose.model('Permission', permissionSchema)

export default Permission
