const mongoose = require('mongoose')

const wishSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true,
        trim: true
    },
    description:{
        type: String,
        required: true,
        trim: true
    },
    minAge: {
        type: Number,
        required: true
    },
    maxAge: {
        type: Number,
        required: true
    },
    relation: {
        type: [{ 
            type: String,
            required: true,
        }]
    },
    ocassion: {
        type: [{
            type: String,
            required: true,
        }]
    },
    gender: {
        type: String,
        enum: ['male','female','other']
    },
    budget: {
        type: Number,
        default: 0
    },
    approvalStatus: {
        type: String,
    },
    approvedBy: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        }]
    },
    totalSave: {
        type: Number,
        default: 0
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
},{
    timestamps: true
})

wishSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.creator

    return userObject
}

const Wish = mongoose.model('Wish',wishSchema)


module.exports = Wish