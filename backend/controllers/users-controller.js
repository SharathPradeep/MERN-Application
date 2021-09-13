const httpError = require('../models/httpError');
const { validationResult } = require('express-validator');
const User = require('../models/user-schema');


const getUsers = async (req, res, next) => {

    let users;

    try {
        users = await User.find({}, '-password');
    } catch (err) {
        return next(new httpError('Could not fetch users, please try again later.', 500));
    }

    if (!users) {
        return next(new httpError('There are no users', 404));
    }

    res.status(200).json({ users: users.map((user) => user.toObject({ getters: true })) });
}

const signup = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new httpError('Invalid inputs passed,please check your data', 422));
    }

    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        return next(new httpError('Signing up failed, please try again later.', 500));
    }

    if (existingUser) {
        return next(new httpError('User already exists, try again with another email.', 422));
    }

    const createdUser = new User({
        name,
        email,
        password,
        image: 'https://live.staticflickr.com/7631/26849088292_36fc52ee90_b.jpg',
        places: []
    });

    try {
        await createdUser.save();
    } catch (err) {
        return next(new httpError('Signing up failed, please try again later.', 500));
    }


    res.status(201).json({ message: "User Created", user: createdUser.toObject({ getters: true }) });
}

const login = async (req, res, next) => {
    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        return next(new httpError('Logging in failed, please try again later.', 500));
    }

    if (!existingUser || existingUser.password !== password) {
        return next(new httpError('Invalid credentials, could not log you in.', 401));
    }

    res.status(200).json({ message: "Logged in!" });
}

exports.getUsers = getUsers;

exports.signup = signup;

exports.login = login;

