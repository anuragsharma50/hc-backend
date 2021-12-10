require("dotenv").config()
const router = require('express').Router()
const passport = require('passport')
const User = require('../models/user')
const Temp = require('../models/temp')
const auth = require('../middleware/auth')
const passportSetup = require('../config/passport-setup')
const jwt = require('jsonwebtoken')
let currentUser = null
const referralCodes = require('referral-codes')
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// // Username & password signup
// router.post('/signup', async (req,res) => {
//     const user = new User(req.body)

//     try{
//         await user.save()
//         const token = await user.generateAuthToken()
//         currentUser = {...user._doc,token}
//         res.status(201).send('Signup successfully')
//     }catch(e){
//         res.status(400).json({message: "This email is already taken. Please log in."})
//     }
// })

// Username & password signup
router.post('/signup', async (req,res) => {
    try{
        const user = await User.findOne({email:req.body.email})
        if(user){
            res.status(400).json({message: "hlo"})   
        } else{
            const otp = referralCodes.generate({ length: 6, charset: "0123456789" })[0]
            const tempuser = new Temp({...req.body,otp})
            await tempuser.save()
            const token = await tempuser.generateAuthToken()
            currentUser = {...tempuser._doc,token,unverified:true}

            const msg = {
                to: tempuser.email,
                from: 'anuragsh868@gmail.com',
                subject: 'Happie Celebration | Verification code',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: '97d436d1-6dc8-4473-82ac-5ec8ea9d62df',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    otp: tempuser.otp,
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })

            res.status(201).send('Signup successfully')
        }
    }catch(e){
        res.status(400).json({message: "You already have an account with this email. Please log in."})
    }
})

// username and password signin
router.post('/signin', async (req,res) => {
    try {
        let user
        try {
            user = await User.findByCrediantials(req.body.email,req.body.password)
        } catch (error) {
            console.log(error)
        }
        if(user){
            const token = await user.generateAuthToken()
            currentUser = {...user._doc,token}
        }
        else {
            const tempuser = await Temp.findByCrediantials(req.body.email,req.body.password)
            const token = await tempuser.generateAuthToken()
            const otp = referralCodes.generate({ length: 6, charset: "0123456789" })[0]
            tempuser.otp = otp
            tempuser.updatedAt = new Date()
            await tempuser.save()
            currentUser = {...tempuser._doc,token,unverified:true}

            const msg = {
                to: tempuser.email,
                from: 'anuragsh868@gmail.com',
                subject: 'Happie Celebration | Verification code',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: '97d436d1-6dc8-4473-82ac-5ec8ea9d62df',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    otp: tempuser.otp,
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })

        }
        res.send('Successfully logged in')
    } catch (e) {
        res.status(401).json({message: "Email or password is incorrect"})
    }
})

// logout
router.get('/signout',auth, async (req, res) => {
    if(req.cookies.jwt) {
        req.user.tokens = req.user.tokens.filter(token => { return token.token !== req.token })
        await req.user.save()
        currentUser = null
        req.logOut()
        res.status(202).clearCookie('jwt').send("Logout successfull")
    }
    else{
        res.status(401).json({ error: 'Something went wrong' })
    }
});

// auth with google+
router.get('/google', passport.authenticate('google',{
    scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ],session: false
}));

// Callback route for google to redirect
router.get('/google/callback',passport.authenticate('google',{ session: false }),(req,res) => {
    currentUser = req.user
    res.redirect(process.env.FRONTEND)
})

// auth with fb
router.get('/facebook', passport.authenticate('facebook',{ scope: 'email',session: false }));

// Callback route for fb to redirect
router.get('/facebook/callback',
    passport.authenticate('facebook',{ session: false }),(req,res) => {
        currentUser = req.user
        res.redirect(process.env.FRONTEND)
});

// auth with amazon
router.get('/amazon',passport.authenticate('amazon',{ scope: ['profile'],session: false }));

// Callback route for amazon to redirect
router.get('/amazon/callback', 
  passport.authenticate('amazon', { session: false }),(req, res) => {
    currentUser = req.user
    res.redirect(process.env.FRONTEND);
});

// verify otp
router.post('/verifyotp',auth,async(req,res) => {
    try {
        const timeout = Math.abs(new Date() - new Date(req.user.updatedAt))/1000
        if(timeout > 20*60){
            res.status(401).json({message: "Verification Code expired"})
        }
        else if(req.user.otp === req.body.otp){
            const user = new User({email:req.user.email,password:req.user.password,
                username:req.user.username})
            res.clearCookie('jwt')
            const token = await user.generateAuthToken()
            currentUser = {...user._doc,token}
            res.status(200).send("Otp verified successfully")
        }
        else{
            res.status(401).json({message: "Verification code mismatched.Please try again"})
        }
    } catch (error) {
        res.status(500).send()
    }
})

// Get user data
router.get('/getuser',async (req,res) => {
    if(req.cookies.jwt){
        if(!currentUser){
            const decoded = jwt.verify(req.cookies.jwt,process.env.JWT_SECRET_KEY)
            currentUser = await User.findOne({ _id: decoded._id, 'tokens.token':req.cookies.jwt})
            if(!currentUser){
                temp = await Temp.findOne({ _id: decoded._id, 'tokens.token':req.cookies.jwt})
                let email = temp.email
                let username = temp.username
                let unverified = true
                currentUser = {email,username,unverified}
            }
        }
        res.status(200).send(currentUser)
    }
    else if(currentUser){
        expireTime = currentUser.unverified ? new Date(new Date(currentUser.createdAt).getTime() + 24 * 60 * 60 * 1000)
            : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)

        const token = currentUser.token
        delete currentUser.token
        delete currentUser.tokens
        delete currentUser.otp
        delete currentUser.createdAt
        delete currentUser.updatedAt
        delete currentUser.password
        delete currentUser._id
        res.status(200)
        .cookie('jwt', token, {
            sameSite: 'strict',
            path: '/',
            expires: expireTime,
            httpOnly: true,
        }).send(currentUser)
    }
    else{
        res.status(401).json({error: "Please login"})
    }
})

module.exports = router;
