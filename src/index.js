require("dotenv").config(); 
const express = require('express')
require('./db/mongoose')
const userRoutes = require('./routers/user')
const wishRoutes = require('./routers/wish')
const celebrationRoutes = require('./routers/celebration')
const giftRoutes = require('./routers/gift')
const approverRoutes = require('./routers/approver')
const paypalRoutes = require('./routers/paypal')
const authRoutes = require('./routers/auth-router')
const razorpayRoutes = require('./routers/razorpay')
const stripeRoutes = require('./routers/stripe')
const passport = require('passport')
const cors = require('cors')
var cookieParser = require('cookie-parser')
const path = require('path')

const app = express()
const port = process.env.PORT || 5500

// if(process.env.NODE_ENV === 'production') {
//     app.use((req, res, next) => {
//       if (req.header('x-forwarded-proto') !== 'https')
//         res.redirect(`https://${req.header('host')}${req.url}`)
//       else
//         next()
//     })
// }

//initizalzing passport,cors etc.
app.use(passport.initialize())
app.use(cors({
    origin: process.env.FRONTEND,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use('/users', userRoutes)
app.use('/wish', wishRoutes)
app.use('/celebration', celebrationRoutes)
app.use('/gift', giftRoutes)
app.use('/approver', approverRoutes)
app.use('/paypal', paypalRoutes)
app.use('/razorpay',razorpayRoutes);
app.use('/stripe',stripeRoutes);
app.use('/auth', authRoutes)

// Logo (for Razorpay)
app.get('/logo.png', (req, res) => {
	res.sendFile(path.join(__dirname, './assets/logo.png'))
})

app.listen(port,() => {
    console.log("Server is up on port "+port)
})