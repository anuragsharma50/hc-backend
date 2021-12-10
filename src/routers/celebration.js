const express = require('express')
const Celebration = require('../models/celebration')
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

router.get('/count',auth, async (req,res) => {
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
            approvedStatus: "Approved"
        }).skip((req.query.set - 1)*25 ).limit(25).sort({ gender: -1 })

        res.send({ideasCount: celebrationIdeasCount})
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/',auth, async (req,res) => {
    try {
        if(!req.user.payment) {
            res.status(401).send('Please complete payment')
        }
        else{

            if(!req.query.set){
                req.query.set = 1
            }else{
                req.query.set = parseInt(req.query.set)
            }

            const celebration = await Celebration.find({
                ocassion: req.query.ocassion,
                relation: req.query.relation, 
                minAge: {$lte: req.query.age},
                maxAge: {$gte: req.query.age},
                gender: { $in: [ req.query.gender,null ] },
                budget: {$lte: req.query.budget},
                approvedStatus: "Approved"
            },{title:1, description:1, _id:1}
            ).skip((req.query.set - 1)*25 ).limit(25).sort({ gender: -1 })

            if(celebration.length > 0) {
                req.user.payment = false
                await req.user.save()
            }

            res.send(celebration)
        }
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/me',auth, async (req,res) => {
    try {
        await req.user.populate({
            path: 'celebration',
            options: {
                sort : { createdAt: -1 }
            }
        })

        res.send(req.user.celebration)
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/save/:id',auth,async(req,res) => {
    try{
        const alreadySaved = req.user.saved.includes(req.params.id)

        if(alreadySaved){
            res.status(400).send("Already saved")
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

router.patch('/:id',auth, async (req,res) => {

    const updates = Object.keys(req.body)
    const acceptedUpdates = ['title','description','minAge','maxAge','relation','ocassion','gender']

    const isValidOperation = updates.every((update) => acceptedUpdates.includes(update))

    if(!isValidOperation){
        res.status(400).send({error:'Invalid Updates!'})
    }

    try {
        const celebration = await Celebration.findOne({ _id:req.params.id, creator: req.user._id })

        if(!celebration){
            res.status(404).send()
        }

        updates.forEach(update => celebration[update] = req.body[update])
        await celebration.save()
        res.send(celebration)

    } catch (error) {
        res.status(400).send(error)
    }

})

router.delete('/:id',auth, async (req,res) =>{
    try {
        const celebration = await Celebration.findOneAndDelete({ _id:req.params.id, creator:req.user._id })

        if(!celebration){
            res.status(404).send()
        }
        else{
            res.send(celebration)
        }
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router