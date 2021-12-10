require("dotenv").config()
const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const paypal = require("@paypal/checkout-server-sdk")

const Environment =
  process.env.NODE_ENV === "production"
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment

const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_KEY,
    process.env.PAYPAL_SECRET
  )
)

router.post("/create-order",auth, async (req, res) => {   
    try {
        if(!req.body.set === (1 || 3 || 5 ||10)){
            res.status(500).json({error:"Something went wrong"})
        }

        else{
            const amount = req.body.set*1 + req.body.set*0.05 + 0.5
        
            const request = new paypal.orders.OrdersCreateRequest()
            request.prefer("return=representation")
            request.requestBody({
                intent: "CAPTURE",
                purchase_units: [
                {
                    amount: {
                    currency_code: "USD",
                    value: amount,
                    },
                },
                ],
                application_context: {
                    shipping_preference: "NO_SHIPPING",
                },
            })
            const order = await paypalClient.execute(request)
            res.json({ id: order.result.id })
        }
    } catch (e) {
        res.status(500).json({ error: e.message })
    }


})

module.exports = router