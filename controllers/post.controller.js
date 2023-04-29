const Post = require('../models/post.model')
const Pick = require('../models/pick.model')
const Notification = require('../models/notification.model')
const PostEngagement = require('../models/post_engagement.model')
const Friendship = require('../models/friendship.model')
const { serializePost, serializePosts } = require('../serializers/post.serializer')
const { serializeUsers } = require('../serializers/user.serializer')
const assert = require('assert')
const { filterInput } = require('../utils/helpers')
const { addPicksAndPostsToMatch } = require('./best-matches.controller')
const { serializePick } = require('../serializers/pick.serializer')
const Match = require('../models/match.model')
const cloudinary = require('cloudinary').v2;


// Configuration 
cloudinary.config({
    cloud_name: "dlkbvbhlb",
    api_key: "939443864357463",
    api_secret: "G1dcgzZqv7gIcQncqkoy4gNsDXs"
});


exports.uploadImagesToCloudinary = async (req, res, next) => {
    const post = req.body.post;
    const base64Images = post.base64Images;

    if (!post.text || base64Images.length === 0) {
        return next();
    }

    try {
        const uploadPromises = base64Images.map((image) => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload(image, (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                });
            });
        });

        const imageUrls = await Promise.all(uploadPromises);
        post.base64Images = imageUrls;

        let updatedHtmlContent = post.htmlContent;
        for (const imageUrl of imageUrls) {
            updatedHtmlContent = updatedHtmlContent.replace('<img', `<img src="${imageUrl}"`);
        }
        post.htmlContent = updatedHtmlContent;

        next();
    } catch (error) {
        next(error);
    }
}

exports.createPostAndPick = async (req, res, next) => {
    try {
      const user = req.user;
      const { post: { post_title, htmlContent, text, post_categories }, pick, ...rest } = req.body;
  
      let _post = null;
      let pickStored = null;
      let storedBets = null;
  
      if (text) {
        const postBody = {
          text: filterInput(text, 'html', { max_length: 60000, identifier: 'Post' }),
          post_title,
          htmlContent,
          post_categories: post_categories.length ? post_categories.map((cat) => cat.toLowerCase()): post_categories,
        };
        _post = await Post.addOne({ user_id: user._id }, postBody);
      }
  
      if (pick?.bets?.length) {
        const { bets, ..._pick } = pick;
        pickStored = await Pick.addOne({ user_id: user._id }, _pick);
        storedBets = await addPicksAndPostsToMatch(bets, pickStored._id, _post?._id);
  
        if (pickStored && storedBets) {
          try {
            const updatedPick = await Pick.findOneAndUpdate({ _id: pickStored._id }, { $set: { bets: storedBets || [] } }, { new: true, strict: true });
            pickStored = await serializePick(updatedPick, req.user);
          } catch (err) {
            console.error(err);
          }
        }
      }
  
      if (_post) {
        try {
            if(req.body.post.bets){
                storedBets = await addPicksAndPostsToMatch(req.body.post.bets, pickStored?._id, _post?._id);
            }
          const updatedPost = await Post.findOneAndUpdate({ _id: _post._id }, {
            $set: {
              pick: pickStored?._id,
              is_pick: Boolean(pickStored),
              matches: storedBets ? storedBets.map(bet => bet.match) : []
            }
          }, { new: true, strict: true });
          _post = await serializePost(updatedPost, req.user);
        } catch (err) {
          console.error(err);
        }
      }
  
      res.status(200).json({
        'msg': 'post and pick were successfully added',
        post: _post,
        pick: pickStored
      });
    } catch (error) {
      next(error);
    }
  };
  
  

exports.createPost = async (req, res, next) => {
    try {
        let user = req.user;
        let body = req.body;
        let { text, ...rest } = body.post
        text = filterInput(text, 'html', { max_length: 60000, identifier: 'Post' })
        body = {
            text,
            ...rest
        }
        let post = await Post.addOne({ user_id: user._id }, body)
        post = await serializePost(post, req.user)
        res.status(200).json({
            'msg': 'post was succesfully added',
            post
        });
    } catch (err) {
        next(err)
    }
}
exports.getPost = async (req, res, next) => {
    try {
        let postId = req.params.postId;
        let post = await Post.findOne({ id_str: postId })
        if (!post) {
            res.status(400).json({ msg: "Bad request" })
            return
        }
        post = await serializePost(post, req.user)
        res.status(200).json({
            post
        });
    } catch (err) { next(err) }
}
exports.likePost = async (req, res, next) => {
    try {
        let postId = req.params.postId;
        let user = req.user;
        let responce = await Friendship.postLiked(user._id, { postId })
        if (responce.ok)
            res.json({ message: "Post was liked" })
        else
            throw Error("Error in like post")
    } catch (err) {
        next(err)
    }
}
exports.unlikePost = async (req, res, next) => {
    try {
        let postId = req.params.postId;
        let user = req.user;
        let response = await Friendship.postUnliked(user._id, { postId })
        if (response.ok)
            res.json({ message: "Post was unliked" })
        else
            throw Error("Error in unlike post")
    } catch (err) {
        next(err)
    }
}
exports.repostPost = async (req, res, next) => {
    try {
        let post = req.body;
        let { text, ...rest } = post
        text = filterInput(text, 'html', { max_length: 60000, identifier: 'Post' })
        post = {
            text,
            ...rest
        }
        let form = {
            text: `RT @${post.user.screen_name}: ${post.text.slice(0, 50)}`,
            retweeted_status: post._id
        }
        let user = req.user;
        await Post.addOne({ user_id: user._id }, form)
        await Friendship.postReposted(user._id, { postId: post.id_str })
        res.json({
            message: "Successfully reposted"
        })
    } catch (err) {
        next(err)
    }
}
exports.unrepostPost = async (req, res, next) => {
    try {
        let post = req.body;
        let user = req.user;
        assert.ok(user)
        let doc = await Post.findOne({ retweeted_status: post._id })
        await doc.deleteOne()
        await Friendship.postUnreposted(user._id, { post_id: post._id })
        res.json({
            message: "Succesfully Unreposted"
        })
    } catch (err) {
        next(err)
    }
}
exports.getLikes = async (req, res, next) => {
    try {
        let { postId } = req.params;
        let p = req.query['p'];
        p = parseInt(p); //page/batch number
        const s = 15; //size of page/batch

        const post = await Post.findOne({ id_str: postId }, '_id');
        if (!post)
            return res.status(400).json({ msg: 'Bad request' })

        let doc = await PostEngagement
            .findOne({ post_id: post._id }, {
                liked_by: {
                    $slice: [s * (p - 1), s]
                }
            }).populate('liked_by')
        if (!doc)
            return res.json({ users: null })
        let users = await serializeUsers(doc.liked_by, req.user)
        res.json({ users })
    } catch (err) {
        next(err)
    }
}
exports.getReposts = async (req, res, next) => {
    try {
        let { postId } = req.params;
        let p = req.query['p'];
        p = parseInt(p); //page/batch number
        const s = 15; //size of page/batch

        const post = await Post.findOne({ id_str: postId }, '_id');
        if (!post)
            return res.status(400).json({ msg: 'Bad request' })

        let doc = await PostEngagement
            .findOne({ post_id: post._id }, {
                reposted_by: {
                    $slice: [s * (p - 1), s]
                }
            }).populate('reposted_by')
        if (!doc)
            return res.json({ users: null })
        let users = await serializeUsers(doc.reposted_by, req.user)
        res.json({ users })
    } catch (err) {
        next(err)
    }
}
exports.getReplies = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        let p = req.query['p'];
        p = parseInt(p); //page/batch number
        const s = 15; //size of page/batch

        const post = await Post.findOne({ id_str: postId })
        if (!post)
            return res.status(400).json({ msg: 'Bad request' })

        const doc = await PostEngagement
            .findOne({ post_id: post._id }, {
                reply_posts: {
                    $slice: [s * (p - 1), s]
                }
            }).populate('reply_posts');
        if (!doc)
            return res.json({ posts: null })
        const posts = await serializePosts(doc.reply_posts, req.user)
        res.json({ posts })
    } catch (err) {
        next(err)
    }
}

exports.replyToPost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const user = req.user;
        let post = req.body;
        let { text, ...rest } = post
        text = filterInput(text, 'html', { max_length: 60000, identifier: 'Post' })
        post = {
            text,
            ...rest
        }

        const targetPost = await Post
            .findOne({ id_str: postId })
            .populate('user')
        if (!targetPost)
            return res.status(400).json({ msg: 'Bad request' })

        let form = {
            ...post,
            "in_reply_to_status_id": targetPost.id,
            "in_reply_to_status_id_str": targetPost.id_str, //would be string anyway
            "in_reply_to_user_id": targetPost.user.id,
            "in_reply_to_user_id_str": targetPost.user.id_str,
            "in_reply_to_screen_name": targetPost.user.screen_name,
            "quoted_status": targetPost._id, //just for UI to look good
            "is_quote_status": false //maybe use this to distinguish
        }
        post = await Post.addOne({ user_id: user._id }, form)
        if (post) { //no error proceed
            await PostEngagement.gotReplied(targetPost._id, post._id)
            post = await serializePost(post, req.user)
            res.json({ msg: "Ok", post })
        }
        else
            throw new Error('Post.addOne responce not ok')
    } catch (err) {
        next(err)
    }
}

exports.deleteOnePost = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).populate("user");
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
  
      // Create an array of Promises for the async actions
      const asyncActions = [];
  
      // Delete the post and associated pick
      for (let match of post.matches) {
        asyncActions.push(Match.findByIdAndUpdate(match, { $pull: { posts: post._id } }));
      }
  
      asyncActions.push(Notification.deleteMany({
        "notifications.body.post": post._id,
      }));
  
      asyncActions.push(PostEngagement.deleteMany({ post_id: post._id }));
  
      if (post.pick) {
        var pick = await Pick.findById({ _id: post.pick });
        for (let bet of pick.bets) {
          asyncActions.push(Match.findByIdAndUpdate(bet.match, { $pull: { picks: pick._id } }));
        }
        asyncActions.push(pick.deleteOne());
      }
  
      let posts = await Post.find({ quoted_status: post._id }, "_id");
      for (let post of posts) {
        asyncActions.push(Post.findOneAndDelete({ _id: post._id }));
        asyncActions.push(Notification.deleteMany({ "notifications.body.post": post._id }));
        asyncActions.push(PostEngagement.deleteMany({ post_id: post._id }));
      }
  
      asyncActions.push(post.deleteOne());
  
      // Wait for all Promises to complete
      await Promise.all(asyncActions);
  
      res.status(200).json({
        message: "Post eliminado correctamente",
        post: post || null,
        pick: pick || null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  };