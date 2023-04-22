const mongoose = require('mongoose')
require('mongoose-long')(mongoose)
const internal_setting = require('./internal_setting.model')
const User = require('./user.model')
const Hashtag = require('./hashtag.model')
const home_timeline = require('./home_timeline.model')
const Notification = require('./notification.model')
const Match = require('./match.model')
const {checkMatches} = require('../utils/helpers')

const pickSchema = mongoose.Schema({
    "id": { type: mongoose.Schema.Types.Long, unique: true },
    "id_str": { type: String, unique: true },
    "user": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    "bets": [{

        "match": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match'
        },
        "market": {
            type: String,
            index: 'text',
            required: false
        },
        "odds": { 
            type: Number,
            required: false
        },
        
    }],
    "pick_title": {
        type: String,
        index: 'text',
        required: false
    },
    "stake": {
        type: String,
        index: 'text',
        required: false
    },
    "profit": {
        type: Number,
        required: false
    },
    "lastUserBank":  {
        type: Number,
        required: false
    },
    "totalOdds": {
        type: String,
        required: false
    },
    "status": 
    {type: String,
     enum: ['pending', 'won', 'lost', 'void'], 
     default: 'pending'
    },
    "created_at": { type: Date, default: Date.now },
    
})
let sPage = 15

/**
* addes a pick for specific user
* @param {String} username - screen_name of user
* @param {Object} pick - pick body (partial) to add, must-have feilds: text, ...
* @returns {Promise} -  One returned by mongoose
*/
pickSchema.statics.addOne = async function ({
    username: screen_name = null,
    user_id = null
}, pick) {
    const id = await pick_genId()
    const id_str = id.toString()
    if (!user_id) {
        let { _id } = await User.findOne({ screen_name }, '_id');
        user_id = _id;
    }

    return await mongoose.model('Pick').create({
        ...pick,
        id: id,
        id_str: id_str,
        user: user_id,
    })
}

pickSchema.statics.getPicks = async ({query, page = 1}) => {
    let p = parseInt(page);
    const s = 15;
    let picks;
      picks = await mongoose.model('Pick')
      .find({...query})
      .skip(s * (p - 1))
      .limit(s)
      .populate({
        path: 'user',
      }).populate({
        path: 'bets.match',
      }).exec();

      picks = picks.map(obj => obj);

    return picks
  }

pickSchema.statics.getUserTimeline = async function ({
    username: screen_name = null,
    user_id = null
}, page = 1) {
    if (!user_id) {
        let { _id } = await mongoose.model("User").findOne({ screen_name: screen_name }, "_id")
        if (!_id)
            throw Error('Cannot find User')
        user_id = _id
    }
    return this.find({
        user: user_id
    }).sort("-created_at")
        .skip(sPage * (page - 1))
        .limit(sPage)
}

  pickSchema.post('save', async (doc, next) => {
    // update timeline of followers, and itself
    let quer = await mongoose.model('Friendship').findOne({ user_id: doc.user }, 'follower_ids');
    if (quer) {
        await mongoose.model('home_timeline')
            .bulkAddPicks(quer.follower_ids.concat(doc.user), { id_pick_added: doc._id });
    }
    next();
});
pickSchema.pre('deleteMany', { document: true, query: true }, next => {
    next(new Error('deletemany is not configured yet, use deleteOne instead'));
});
/** QUERY middleware */
pickSchema.post('deleteOne', { document: true, query: true }, async doc => {
    try {
        //update statuses_count in User
        // await mongoose.model('User').findOneAndUpdate({ _id: doc.user }, {
        //     $inc: { statuses_count: 1 }
        // });
        // update  follower's and itself's timeline,
        let quer = await mongoose.model('Friendship').findOne({ user_id: doc.user }, 'follower_ids');
        if (quer) {
            await mongoose.model('home_timeline')
                .bulkRemovePicks(quer.follower_ids.concat(doc.user), { id_pick_removed: doc._id });
        }
    } catch (err) {
        console.log(err)
        throw err
    }
});
async function pick_genId() {
    /**
    * generates simple incrementing value
    * last value alotted is stored in internals collection as last_id_allotted
    */
    await internal_setting.updateOne({ ver: '1.0' }, {
        $inc: { current_pick_id: 1 }
    }, { upsert: true })
    let { current_pick_id } = await internal_setting.findOne({ ver: '1.0' }, 'current_pick_id');
    return current_pick_id;
}

module.exports = mongoose.model('Pick', pickSchema);