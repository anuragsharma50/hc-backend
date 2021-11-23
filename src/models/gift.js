const mongoose = require('mongoose')

const Gift = mongoose.model('Gift',new mongoose.Schema({
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
            enum: ['friend', 'brother', 'father','mother','cousin','sister','son','daughter','grandfather',
                    'grandmother','aunt','uncle','girlfriend','boyfriend','husband','wife','grandson','granddaughter',
                    'niece','nephew','father-in-law','mother-in-law','sister-in-law','son-in-law','daughter-in-law',
                    'bride','groom','student','teacher','neighbour'],
            required: true,
        }]
    },
    ocassion: {
        type: [{
            type: String,
            enum: ['new year','birthday','diwali','holi','christmas','farewell','anniversary(marrige)','propose',
                'anniversary(job)'],
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
}))

module.exports = Gift