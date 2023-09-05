const mongoose = require('mongoose')

/**
 * serializes user with fields required by client user
 */
exports.serializeUser = async (user, client = null) => {
    if (!user)
        return

    let followers_count = await mongoose.model('Friendship').countFollowers(user._id)
    let friends_count = await mongoose.model('Friendship').countFriends(user._id)
    let statuses_count = await mongoose.model('User').countPosts(user._id)
    let picks_count = await mongoose.model('User').countPicks(user._id)
    let following = await mongoose.model('Friendship').isFollowing(client && client._id, user._id)
    let isSubscribed
    if(client && client.role !== 'tipster') {
        isSubscribed = await mongoose.model('Subscription').isSubscribed(user._id, client && client._id)
    } else {
        isSubscribed = await mongoose.model('Subscription').isSubscribed(client && client._id, user._id)
    }
    let totalBank = user.accBank + user.bank
    const notifications_enabled_device_count = await mongoose.model('User').notificationDevices(user._id)
    
    if (user.toObject)
    user = user.toObject()
    return ({
        ...user,
        following,
        isSubscribed,
        followers_count,
        friends_count,
        statuses_count,
        picks_count,
        totalBank,
        notifications_enabled_device_count
    })
}
exports.serializeUsers = async (users = [], client) => {
    if (!users instanceof Array)
        throw Error("Unknown type")
    return Promise.all(users.map(user => this.serializeUser(user, client)))
}