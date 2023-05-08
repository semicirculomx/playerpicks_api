const Pick = require('../models/pick.model');
const Post = require('../models/post.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { serializePicks, serializePick } = require('../serializers/pick.serializer');
const assert = require('assert');
const { serializeUser } = require('../serializers/user.serializer');
const { log } = require('console');


exports.getUserPicks = async (req, res, next) => {
  try {
    const username = req.params.username;
    const page = parseInt(req.query['p']) || 1;

    const user = await User.findOne({ screen_name: username });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const picks = await Pick.find({ user: user._id })
      .sort({ created_at: -1 })
      .skip((page - 1) * 20)
      .limit(20);
    const serializedPicks = await serializePicks(picks);

    res.json({
      picks: serializedPicks,
      user: {
        screen_name: user.screen_name,
        name: user.name,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyPicks = async (req, res, next) => {
  try {
    const user = req.user;
    let page = req.query['p'];
    assert.ok(user);

    const picks = await Pick.getPicks({ query: { user: user._id }, page });
    const serializedPicks = await serializePicks(picks);
    res.json(serializedPicks);
  } catch (err) {
    next(err);
  }
};

exports.updatePick = async (req, res, next) => {
  try {
    const user = req.user;
    let body = req.body;

    let pick = await Pick.findById(
      { _id: body._id }
    );
    await pick.updateOne({
      $set: {
        status: body.status
      }
    })
    await user.updateUserFromPick(body, pick)
      pick.status = body.status
     pick = await serializePick(pick, req.user)
    res.status(200).json({
      message: 'pick fue actualizado con éxito',
      pick: pick,
    });

  } catch (err) {
    next(err)
  }
}
exports.deleteOnePick = async (req, res, next) => {
  try {
    let pick = await Pick.findById(req.params.id);
    let post = await Post.findOne({ pick: pick._id });

    if (!pick) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only allow the post owner or admin to delete the post
    if (pick.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete pick' });
    }

    // Delete the post and associated pick
    await pick.deleteOne();

    if (post) {
      await post.deleteOne();
      await Notification.deleteMany({ 'notifications.post': post._id });
    }

    pick = await serializePick(pick, req.user)
    res.status(200).json({
      message: 'Pick eliminado correctamente',
      post: post || null,
      pick: pick || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
