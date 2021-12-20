require("dotenv").config(); 
const express = require('express')
const router = express.Router()
const { v4:uuidv4 } = require('uuid')
const Razorpay = require('razorpay')
const User = require('../models/user')
const auth = require('../middleware/auth')

const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET
})

router.post('/verification', async (req, res) => {
	// do a validation
	const secret = 'paisa'

	const crypto = require('crypto')

	const shasum = crypto.createHmac('sha256', secret)
	shasum.update(JSON.stringify(req.body))
	const digest = shasum.digest('hex')

	if (digest === req.headers['x-razorpay-signature']) {
		try {
			const prePayment = req.body.payload.payment.entity.amount/1900
			const user = await User.findOne({orderid:req.body.payload.payment.entity.order_id})
			await user.updateOne({ prePayment: user.prePayment + prePayment })
			user.orderid = null
	
			await user.save()
		} catch (error) {
			// res.status(500).send()
			console.log("unable to save payment in database")
		}
	} else {
		// pass it
		console.log("Invalid request")
	}
	res.json({ status: 'ok' })
})

router.post('/',auth, async (req, res) => {

	const payment_capture = 1
	const amount = 19*req.body.set
	const currency = 'INR'

	const options = {
		amount: amount * 100,
		currency,
		receipt: uuidv4(),
		payment_capture
	}

	try {
		const response = await razorpay.orders.create(options)
		req.user.orderid = response.id
		req.user.save()
		res.json({
			id: response.id,
			currency: response.currency,
			amount: response.amount
		})
	} catch (error) {
		console.log(error)
	}
})

module.exports = router