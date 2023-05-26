const express = require('express')
const passport = require('passport')
const User = require('../models/user.model')
const { ensureLoggedIn } = require('../utils/middlewares')
const { filterInput } = require('../utils/helpers')
const bcrypt = require('bcryptjs');
const { serializeUser } = require('../serializers/user.serializer')
const Auth = require('../models/auth.model')


// const { destroyAuthSession: destroySocketSession } = require('../socketApi')

const router = express.Router()

router.post('/login', passport.authenticate('local'), async (req, res) => {
    try {
        res.json({
            user: await User.findById(req.user._id),
            message: 'logged in',
        })
    } catch (err) {
        console.log('error in /login', err)
        res.status(500).json({
            msg: 'Something went wrong!, cannot process your request at this moment!',
        })
    }
})

router.get('/login', ensureLoggedIn, async (req, res) => {
    try {
        res.json({
            user: await User.findById(req.user._id),
            message: 'logged in',
        })
    } catch (err) {
        console.log('error in get.login (checks if logged in)', err)
        res.status(500).json({
            msg: 'Something went wrong cannot process your request right now',
        })
    }
})

router.post('/logout', (req, res) => {
    let { socketId } = req.session
    req.logout()
    req.session.destroy(err => {
        if (err) console.log('error /logout', err)
        res.redirect('/')
    })
    // destroySocketSession(socketId)
})

router.post('/signup', async (req, res) => {
    try {
        let { password, fullname, username } = req.body
        password = filterInput(password, 'password')
        username = filterInput(username, 'username', { min_length: 4 })
        fullname = filterInput(fullname, 'name', { min_length: 0 })
        if (await User.exists({ screen_name: username })) {
            res.status(409).json({
                message: 'username is taken',
            })
            return
        }
        let user = await User.createNew(
            {
                screen_name: username,
                name: fullname,
            },
            { password }
        )
        if (user)
            req.login(
                {
                    _id: user._id,
                },
                err => {
                    if (err) {
                        console.log('error logging in new user', err)
                        res.status(409).json({
                            message: 'nuevo usuario creado pero no logueado',
                        })
                        return
                    }
                    res.json({
                        message: 'nuevo usuario creado y logueado',
                        user,
                    })
                }
            )
        console.log('nuevo usuario')
    } catch (err) {
        console.log('error in /signup', err)
        res.status(400).json({
            message: 'Your request could not be completed',
        })
    }
})
/*** */
router.post('/password-reset', async (req, res) => {
    try {
        const { username, newPassword, confirmPassword } = req.body;

        // Validar que los campos no estén vacíos y que la nueva contraseña coincida con la confirmación
        if (!username || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Faltan datos.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'La nueva contraseña no coincide con la confirmación.' });
        }

        // Buscar al usuario en la base de datos
        // Generar el hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        let user = await User.findOne({ screen_name: username }, '_id');
        let auth = await Auth.findOneAndUpdate({user_id: user._id},
            {
                $set: {
                    passwordHash: hashedPassword
                },
            })
        if (user && auth) {
            res.json({ message: 'Contraseña cambiada exitosamente.' });
        } else throw Error('No se ha encontrado un usuario asociado a ese nombre')
    } catch (err) {
        console.log('error in /password-reset', err);
        res.status(500).json({ message: 'No podemos procesar tu registro en este momento. Espera unos minutos y vuelve a intentar!' });
    }
});

module.exports = router
