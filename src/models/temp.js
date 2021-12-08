require("dotenv").config()
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const tempSchema = new mongoose.Schema({
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
    otp: {
        type: String,
    },
    createdAt: { 
        type: Date, 
        expires: 60*60*24, // 1 day 
        default: Date.now 
    },
    updatedAt: { 
        type: Date,
        default: Date.now 
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
})

tempSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.otp
    delete userObject.createdAt
    delete userObject.updatedAt
    delete userObject.tokens
    delete userObject._id

    return userObject
}

tempSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET_KEY)
    
    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

tempSchema.statics.findByCrediantials = async (email,password) => {
    const user = await Temp.findOne({ email })

    if(!user){
        throw new Error("Incorrect email or password")
    }

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch){
        throw new Error("Incorrect email or password")
    }

    return user
}

// Hash the plane text password brfore saving
tempSchema.pre('save', async function(next) {
    const user = this

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password,8)
    }

    next()
})
 
const Temp = mongoose.model('Temp',tempSchema)

module.exports = Temp