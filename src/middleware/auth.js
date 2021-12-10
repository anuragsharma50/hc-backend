require("dotenv").config()
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Temp = require('../models/temp')

const auth = async (req,res,next) => {
    try{
        const token = req.cookies.jwt
        const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY)
        let user = await User.findOne({ _id: decoded._id, 'tokens.token':token})

        if(!user){
            user = await Temp.findOne({ _id: decoded._id, 'tokens.token':token})
            if(!user){
                throw new Error()
            }
        }

        req.token = token
        req.user= user
        next()
    } catch(e) {
        res.status(401).json({ error: 'Please Authanticate.' })
    }
}

// const auth = async (req,res,next) => {
//     try{
//         const token = req.header('Authorization').replace('Bearer ','')
//         // const token = req.cookies.jwt
//         const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY)
//         const user = await User.findOne({ _id: decoded._id, 'tokens.token':token})

//         if(!user){
//             throw new Error()
//         }

//         req.token = token
//         req.user= user
//         next()
//     } catch(e) {
//         res.status(401).send({ error: 'Please Authanticate.' })
//     }
// }

module.exports = auth
