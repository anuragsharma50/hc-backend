require("dotenv").config()
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        validate(value) {
            if(!validator.isEmail(value)){
                throw new Error('Email is invalid')
            }
        }
    },  
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: [7,'Password must be greater then 6 characters'],
    },
    social_id: {
        type: String,
    },
    social_provider: {
        type: String,
    },
    currency: {
        type: String,
    },
    earning: {
        type: Number,
        default: 0,
    },
    prePayment:{
        type: Number,
        default: 0,
    },
    payment:{
        type: Boolean,
    },
    referralcode: {
        type: String,
        unique: true,
        sparse: true,
    },
    free: {
        type: Number,
        default: 1,
    },
    referred: {
        type: Boolean,
    },
    saved: {
        type: [String]
    },
    isApprover: {
        type: Boolean,
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
})

userSchema.virtual('wishes',{
    ref: 'Wish',
    localField: '_id',
    foreignField: 'creator'
})

userSchema.virtual('celebration',{
    ref: 'celebration',
    localField: '_id',
    foreignField: 'creator'
})

userSchema.virtual('gift',{
    ref: 'Gift',
    localField: '_id',
    foreignField: 'creator'
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.social_id
    delete userObject.social_provider
    delete userObject._id

    return userObject
}

userSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET_KEY)

    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

userSchema.statics.findByCrediantials = async (email,password) => {
    const user = await User.findOne({ email })

    if(!user){
        // throw new Error("Incorrect email or password")
        return
    }

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch){
        // throw new Error("Incorrect email or password")
        return
    }

    return user
}


// Hash the plane text password brfore saving
userSchema.pre('save', async function(next) {
    const user = this

    if(user.isModified('password') && user.password.length < 10) {
        user.password = await bcrypt.hash(user.password,8)
    }

    next()
})
 
const User = mongoose.model('User',userSchema)

module.exports = User