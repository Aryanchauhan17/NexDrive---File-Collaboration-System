import mongoose from "mongoose";
import bcrypt from "bcryptjs"

//create user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minLength: [2, 'Must be atleast 2 characters'],
        maxLength: [50, 'Must be atmost 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minLength: [6, 'Password must be atleast 6 characters'],
        select: false
    },
    avatar: {
        type: String,
        default: null
    },
    //how much storage user has used in bytes
    storageUsed: {
        type: Number,
        default: 0
    },
    quota: {
        type: Number,
        default: 5 * 1024 * 1024 * 1024
    },
    plan: {
        type: String,
        enum: ['Free', 'Pro'],
        default: 'Free'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})
// Hash password before saving 
// This runs automatically every time a user is saved
// If password was not changed, skip hashing

userSchema.pre('save', async function() {
    if(!this.isModified('password')) return next()

    //hash the password
    this.password = await bcrypt.hash(this.password, 12)
})

// Method to compare passwords 
// Used during login to check if entered password is correct
// Returns true if match, false if not

userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model('User', userSchema)
export default User

