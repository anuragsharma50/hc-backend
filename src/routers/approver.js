require("dotenv").config()
const express = require('express')
const Approver = require('../models/approver')
const auth = require('../middleware/auth')
const router = new express.Router()
const referralCodes = require('referral-codes')
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const Wish = require('../models/wish')
const Celebration = require('../models/celebration')
const Gift = require('../models/gift')
const User = require('../models/user')

// add user info to db to make him a approver (level 1)
router.get('/',auth, async (req,res) => {
    try {
        const alreadyExists = await Approver.findOne({
            userId: req.user._id
        })

        if(alreadyExists) {
            res.status(403).json({error: 'User already exists'})
        }

        const uniqueCode = referralCodes.generate({
            length: 6
        })[0]
    
        const approver = new Approver({
            uniqueCode,
            userId: req.user._id
        })

        await approver.save()

        res.status(201).send(approver)
        // res.status(201).send("Congrulations You are an Approver now")
    } catch (error) {
        res.status(400).send(error)
    }
})

// is a user is a approver 
router.get('/status',auth, async (req,res) => {
    try {
        let status = await Approver.findOne({
            userId: req.user._id
        })

        if(!status) {
            res.status(404).json({error: 'User not found'})
        } else{
            status = await Approver.findOne({
                verified: true
            })
    
            if(!status) {
                res.status(404).json({error: 'User not verified'})
            }else{
                res.status(200).send(status)
            }
        }

    } catch (error) {
        res.status(400).send(error)
    }
})

// Verify user as approver by entering unique code (level 2)
router.post('/verify',auth,async(req,res) => {

    try{
        let approver = await Approver.findOne({
            userId: req.user._id
        })

        if(approver.uniqueCode === req.body.uniqueCode) {
            await approver.updateOne({ verified: true })
            await approver.save()
            res.send()
        } else{
            return res.status(400).json({message: "Invalid code"})
        }
    } catch(e){
        res.status(400).send(e)
    }
})

// fetch unapproved idea
router.get('/unapprovedIdea',auth, async (req,res) => {
    try {
        const approver = await Approver.findOne({
            userId: req.user._id,
            verified: true
        })

        if(!approver){
            res.status(404).json({error:"Approver not Exists"})
        } else {
            if(approver.totalApproved + approver.totalDiscarded % 3 === 0){
                const idea = await findUnApprovedWish()
                if(!idea) {
                    res.status(404).json({error:"No Unapproved ideas"})
                }else{      
                    res.status(200).send(idea)
                }
            } else if(approver.totalApproved + approver.totalDiscarded % 3 === 1){
                const idea = await findUnApprovedCelebration()
                if(!idea) {
                    res.status(404).json({error:"No Unapproved ideas"})
                }else{      
                    res.status(200).send(idea)
                }
            } else{
                const idea = await findUnApprovedGift()
                if(!idea) {
                    res.status(404).json({error:"No Unapproved ideas"})
                }else{      
                    res.status(200).send(idea)
                }
            }
        }
    } catch (error) {
        res.status(400).json({error:'Something went wrong'})
    }
})

// approve idea
router.patch('/approveIdea',auth, async (req,res) => {
    try {
        const approver = await Approver.findOne({
            userId: req.user._id,
            verified: true
        })

        if(!approver){
            res.status(404).json({error:"Approver not Exists"})
        }else{
            let idea
            if(req.body.catagory === 'Wish'){
                idea = await Wish.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: 'Approved',
                      approvedBy: approver._id }
                )
            } else if(req.body.catagory === 'Celebration'){
                idea = await Celebration.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: 'Approved',
                      approvedBy: approver._id }
                )
            } else{
                idea = await Gift.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: 'Approved',
                      approvedBy: approver._id }
                )
            }

            await approver.updateOne({
                $inc : { "totalApproved" : 1 }
            })

            const user = await User.findById(idea.creator.toString())
            // user.free = user.free + 1
            // user.earning = user.earning + 1

            // await user.save()
            // await idea.save()
            await approver.save()

            const msg = {
                to: user.email,
                from: 'no-reply@happiecelebrations.com',
                subject: 'Happie Celebration | Idea Approved',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: '3f2af504-d905-4435-9cf3-964c23d92b71',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    title: idea.title,
                    status: 'Approved'
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })
            res.status(200).send()
        }

    } catch (error) {
        res.status(400).send(error)
    }
})

// rejected idea 
router.patch('/rejectIdea',auth, async (req,res) => {
    try {
        // To Check if the request is done by an approver or not
        const approver = await Approver.findOne({
            userId: req.user._id,
            verified: true
        })

        if(!approver){
            res.status(404).json({error:"Approver not Exists"})
        }else{
            let idea
            if(req.body.catagory === 'Wish'){
                idea = await Wish.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: `Rejected: ${req.body.reason}`,
                      approvedBy: approver._id }
                )
            } else if(req.body.catagory === 'Celebration'){
                idea = await Celebration.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: `Rejected: ${req.body.reason}`,
                      approvedBy: approver._id }
                )
            } else{
                idea = await Gift.findOneAndUpdate(
                    { _id: req.body._id },
                    { approvalStatus: `Rejected: ${req.body.reason}`,
                      approvedBy: approver._id }
                )
            }

            await approver.updateOne({
                $inc : { "totalDiscarded" : 1 }
            })

            const user = await User.findById(idea.creator.toString())
            await idea.save()
            await approver.save()

            const msg = {
                to: user.email,
                from: 'no-reply@happiecelebrations.com',
                subject: 'Happie Celebration | Idea Rejected',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: 'c8a860df-4584-4eed-82cc-a73581098185',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    title: idea.title,
                    status: req.body.reason
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })
            res.status(200).send()
        }

    } catch (error) {
        res.status(400).send(error)
    }
})

const fetchUnapprovedIdea = async (catagory) => {
    let idea
    if(catagory === 'Wish'){
        idea = await Wish.findOne({
            approvalStatus: null
        })
    } else if(catagory === 'Celebration'){
        idea = await Celebration.findOne({
            approvalStatus: null
        })
    } else {
        idea = await Gift.findOne({
            approvalStatus: null
        })
    }

    if(idea){
        idea = {...idea._doc,catagory}
    }

    return idea
}

const findUnApprovedWish = async () => {

    
    let idea = await fetchUnapprovedIdea('Wish')    

    if(!idea){
        idea = await fetchUnapprovedIdea('Celebration') 
    }

    if(!idea){
        idea = await fetchUnapprovedIdea('Gift')
    }

    return idea
}

const findUnApprovedCelebration = async () => {

    let idea = await fetchUnapprovedIdea('Celebration')    

    if(!idea){
        idea = await fetchUnapprovedIdea('Gift')
    }

    if(!idea){
        idea = await fetchUnapprovedIdea('Wish')
    }

    return idea
}

const findUnApprovedGift = async () => {
    let idea = await fetchUnapprovedIdea('Gift')    

    if(!idea){
        idea = await fetchUnapprovedIdea('Wish')
    }

    if(!idea){
        idea = await fetchUnapprovedIdea('Celebration')
    }

    return idea
}

module.exports = router