const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const mongoose = require('mongoose');
const webpush = require('web-push');

const { sessionMiddleware } = require('./utils/middlewares');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');

const winston = require('winston');

// Configurar el logger de Winston
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log' })
  ]
});

const pre_populate = require('./dummy-data/pre_populate');
require('dotenv').config();

const app = express();
const passport = require('./passport');

app.use(sessionMiddleware);

// setup the logger
app.use(morgan('combined'));
app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

webpush.setVapidDetails(
    process.env.WEB_PUSH_CONTACT,
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
);

app.use('/api', apiRouter);
app.use('/auth', authRouter);

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salio mal!' });
});

mongoose
    .connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/playerpicks', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.log('Connected to database!');
        pre_populate();
    })
    .catch((err) => {
        console.log('Error starting database', err);
        process.exit(1);
    });

module.exports = app;
