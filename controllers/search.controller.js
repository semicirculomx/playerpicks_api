const User = require('../models/user.model')
const Post = require('../models/post.model')
const Trend = require('../models/trend.model')
const { serializePosts } = require('../serializers/post.serializer')
const { serializeUsers } = require('../serializers/user.serializer')
const assert = require('assert')


exports.search = async (req, res, next) => {
    try {
        let query = req.query['q'];
        let page = req.query['p'];
        if (!query) {
                // search posts by category
            if (req.query['category']) {
                let category = req.query['category'];
                let result = await Post.searchCategory(category, page);
                posts = await serializePosts(result, req.user)
                res.json({ posts });
                return;
            }
            // search posts by text in html
            if (req.query['html']) {
                let htmlQuery = req.query['html'];
                let result = await Post.searchHtml(htmlQuery, page);
                posts = await serializePosts(result, req.user)
                res.json({ posts });
                return;
            }
            // search posts by match ID
            if (req.query['match']) {
                let matchId = req.query['match'];
                let result = await Post.searchMatch(matchId, page);
                posts = await serializePosts(result, req.user)
                res.json({ posts });
                return;
            }
            // search posts by title
            if (req.query['title']) {
                let titleQuery = req.query['title'];
                let result = await Post.searchTitle(titleQuery, page);
                posts = await serializePosts(result, req.user)
                res.json({ posts });
                return;
            }
        // if no search option matches, return an error message
        res.json({ message: "Invalid search query" });
            res.json({
                posts: null
            })
            return
        } else {
        page = parseInt(page);
        if (query.startsWith('#')) {
            // posts containing hashtag
            let result = await Post.searchHashtag(query, page);
            posts = await serializePosts(result, req.user)
            res.json({ posts });
            return;
        } else if (query.startsWith('@')) {
            // posts containing @query or accounts matching query
            let posts = await Post.searchUserMention(query, page);
            let users = await User.searchUser(query);
            posts = await serializePosts(posts, req.user)
            users = await serializeUsers(users, req.user)
            res.json({
                posts,
                users
            })
            return;
        } else {
            //do a text search
            let result = await Post.searchText(query, page);
            posts = await serializePosts(result, req.user)
            res.json({ posts });
            return;
        }
    }
       
    } catch (err) {
        next(err)
    }
}

exports.trends = async (req, res, next) => {
    try {
        let woeid = req.query['woeid'];
        let trend = await Trend.findOne({ 'locations.woeid': woeid });
        res.json(trend);

    } catch (err) {
        next(err)
    }
}
exports.userSuggests = async (req, res, next) => {
    try {
        let user = req.user;
        assert.ok(user)
        let users = await User.getSuggestions({ user_id: user._id });
        users = await serializeUsers(users, req.user)
        res.json({
            users,
            more: false
        })
    } catch (err) {
        next(err)
    }
}