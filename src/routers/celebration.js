const express = require('express')
const Celebration = require('../models/celebration')
const User = require('../models/user')
const auth = require('../middleware/auth')
const router = new express.Router()

router.post('/',auth, async (req,res) => {

    const celebration = new Celebration({
        ...req.body,
        creator: req.user._id
    })

    try {
        await celebration.save()

        res.status(201).send("Idea saved successfully")
    } catch (error) {
        res.status(400).send(error)
    }
})

router.get('/one-idea',auth,async (req,res) => {
    try {
        const wishes = await Wish.find({
            ocassion: req.query.ocassion,
            relation: req.query.relation, 
            minAge: {$lte: req.query.age},
            maxAge: {$gte: req.query.age},
            gender: { $in: [ req.query.gender,null ] },
            budget: {$lte: req.query.budget},
            approvalStatus: "Approved"
        },
        {title:1, description:1, _id:1}
        ).limit(40).sort({ gender: -1 })

        if(wishes.length > 0){
            const wish = wishes[Math.floor(Math.random() * wishes.length)]
            res.send(wish)
        } else{
            res.send()
        }

    } catch (error) {
        res.status(500).send()
    }
})

router.get('/good-idea/:id',async(req,res) => {
    try {
        const wish = await Celebration.findByIdAndUpdate(req.params.id,{ $inc: { good: 1 } })
        await wish.save()

        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/bad-idea/:id',async(req,res) => {
    try {
        const wish = await Celebration.findByIdAndUpdate(req.params.id,{ $inc: { bad: 1 } })
        await wish.save()

        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/count', async (req,res) => {
    try {
        if(!req.query.set){
            req.query.set = 1
        }else{
            req.query.set = parseInt(req.query.set)
        }

        const celebrationIdeasCount = await Celebration.count({
            ocassion: req.query.ocassion,
            relation: req.query.relation, 
            minAge: {$lte: req.query.age},
            maxAge: {$gte: req.query.age},
            gender: { $in: [ req.query.gender,null ] },
            budget: {$lte: req.query.budget}, 
            approvalStatus: "Approved"
        }).skip((req.query.set - 1)*15 ).limit(1)

        res.send({ideasCount: celebrationIdeasCount})
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/', async (req,res) => {
    try {
        req.query.set = parseInt(req.query.set)
        const celebration = await Celebration.find({
            ocassion: req.query.ocassion,
            relation: req.query.relation, 
            minAge: {$lte: req.query.age},
            maxAge: {$gte: req.query.age},
            gender: { $in: [ req.query.gender,null ] },
            budget: {$lte: req.query.budget},
            approvalStatus: "Approved"
        },{title:1, description:1, _id:1}
        ).skip((req.query.set - 1)*15 ).limit(15).sort({ gender: -1 })

        res.send(celebration)
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/save/:id',auth,async(req,res) => {
    try{
        const alreadySaved = req.user.saved.includes(req.params.id)

        if(alreadySaved){
            res.status(400).json({message: "Already saved"})
        }
        else{
            const celebration = await Celebration.findByIdAndUpdate( req.params.id, { $inc: { totalSave: 1 }})
            req.user.saved = req.user.saved.concat(req.params.id)

            await celebration.save()
            await req.user.save()
    
            res.send("Idea saved successfully")
        }
    } catch(e){
        res.status(500).send()
    }
})

// router.patch('/:id',auth, async (req,res) => {

//     const updates = Object.keys(req.body)
//     const acceptedUpdates = ['title','description','minAge','maxAge','relation','ocassion','gender']

//     const isValidOperation = updates.every((update) => acceptedUpdates.includes(update))

//     if(!isValidOperation){
//         res.status(400).send({error:'Invalid Updates!'})
//     }

//     try {
//         const celebration = await Celebration.findOne({ _id:req.params.id, creator: req.user._id })

//         if(!celebration){
//             res.status(404).send()
//         }

//         updates.forEach(update => celebration[update] = req.body[update])
//         await celebration.save()
//         res.send(celebration)

//     } catch (error) {
//         res.status(400).send(error)
//     }

// })

router.delete('/:id',auth, async (req,res) =>{
    try {
        const celebration = await Celebration.findOneAndDelete({ _id:req.params.id, creator:req.user._id })

        if(!celebration){
            res.status(404).send()
        }
        else{
            res.send("Idea deleted successfully")
        }
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router