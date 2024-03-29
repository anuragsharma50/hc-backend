require("dotenv").config()
const express = require('express')
const User = require('../models/user')
const auth = require('../middleware/auth')
const referralCodes = require('referral-codes')
const router = new express.Router()
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const Wish = require('../models/wish')
const Celebration = require('../models/celebration')
const Gift = require('../models/gift')

router.get('/myideas',auth, async (req,res) => {
    try {

        let ideas = []

        await req.user.populate({
            path: 'wishes',
            options: {
                sort : { createdAt: -1 }
            }
        })

        if(req.user.wishes){
            req.user.wishes.forEach((wish) => {
                wish = {...wish._doc,catagory:'wish'}
                ideas.push(wish)
            })
        }

        await req.user.populate({
            path: 'celebration',
            options: {
                sort : { createdAt: -1 }
            }
        })

        if(req.user.celebration){
            req.user.celebration.forEach((celebration) => {
                celebration = {...celebration._doc,catagory:'celebration'}
                ideas.push(celebration)
            })
        }

        await req.user.populate({
            path: 'gift',
            options: {
                sort : { createdAt: -1 }
            }
        })

        if(req.user.gift){
            req.user.gift.forEach((gift) => {
                gift = {...gift._doc,catagory:'gift'}
                ideas.push(gift)
            })
        }

        if(ideas.length > 0 ){
            res.send(ideas)
        }else{
            res.status(404).json({message: "You haven't write any idea"})
        }

    } catch (error) {
        res.status(500).send()
    }
})

// Unsave idea
router.get('/unsave/:id',auth,async(req,res) => {
    try{
        req.user.saved = req.user.saved.filter(save => {
            return save !== req.params.id
        })
        
        await req.user.save()
        res.send("Idea Unsaved Successfully")
        
    } catch(e){
        res.status(500).send()
    }
})

//get saved ideas
router.get('/saved',auth, async(req,res) => {
    try {

        if(req.user.saved.length === 0) {
            res.status(400).json({message:"You have't saved any idea"})
        }else{

            const savedWishes = await Wish.find({
                _id: { $in: req.user.saved}
            },{budget:1,description:1,maxAge:1,minAge:1,ocassion:1,relation:1,title:1,_id:1})
    
            if(savedWishes.length ===  req.user.saved.length){
                res.send(savedWishes)
            }
    
            savedWishes.forEach(item => {
                const index = req.user.saved.indexOf(item._id)
                req.user.saved.splice(index,1)
            })
    
            const savedCelebrationIdeas = await Celebration.find({
                _id: { $in: req.user.saved}
            },{budget:1,description:1,maxAge:1,minAge:1,ocassion:1,relation:1,title:1,_id:1})
    
            if(savedCelebrationIdeas.length ===  req.user.saved.length){
                res.send([...savedCelebrationIdeas,...savedWishes])
            }
    
            savedCelebrationIdeas.forEach(item => {
                const index = req.user.saved.indexOf(item._id)
                req.user.saved.splice(index,1)
            })
    
            const savedGiftIdeas = await Gift.find({
                _id: { $in: req.user.saved}
            },{budget:1,description:1,maxAge:1,minAge:1,ocassion:1,relation:1,title:1,_id:1})
    
            if(savedGiftIdeas.length ===  req.user.saved.length){
                res.send([...savedCelebrationIdeas,...savedWishes,...savedGiftIdeas])
            }
    
            res.status(400).json({message:"Nothing is saved"})
        }
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/send-otp-again',auth,async(req,res) => {

    try {
        const otp = referralCodes.generate({ length: 6, charset: "0123456789" })[0]
        req.user.otp = otp
        req.user.updatedAt = new Date()
        await req.user.save()

        const msg = {
            to: req.user.email,
            from: 'anuragsh868@gmail.com',
            subject: 'Sending with SendGrid is Fun',
            text: 'Hello from Happie Celebrations',
            html: '<p>Hello from Happie Celebrations</p>',
            templateId: '97d436d1-6dc8-4473-82ac-5ec8ea9d62df',
            substitutionWrappers: ['{{', '}}'],
            substitutions: {
                otp: req.user.otp,
            },
        }
        sgMail.send(msg).then(() => {
            console.log('Email sent')
            res.status(200).send('Email sent')
        }).catch((error) => {
            console.error(error)
        })
    } catch (error) {
        res.status(500).send()
    }
})

router.post('/forgot-password',async(req,res) => {
    try {
        const user = await User.findOne({ email:req.body.email })

        const uniqueId = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET_KEY_FOR_PASSWORD_RESET)
 
        const msg = {
            to: 'anuragsh868@gmail.com',
            from: 'anuragsh868@gmail.com',
            subject: 'Sending with SendGrid is Fun',
            text: 'Hello from Happie Celebrations',
            html: '<p>Hello from Happie Celebrations</p>',
            templateId: '1c4aa338-826a-4057-9ff4-682fa1cc8a8c',
            substitutionWrappers: ['{{', '}}'],
            substitutions: {
                uniqueId,
            },
        }
        sgMail.send(msg).then(() => {
            console.log('Email sent')
            res.status(200).send('Email sent')
        }).catch((error) => {
            console.error(error)
        })

    } catch (error) {
        res.status(500).json({message: "Couldn't find your Account"})
    }
})

router.post('/new-password',async(req,res) => {
    try {
        const userId = jwt.verify(req.body.resetToken,process.env.JWT_SECRET_KEY_FOR_PASSWORD_RESET)

        const user = await User.findById(userId)

        const isMatch = await bcrypt.compare(req.body.password,user.password)

        if(isMatch){
            res.status(403).json({message: "New password can't be same as the old password"})
        } else{
            await user.updateOne({ password })
            await user.save()

            res.status(201).send('Password saved Successfully')
        }

    } catch (error) {
        res.status(500).json({message: "Something went Wrong"})
    }
})

router.post('/currency',auth, async (req,res) => {
    try {
        if(!req.user.currency){
            req.user.currency = req.body.currency
            await req.user.save()
        }
        res.status(200).send()
    } catch (error) {
        res.status(500).send()
    }
})

router.post('/capturePaypalAmount',auth,async(req,res) => {
    try {
        const prePayment = (req.body.amount - 0.5)/1.05
        
        await req.user.updateOne({ prePayment: req.user.prePayment + prePayment })

        await req.user.save()
        res.send("Payment saved successfully")
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/payment',auth,async(req,res) => {
    try{
        if(req.user.free > 0) {
            free = req.user.free - 1
            paid = false
            await req.user.updateOne({ payment:true,free,paid })

            await req.user.save()
            res.send()
        } 
        else if(req.user.prePayment > 0){
            prePayment = req.user.prePayment - 1
            paid = true
            await req.user.updateOne({ payment:true,prePayment,paid })

            await req.user.save()
            res.send()
        }
        else{
            res.status(500).json({message: "Please complete payment"})
        }
    } catch(e){
        res.status(500).send()
    }
})

router.post('/referral',auth,async(req,res) => {

    console.log(req.body.referralcode)

    try{
        if(req.user.referralcode === req.body.referralcode){
            return res.status(400).json({message: "Invalid code"})
        }

        if(req.user.referred){
            return res.status(400).json({message: "Sorry, you have already availed the offer!"})
        }

        const referredBy = await User.findOne({ referralcode:req.body.referralcode })
        
        if(!referredBy){
            return res.status(400).json({message: "Invalid code"})
        }

        const free =  referredBy.free + 1
        await referredBy.updateOne({ free })
        req.user.referred = true
        req.user.free = req.user.free + 1
        await referredBy.save()
        await req.user.save()

        res.send()
    } catch(e){
        res.status(400).send(e)
    }
})

// router.patch('/me',auth, async (req,res) => {

//     const updates = Object.keys(req.body)
//     const allowedUpdates = ['username','password','age','gender']
//     const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

//     if(!isValidOperation){
//         return res.status(400).send({error: "Invalid Updates!"})
//     }

//     try {
//         updates.forEach((update) => req.user[update] = req.body[update])
//         await req.user.save()
//         res.send(req.user)
//     } catch (error) {
//         res.status(400).send(e)
//     }

// })

// router.delete('/me',auth, async (req,res) =>{
//     try {
//         await req.user.remove()
//         res.send(req.user)
//     } catch (error) {
//         res.status(500).send(error)
//     }
// })


module.exports = router