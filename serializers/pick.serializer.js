const mongoose = require('mongoose');
const { serializeUser } = require('./user.serializer');

exports.serializePick = async (pick, client) => {
  if (!pick) {
    return;
  }
  if (!(pick instanceof mongoose.Document)) {
    throw Error('Unknown pick type');
  }
  pick = await pick
    .populate('user')
    .populate({
        path: 'bets.match'
    })
    .execPopulate();
  if (!pick.user)
    throw Error("Picks doesnt have a user field")
  let user = await serializeUser(pick.user, client)
  pick = pick.toObject();
  return {
    ...pick,
    user
  };
};

exports.serializePicks = async (picks = []) => {
  if (!(picks instanceof Array)) {
    throw Error('Unknown type');
  }
  return Promise.all(picks.map((pick) => this.serializePick(pick)));
};