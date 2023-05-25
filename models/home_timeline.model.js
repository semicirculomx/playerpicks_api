const mongoose = require('mongoose');

const timelineSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    posts: [{
        post_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
            required: true
        },
        created_at: {
            type: Date,
        }
    }],
    picks: [{
        pick_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Pick',
            required: true
        },
        created_at: {
            type: Date,
        }
    }],
    matches: [{
        match_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match',
            required: true
        },
        created_at: {
            type: Date,
        }
    }],

})
/**
 * @param {Object} first param is object with username or user_id to idetify user
 * @param {Number} page page no., 1 by defualt
 */
timelineSchema.statics.getTimeline = async function ({
    username: screen_name = null,
    user_id = null
}, page = 1) {
    let p = parseInt(page); //page/batch number
    const s = 10; //size of page/batch
    /**
     * s = 20
     * $slice -> [skip, size] in mongo
     * 1 --> [0, 20] | [s * (p - 1), s]  | would be [s * (p - 1), s * p] index based
     * 2 --> [20, 20]
     * 3 --> [40, 20]
     */
    if (!user_id) {
        let { _id } = await mongoose.model('User')
            .findOne({ screen_name }, '_id');
        user_id = _id;
    }
    let { posts } = await mongoose.model('home_timeline') //or this
        .findOne({ user_id },
            { 
            posts: { $slice: [s * (p - 1), s] },
         }) //returns
        .populate({
            path: 'posts.post_id',           
        })
    posts = posts.map(obj => obj.post_id);
    return {posts};
}
/**<Model>.bulkAddPosts
 * calls <Document>.bulkAddPosts() of each user_id with remaining args
 * @param {Array} user_id - array of user._id's of concerned users
 */
timelineSchema.statics.bulkAddPosts = async function (user_ids, ...args) {
    let timelines = await this.find({ user_id: { $in: user_ids } });
    timelines //forEach does parallelly (unlike for of)
        .forEach(timeline => timeline.bulkAddPosts(...args))
}
/**
 * bulkAddposts
 * 
* updates the timeline of user with posts from friends_added
* updates all posts if id_post_added not given
* @param {Object} _ id_of_post added or id_of_friend added
* @returns res - result of update command
*/
timelineSchema.methods.bulkAddPosts = async function ({
    id_friend_added = null,
    id_post_added = null
}) {
    let posts_toadd;
    if (id_friend_added) { //new friend add all posts
        posts_toadd = await mongoose.model('Post').find({
            user: id_friend_added,
            //TODO maybe limit posts when they are too many
        }, '_id created_at');
    }
    else if (id_post_added) { // add this post only
        posts_toadd = await mongoose.model('Post').find({
            _id: id_post_added
        }, '_id created_at');
    }
    posts_toadd = posts_toadd.map(obj => {
        let { _id: post_id, created_at } = obj;
        return {
            post_id,
            created_at
        }
    })
    let res = await this.updateOne({
        $push: {
            posts: {
                $each: posts_toadd,
                $sort: { created_at: -1 }
            }
        }
    })
    return res;
}
/**<Model>.bulkRemovePosts
 * calls <Document>.bulkRemovePosts() of each user_id with remaining args
 * @param {Array} user_id - array of user._id's of concerned users
 */
timelineSchema.statics.bulkRemovePosts = async function (user_ids, ...args) {
    let timelines = await this.find({ user_id: { $in: user_ids } });
    timelines //forEach does parallelly (unlike for of)
        .forEach(timeline => timeline.bulkRemovePosts(...args))
}
/**
 * bulkRemoveposts
 * 
* updates the timeline of user with posts from friends_removed removed
* removes all posts from user if id_post_removed not given
* @param {Object} _ id_post_removed or id_friend_removed
* @returns res - result of update command
*/
timelineSchema.methods.bulkRemovePosts = async function ({
    id_friend_removed = null,
    id_post_removed = null
}) {
    let posts_to_remove;
    if (id_friend_removed) { //remove all posts
        posts_to_remove = await mongoose.model('Post').find({
            user: id_friend_removed,
        }, '_id');
    }
    else if (id_post_removed) { // remove this post only
        posts_to_remove = [].concat({_id: id_post_removed});
    }
    let ids_to_remove = posts_to_remove.map(pst => pst._id)
    let res = await this.updateOne({
        $pull: {
            posts: {
                post_id: { $in: ids_to_remove }
            }
        }
    })
    return res;
}

timelineSchema.statics.bulkAddPicks = async function (user_ids, ...args) {
    let timelines = await this.find({ user_id: { $in: user_ids } });
    timelines.forEach(timeline => timeline.bulkAddPicks(...args))
}

timelineSchema.methods.bulkAddPicks = async function ({
    id_friend_added = null,
    id_pick_added = null
}) {
    let picks_to_add;
    if (id_friend_added) { //new friend add all picks
        picks_to_add = await mongoose.model('Pick').find({
            user: id_friend_added,
        }, '_id created_at');
    }
    else if (id_pick_added) { // add this pick only
        picks_to_add = await mongoose.model('Pick').find({
            _id: id_pick_added
        }, '_id created_at');
    }
    picks_to_add = picks_to_add.map(obj => {
        let { _id: pick_id, created_at } = obj;
        return {
            pick_id,
            created_at
        }
    })
    let res = await this.updateOne({
        $push: {
            picks: {
                $each: picks_to_add,
                $sort: { created_at: -1 }
            }
        }
    })
    return res;
}

timelineSchema.statics.bulkRemovePicks = async function (user_ids, ...args) {
    let timelines = await this.find({ user_id: { $in: user_ids } });
    timelines.forEach(timeline => timeline.bulkRemovePicks(...args))
}

timelineSchema.methods.bulkRemovePicks = async function ({
    id_friend_removed = null,
    id_pick_removed = null
}) {
    let picks_to_remove;
    if (id_friend_removed) { //remove all picks
        picks_to_remove = await mongoose.model('Pick').find({
            user: id_friend_removed,
        }, '_id');
    }
    else if (id_pick_removed) { // remove this pick only
        picks_to_remove = [].concat({_id: id_pick_removed});
    }
    let ids_to_remove = picks_to_remove.map(pick => pick._id)
    let res = await this.updateOne({
        $pull: {
            picks: {
                pick_id: { $in: ids_to_remove }
            }
        }
    })
    return res;
}

module.exports = mongoose.model('home_timeline', timelineSchema)