const express = require('express')
require('./db/mongoose')
const userRoutes = require('./routers/user')
const wishRoutes = require('./routers/wish')
const celebrationRoutes = require('./routers/celebration')
const giftRoutes = require('./routers/gift')
const authRoutes = require('./routers/auth-router')
// const taskRoutes = require('./routers/task')
const passport = require('passport')
const cors = require('cors')
var cookieParser = require('cookie-parser')

const app = express()
const port = process.env.PORT || 5500

//initizalzing passport
app.use(passport.initialize())
app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use('/users', userRoutes)
app.use('/wish', wishRoutes)
app.use('/celebration', celebrationRoutes)
app.use('/gift', giftRoutes)
app.use('/auth', authRoutes)
// app.use(taskRouter)

app.listen(port,() => {
    console.log("Server is up on port "+port)
})




// const User = require('./models/user')

const main = async () => {
    // const abc = await User.findById('617843f09f44179c07c2f334')
    // await abc.populate('free')
    // console.log("user-free",abc.free)

    // const abc = await User.findOne({_id:'6178d7e29d06dff106292a9c'})
    // console.log("abc",abc)

    // console.log(user)
    // await user.populate('free')
    // console.log(user.free)
    // await user.populate('tasks')
    // console.log(user.tasks)
}

// main()