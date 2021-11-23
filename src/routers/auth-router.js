const router = require('express').Router();
const passport = require('passport')
const User = require('../models/user')
const auth = require('../middleware/auth')
const passportSetup = require('../config/passport-setup')
const jwt = require('jsonwebtoken')
let currentUser = null

// Username & password signup
router.post('/signup', async (req,res) => {
    const user = new User(req.body)

    try{
        await user.save()
        const token = await user.generateAuthToken()
        currentUser = {...user.doc,token}
        res.status(201).send('Signup successfully')
    }catch(e){
        res.status(400).json({message: "This email is already taken. Please log in."})
    }
})

// username and password signin
router.post('/signin', async (req,res) => {
    try {
        const user = await User.findByCrediantials(req.body.email,req.body.password)
        const token = await user.generateAuthToken()
        currentUser = {...user.doc,token}
        res.send('Successfully logged in')
    } catch (e) {
        res.status(401).json({message: e.message})
    }
})

// auth logout
router.get('/signout',auth, async (req, res) => {
    if(req.cookies.jwt) {
        req.user.tokens = req.user.tokens.filter(token => { return token.token !== req.token })
        await req.user.save()
        currentUser = null
        req.logOut()
        res.status(202).clearCookie('jwt').send("Logout successfull")
    }
    else{
        res.status(401).json({ error: 'login karle yaar' })
    }
});

// auth logout
// router.get('/signout', (req, res) => {
//     if(req.cookies.jwt) {
//         currentUser = null
//         req.logOut()
//         res.status(202).clearCookie('jwt').send("Logout successfull")
//     }
//     else{
//         res.status(401).json({ error: 'login karle yaar' })
//     }
// });

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
    res.redirect('http://localhost:3000/')
})

router.get('/facebook', passport.authenticate('facebook',{ scope: 'email',session: false }));

router.get('/facebook/callback',
    passport.authenticate('facebook',{ session: false }),(req,res) => {
        currentUser = req.user
        res.redirect('http://localhost:3000/')
});

router.get('/amazon',passport.authenticate('amazon',{ scope: ['profile'],session: false }));

router.get('/amazon/callback', 
  passport.authenticate('amazon', { session: false }),(req, res) => {
    currentUser = req.user
    res.redirect('http://localhost:3000/');
});

router.get('/getuser',async (req,res) => {
    if(req.cookies.jwt){
        if(!currentUser){
            const decoded = jwt.verify(req.cookies.jwt,process.env.JWT_SECRET_KEY)
            const user = await User.findOne({ _id: decoded._id, 'tokens.token':req.cookies.jwt})
            currentUser = user
        }
        res.status(200).send(currentUser)
    }
    else if(currentUser){
        const token = currentUser.token
        delete currentUser.token
        res.status(201)
        .cookie('jwt', token, {
            sameSite: 'strict',
            path: '/',
            expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        }).send(currentUser)
    }
    else{
        res.status(401).json({error: "Please login"})
    }
})

// router.get('/kuuki',(req,res) => {
//     res.status(202)
//     .cookie('Name', 'Rahul Ahire', {
//         sameSite: 'strict',
//         path: '/',
//         expires: new Date(new Date().getTime() + 20 * 1000),
//         httpOnly: true,
//     }).send("cookie being initialised")
// })

module.exports = router;
