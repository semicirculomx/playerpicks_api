const Post = require('../models/post.model')
const Pick = require('../models/pick.model')
const Match = require('../models/match.model')
const { serializeMatch, serializeMatches } = require('../serializers/match.serializer')

const mongoose = require('mongoose')
const assert = require('assert')

exports.addPicksAndPostsToMatch = async (bets, pickId, postId) => {
  try {
    const existingMatches = new Map();
    const matchIds = [];

    const newBets = [];

    for (const { match: { match_id, customOption, ...rest }, ..._bet } of bets) {
      let matchId;
      let match;

      matchId = existingMatches.get(match_id);

      if (!matchId) {
        match = { match_id, ...rest };
        const matchResult = await Match.addOne({ match }, pickId, postId);
        matchId = matchResult._id;
        existingMatches.set(match_id, matchId);
      } else {
        match = await Match.findById(matchId);
        if (pickId && !match.picks.includes(pickId)) {
          match.picks.push(pickId);
        }

        if (postId && !match.posts.includes(postId)) {
          match.posts.push(postId);
        }

        await match.save();
      }
      matchIds.push(matchId);
      newBets.push({ ..._bet, match: matchId });
    }

    return newBets;
  } catch (error) {
    throw new Error(`Error adding picks and posts to match: ${error.message}`);
  }
};
// exports.addPicksAndPostsToMatch = async (bets, pickId, postId) => {
//   try {
//     const existingMatches = new Map();
//     const matchIds = [];
//     const pickIds = [];
//     const postIds = [];

//     const betPromises = bets.map(async ({ match: { match_id, customOption, ...rest }, ..._bet }) => {
//       let matchId;
//       let match;

//       matchId = existingMatches.get(match_id);

//       if (!matchId) {
//         match = { match_id, ...rest };
//         const matchResult = await Match.addOne({ match }, pickId, postId);
//         matchId = matchResult._id;
//         existingMatches.set(match_id, matchId);
//       } else {
//         match = await Match.findById(matchId);
//         if (pickId && !match.picks.includes(pickId)) {
//           match.picks.push(pickId);
//         }

//         if (postId && !match.posts.includes(postId)) {
//           match.posts.push(postId);
//         }

//         await match.save();
//       }

//       return { ..._bet, match: matchId };
//     });

//     const newBets = await Promise.all(betPromises);

//     if (pickId) {
//       pickIds.push(pickId);
//     }

//     if (postId) {
//       postIds.push(postId);
//     }

//     if (postIds.length) {
//       await Post.updateMany(
//         { _id: { $in: postIds } },
//         { $addToSet: { matches: { $each: matchIds } } }
//       );
//     }

//     if (newBets.length) {
//       await Pick.updateMany(
//         { _id: { $in: pickIds } },
//         { $addToSet: { bets: { $each: newBets } } }
//       );
//     }

//     return newBets;
//   } catch (error) {
//     throw new Error(`Error adding picks and posts to match: ${error.message}`);
//   }
// };
  
  exports.createMatch = async (req, res, next) => { 
    try {
        let body = req.body;
        let { match } = body
      
         match = await Match.addOne({match})
         match = await serializeMatch(match, req.user)
         res.status(200).json({
            'msg': 'match was succesfully added',
            match
        });
    } catch (err) {
        next(err)
    }
}  
exports.getBestMatches = async (req, res, next) => {
  try {
    assert(mongoose.connection.readyState, 1);
    let user = req.user;
    assert.ok(user);
    let page = req.query['p'];
    let best = req.query['best'];
    let matches;
    if (best === 'true') {
      matches = await Match.getMatches({query: {}, isBestMatchOnly: true, page});
    } else {
      matches = await Match.getMatches({page});
    }
    matches = await serializeMatches(matches, user);
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);

    const filteredMatches = matches.filter((match) => {
      const commenceTime = new Date(match.commence_time);
      return commenceTime >= today && commenceTime <= oneWeekFromNow;
    });

    res.json(filteredMatches);
  } catch (err) {
    next(err);
  }
}

exports.getMatch = async (req, res, next) => {
  try {
      let matchId = req.params.matchId;
      let match = await Match.findOne({ id_str: matchId })
      if (!match) {
          res.status(400).json({ msg: "Bad request" })
          return
      }
      match = await serializeMatch(match, req.user)
      res.status(200).json({
          message: "Match found",
          match
      });
  } catch (err) { next(err) }
}
exports.deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Remove match ID from matches arrays of each pick and post document
    await Promise.all([
      Pick.updateMany({ 'bets.match': match._id }, { $pull: { 'bets.$.match': match._id } }),
      Post.updateMany({ matches: match._id }, { $pull: { matches: match._id } })
    ]);

    // Delete the match
    await match.deleteOne();

    res.status(200).json({
      message: 'Match deleted successfully',
      match: match
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
