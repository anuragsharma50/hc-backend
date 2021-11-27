const mongoose = require('mongoose')

const approverSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    totalApproved: {
        type: Number,
        default: 0
    },
    verified: {
        type: Boolean,
        default: false
    },
    totalDiscarded: {
        type: Number,
        default: 0
    },
    uniqueCode: {
        type: String,
        required: true
    }
})

// approverSchema.methods.toJSON = function () {
//     const user = this
//     const userObject = user.toObject()

//     delete userObject.creator

//     return userObject
// }

const Approver = mongoose.model('Approver',approverSchema)

module.exports = Approver