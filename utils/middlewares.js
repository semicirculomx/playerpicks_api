const mongoose = require('mongoose')
const assert = require('assert')
var session = require('express-session')
const MongoStore = require('connect-mongo')(session)

async function ensureLoggedIn(req, res, next) {
    try {
        await core_ensureLoggedIn(req, {}, next)
    } catch (err) {
        console.log("access denied: ", err.message)
        res.status(401).json({ msg: 'login required' })
        return
    }
}
// does not use response in order to work with sockets too
// throws error or calls next 
async function core_ensureLoggedIn(req, _, next) {
    assert(mongoose.connection.readyState, 1)
    let user = req.user
    if (!user) { //not logged in
        throw Error("Not logged in")
    }
    // extra check
    if (!await mongoose.model('User').exists({ _id: user._id })) {
        throw Error('User Not found')
    }
    next()
}

async function ensureAdmin(req, res, next) {
    try {
        await core_ensureLoggedIn(req, {}, async () => {
            let user = await mongoose.model('User').findById(req.user._id)
            if (user.role !== 'admin') {
                throw Error("Access denied: Admin required")
            }
            next()
        })
    } catch (err) {
        console.log("Access denied: ", err.message)
        res.status(401).json({ msg: 'Admin required' })
    }
}

async function ensureSubscriber(req, res, next) {
    try {
        await core_ensureLoggedIn(req, {}, async () => {
            let user = await mongoose.model('User').findById(req.user._id)
            if (user.role !== 'subscriber' && user.role !== 'admin') {
                throw Error("Access denied: Subscriber or Admin required")
            }
            next()
        })
    } catch (err) {
        console.log("Access denied: ", err.message)
        res.status(401).json({ msg: 'Subscriber or Admin required' })
    }
}

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'session secret',
    name: 'playerpicks',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        // secret: ,  'this will encrypt my sessions'
    }),
    cookie: {
        //secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000 //30 days
    }
})

exports.sessionMiddleware = sessionMiddleware
exports.ensureLoggedIn = ensureLoggedIn
exports.core_ensureLoggedIn = core_ensureLoggedIn
exports.ensureAdmin = ensureAdmin
exports.ensureSubscriber = ensureSubscriber