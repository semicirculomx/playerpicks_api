const mongoose = require('mongoose');

exports.serializePick = async (pick, client, level = 0) => {
  if (level > 1) {
    return;
  }
  if (!pick) {
    return;
  }
  if (!(pick instanceof mongoose.Document)) {
    throw Error('Unknown pick type');
  }
  pick = await pick
    .populate({
        path: 'bets.match'
    })
    .populate({ path: 'user' })
    .execPopulate();

  pick = pick.toObject();
  return {
    ...pick,
  };
};

exports.serializePicks = async (picks = [], client) => {
  if (!(picks instanceof Array)) {
    throw Error('Unknown type');
  }
  return Promise.all(picks.map((pick) => this.serializePick(pick, client)));
};