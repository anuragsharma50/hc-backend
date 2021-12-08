require("dotenv").config()
const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const cors = require('cors')

let amount

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)

router.post("/", auth, async (req, res) => {
  try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            billing_address_collection: 'auto',
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                        name: 'Ideas',
                        description: 'Thanks for using Happie Celebrations, Hope you find some great ideas',
                        },
                        unit_amount: 100,
                    },
                    quantity: req.body.set,
                },
            ],
            success_url: `http://localhost:3000/success`,
            cancel_url: `http://localhost:3000/cancel`,
        })
        amount = session.amount_total / 100
        res.json({ url: session.url })
        // res.redirect(303, session.url)
    } catch (e) {
        console.log(e)
        res.status(500).json({ error: e.message })
    }
})

router.get("/savepayment",auth,async (req,res) => {
    try {
        console.log(amount)
        if(amount > 0){
            await req.user.updateOne({ prePayment: req.user.prePayment + amount })
            amount = 0
        
            await user.save()
            res.send("Payment saved successfully")
        }
    } catch (error) {
        res.status(500).json({error: "Payment not Saved Successfully"})
    }
})

module.exports = router