const express = require('express')
const User = require('../models/user')
const auth = require('../middleware/auth')
const referralCodes = require('referral-codes')
const router = new express.Router()

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

router.post('/logout',auth,async(req,res) => {
    try{
        req.user.tokens = req.user.tokens.filter(token => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    } catch(e) {
        res.status(500).send()
    }
})

router.post('/logoutAll',auth,async(req,res) => {
    try{
        req.user.tokens = []
        await req.user.save()

        res.send()
    } catch(e){
        res.status(500).send()
    }
})

router.post('/payment',auth,async(req,res) => {
    try{
        if(!req.user.referral){
            const code = referralCodes.generate({
                length: 6
            })
            const referral = code[0]
            await req.user.updateOne({ referral,payment:true,referred:true })
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
    try{
        if(req.user.referral === req.body.referral){
            return res.status(400).send({error: "You can't use your own referral"})
        }

        if(req.user.referred){
            return res.status(400).send({error: "Sorry, you have already availed the offer!"})
        }

        const referredBy = await User.findOne({ referral:req.body.referral })
        
        if(!referredBy){
            return res.status(400).send({error: "Invalid Code"})
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

router.get('/me',auth, async (req,res) => {
    res.send(req.user)
})

router.patch('/me',auth, async (req,res) => {

    const updates = Object.keys(req.body)
    const allowedUpdates = ['email','password','age','gender']
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