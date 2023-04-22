const mongoose = require('mongoose')
require('mongoose-long')(mongoose)
const internal_setting = require('./internal_setting.model')
const User = require('./user.model')
const Hashtag = require('./hashtag.model')
const home_timeline = require('./home_timeline.model')

const matchSchema = mongoose.Schema({
    id: { type: mongoose.Schema.Types.Long, unique: true },
    id_str: { type: String, unique: true },
    away_team: {
      type: String,
      required: false,
      default: 'N/A'
    },
    home_team: {
      type: String,
      required: false,
      default: 'N/A'
    },
    commence_time: {
      type: Date,
      required: false,
      default: Date.now
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    match_id: {
      type: String,
      required: false,
      default: 'N/A'
    },
    matchTitle: {
      type: String,
      required: false,
      default: 'N/A'
    },
    sport: {
      type: String,
      required: false,
      default: 'N/A'
    },
    competition: {
      type: String,
      required: false,
      default: 'N/A'
    },
    is_value_match: {
      type: Boolean,
      required: false,
      default: false
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
      }
    ],
    picks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pick'
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'won', 'lost', 'void'],
      default: 'pending'
    },
    deleted: {
      type: Boolean,
      required: false,
      default: false
    },
    bookmaker: {
      key: { type: String },
      title: { type: String },
      last_update: { type: String },
      markets: [
        {
          key: { type: String },
          outcomes: [
            {
              name: { type: String },
              price: { type: Number },
            },
          ],
        },
      ],
    },
  });

/**
* addes a match for specific user
* @param {String} username - screen_name of user
* @param {Object} match - match body (partial) to add, must-have feilds: text, ...
* @returns {Promise} -  One returned by mongoose
*/

matchSchema.statics.addOne = async ({
    match
  }, pickId, postId) => {
    let matchStored
    const id = await match_genId()
    const id_str = id.toString()
      matchStored = await mongoose.model('Match').findOneAndUpdate(
        { match_id: match.match_id },
        {
          $setOnInsert: {
            ...match,
            ...(!match.id ? { id } : {}),
            ...(!match.id_str ? { id_str } : {}),
          },
          $addToSet: {
            picks: pickId || null,
            posts: postId || null,
          },
        },
        { upsert: true, new: true }
      )
  
      matchStored.picks.pull(null)
      matchStored.posts.pull(null)
      await matchStored.save()
        return matchStored
    }

// Define the static function to retrieve all matches
matchSchema.statics.getMatches = async ({query, isBestMatchOnly = false, page = 1}) => {
    let p = parseInt(page);
    const s = 15;
    let matches;
     if (isBestMatchOnly) {
      matches = await mongoose.model('Match')
      .find({...query, is_value_match: true})
      .skip(s * (p - 1))
      .limit(s)
      .populate({
        path: 'picks',
        path: 'posts',
      }).exec();

    } 
    else {
      matches = await mongoose.model('Match').find(query).skip(s * (p - 1)).limit(s).populate({
        path: 'posts',
        path: 'picks',
      }).exec();
    }
    matches = matches.map(obj => obj);

    return matches
  }


async function match_genId() {
    /**
    * generates simple incrementing value
    * last value alotted is stored in internals collection as last_id_allotted
    */
    await internal_setting.updateOne({ ver: '1.0' }, {
        $inc: { current_match_id: 1 }
    }, { upsert: true })
    let { current_match_id } = await internal_setting.findOne({ ver: '1.0' }, 'current_match_id');
    return current_match_id;
}

module.exports = mongoose.model('Match', matchSchema);