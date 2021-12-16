const express = require('express')
const Wish = require('../models/wish')
const auth = require('../middleware/auth')
const router = new express.Router()

router.post('/',auth, async (req,res) => {

    const wish = new Wish({
        ...req.body,
        creator: req.user._id
    })

    try {
        await wish.save()

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

        const wishesCount = await Wish.count({
            ocassion: req.query.ocassion,
            relation: req.query.relation, 
            minAge: {$lte: req.query.age},
            maxAge: {$gte: req.query.age},
            gender: { $in: [ req.query.gender,null ] },
            budget: {$lte: req.query.budget}, 
            approvedStatus: "Approved"
        }).skip((req.query.set - 1)*25 ).limit(25)

        res.send({ideasCount: wishesCount})
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
            req.query.set = parseInt(req.query.set)
            if(req.query.set === 1){
                req.user.saveAvaliable =  3    
            }else{
                req.user.saveAvaliable = req.user.saveAvaliable + 3
            }
            const wishes = await Wish.find({
                ocassion: req.query.ocassion,
                relation: req.query.relation, 
                minAge: {$lte: req.query.age},
                maxAge: {$gte: req.query.age},
                gender: { $in: [ req.query.gender,null ] },
                budget: {$lte: req.query.budget},
                approvedStatus: "Approved"
            },{title:1, description:1, _id:1}
            ).skip((req.query.set - 1)*25 ).limit(25).sort({ gender: -1 })

            if(wishes.length > 0) {
                req.user.payment = false
                await req.user.save()
            }
            
            res.send(wishes)
        }
    } catch (error) {
        res.status(500).send()
    }
})

router.get('/save/:id',auth,async(req,res) => {
    try{
        const alreadySaved = req.user.saved.includes(req.params.id)

        if(alreadySaved){
            res.status(400).json({message: "Already saved"})
        } else if(!req.user.paid){
            res.status(400).json({message:"Unpaid Ideas"})
        }else if(req.user.saveAvaliable === 0){
            res.status(400).json({message:"Save limit reached"})
        }
        else{
            const wish = await Wish.findByIdAndUpdate( req.params.id, { $inc: { totalSave: 1 }})
            req.user.saved = req.user.saved.concat(req.params.id)
            req.user.saveAvaliable -= 1
            await wish.save()
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
        const wish = await Wish.findOne({ _id:req.params.id, creator: req.user._id })

        if(!wish){
            res.status(404).send()
        }

        updates.forEach(update => wish[update] = req.body[update])
        await wish.save()
        res.send(wish)

    } catch (error) {
        res.status(400).send(error)
    }

})

router.delete('/:id',auth, async (req,res) =>{
    try {
        const wish = await Wish.findOneAndDelete({ _id:req.params.id, creator:req.user._id })

        if(!wish){
            res.status(404).send()
        }
        else{
            res.send(wish)
        }
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router