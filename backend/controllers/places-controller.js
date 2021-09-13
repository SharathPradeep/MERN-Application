const { validationResult } = require('express-validator');
const getCoordsForAddress = require('../utils/location');
const mongoose = require('mongoose');

const Place = require('../models/place-schema');
const User = require('../models/user-schema');
const httpError = require('../models/httpError');

const getPlaceById = async (req, res, next) => {
    const pid = req.params.pid;
    let place;
    try {
        place = await Place.findById(pid).exec();
    } catch (err) {
        return next(new httpError('Something went wrong, Could not find a place.', 500));
    }

    if (!place) {
        return next(new httpError('Could not find a place for the provided id.', 404));
    }

    res.json({ place: place.toObject({ getters: true }) });
}

const getPlacesByUserId = async (req, res, next) => {
    const uid = req.params.uid;
    let userWithPlaces;
    try {
        userWithPlaces = await User.findById(uid).populate('places');
    } catch (err) {
        return next(new httpError('Fetching places failed, please try again later', 500));
    }

    if (!userWithPlaces || userWithPlaces.places.length === 0) {
        return next(new httpError('Could not find places for the provided user id.', 404));
    }

    res.json({ places: userWithPlaces.places.map(place => place.toObject({ getters: true })) });
}

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new httpError('Invalid inputs passed,please check your data', 422));
    }

    const { title, description, address, creator } = req.body;

    let coordinates;
    coordinates = await getCoordsForAddress(address);

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: 'https://www.theincmagazine.com/wp-content/uploads/2021/02/Dubai-Roadmap-of-Worlds-Happiest-City.jpg',
        creator
    });

    let user;

    try {
        user = await User.findById(creator);
    } catch (err) {
        return next(new httpError('Creating place failed, please try again.', 500));
    }

    if (!user) {
        return next(new httpError('Could not find user for provided id', 404));
    }



    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();

    } catch (err) {
        return next(new httpError('Creating place failed, please try again.', 500));
    }


    res.status(201).json({ message: "Place added successfully", place: createdPlace });

}

const updatePlace = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new httpError('Invalid inputs passed,please check your data', 422));
    }



    const { title, description } = req.body;
    const placeId = req.params.pid;


    try {
        await Place.findByIdAndUpdate(placeId, { title: title, description: description });
    } catch (err) {
        return next(new httpError('Something went wrong, could not update place.', 500));
    }


    res.status(200).json({ message: "Place Updated" });
}

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate('creator');
    } catch (err) {
        return next(new httpError('Something went wrong, could not delete place.', 500));
    }

    if (!place) {
        return next(new httpError('Could not find place for this id.', 404));
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        return next(new httpError('Something went wrong, could not delete place.', 500));
    }

    res.status(200).json({ message: "Place deleted" });
}

exports.deletePlace = deletePlace;

exports.updatePlace = updatePlace;

exports.createPlace = createPlace;

exports.getPlacesByUserId = getPlacesByUserId;

exports.getPlaceById = getPlaceById;