const express = require('express')
const User = require('../models/user')
const auth = require('../middleware/auth')
const referralCodes = require('referral-codes')
const router = new express.Router()

const Wish = require('../models/wish')
const Celebration = require('../models/celebration')
const Gift = require('../models/gift')

// router.post('/', async (req,res) => {
//     const user = new User(req.body)
    
//     try{
//         await user.save()
//         const token = await user.generateAuthToken()
//         res.status(201).send({user,token})
//     }catch(e){
//         res.status(400).send(e)
//     }
// })

// router.post('/login', async (req,res) => {
//     try {
//         const user = await User.findByCrediantials(req.body.email,req.body.password)
//         const token = await user.generateAuthToken()
//         res.send({user,token})
//     } catch (e) {
//         res.status(400).send(e)
//     }
// })

// router.get('/me',auth, async (req,res) => {
//     res.send(req.user)
// })

router.post('/currency',auth, async (req,res) => {
    try {
        if(!req.user.currency){
            console.log("here")
            req.user.currency = req.body.currency
            await req.user.save()
        }
        console.log(req.user.currency)
        res.status(200).send()
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/myideas',auth, async (req,res) => {
    try {
        await req.user.populate({
            path: 'wishes',
            options: {
                sort : { createdAt: -1 }
            }
        })

        await req.user.populate({
            path: 'celebration',
            options: {
                sort : { createdAt: -1 }
            }
        })

        await req.user.populate({
            path: 'gift',
            options: {
                sort : { createdAt: -1 }
            }
        })

        const {wishes,celebration,gift} = req.user

        res.send([...wishes,...celebration,...gift])
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

        res.status(400).json({error:"Nothing is saved"})

    } catch (e) {
        res.status(500).send()
    }
})

// router.post('/logout',auth,async(req,res) => {
//     try{
//         req.user.tokens = req.user.tokens.filter(token => {
//             return token.token !== req.token
//         })
//         await req.user.save()

//         res.send()
//     } catch(e) {
//         res.status(500).send()
//     }
// })

// router.post('/logoutAll',auth,async(req,res) => {
//     try{
//         req.user.tokens = []
//         await req.user.save()

//         res.send()
//     } catch(e){
//         res.status(500).send()
//     }
// })

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

router.post('/payment',auth,async(req,res) => {
    try{
        if(!req.user.referralcode){
            const code = referralCodes.generate({
                length: 6
            })
            const referralcode = code[0]
            await req.user.updateOne({ referralcode,payment:true,referred:true })
        } else{
            await req.user.updateOne({ payment:true })
        }

        await req.user.save()

        res.send()
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

// Will delete later
// router.get('/', async (req,res) => {
//     try {
//         const users = await User.find({})
//         res.send(users)
//     } catch (error) {
//         res.status(500).send()
//     }
// })

router.patch('/me',auth, async (req,res) => {

    const updates = Object.keys(req.body)
    const allowedUpdates = ['username','password','age','gender']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation){
        return res.status(400).send({error: "Invalid Updates!"})
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (error) {
        res.status(400).send(e)
    }

})

router.delete('/me',auth, async (req,res) =>{
    try {
        await req.user.remove()
        res.send(req.user)
    } catch (error) {
        res.status(500).send(error)
    }

})


module.exports = router