const mongoose = require('mongoose');
const PostEngagement = require('./post_engagement.model'); // Import your PostEngagement model

const subscriptionSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subscribers_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    subscribed_to_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    subscribed_posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    subscribed_picks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Picks',
    }],
});

subscriptionSchema.statics.isSubscribed = async function (user1_id = null, user2_id = null) {
    return this.exists({
        user_id: user1_id,
        subscribers_ids: user2_id,
    });
};

subscriptionSchema.statics.isSubscribedTo = async function (user1_id = null, user2_id = null) {
    return this.exists({
        user_id: user1_id,
        subscribed_to_ids: user2_id,
    });
};

subscriptionSchema.statics.subscribeUser = async function (user1_id = null, user2_id = null) {
    let subscribed = await this.isSubscribed(user1_id, user2_id);

    if (subscribed) {
        return ({ ok: 1, nModified: 0 });
    }
    return this.updateOne({ user_id: user1_id }, {
        $push: {
            subscribers_ids: {
                $each: [user2_id],
                $position: 0,
            },
        },
    }, { upsert: true });
};

subscriptionSchema.statics.unsubscribeUser = async function (user1_id = null, user2_id = null) {
    let subscribed = await this.isSubscribed(user1_id, user2_id);

    if (!subscribed) {
        return ({ ok: 1, nModified: 0 });
    }
    return this.updateOne({ user_id: user1_id._id }, {
        $pull: { subscribers_ids: user2_id._id }
    });
};



module.exports = mongoose.model('Subscription', subscriptionSchema);
