const express = require('express')
const { ensureLoggedIn } = require('../utils/middlewares')
const {
    createPost,
    createPostAndPick,
    getPost,
    likePost,
    unlikePost,
    repostPost,
    unrepostPost,
    getLikes,
    getReposts,
    replyToPost,
    getReplies,
    uploadImagesToCloudinary,
    deleteOnePost
} = require('../controllers/post.controller')
const {
    getUser,
    followUser,
    unFollowUser,
    updateUser,
    getFollowers,
    getFriends,
} = require('../controllers/user.controller')
const { homeTimeline, userTimeline } = require('../controllers/timeline.controller')
const { createMatch, getBestMatches, getMatch, deleteMatch } = require('../controllers/best-matches.controller')
const { getMyPicks, updatePick, deleteOnePick , getPick} = require('../controllers/picks.controller')
const { search, trends, userSuggests } = require('../controllers/search.controller')
const {
    notificationRead,
    getNotifications,
    subscribeDevice,
    unsubscribeDevice,
} = require('../controllers/notifications.controller')


const router = express.Router()


/*GET all matches from api-odds*/
// router.get('/matches', ensureLoggedIn, async (req, res, next) => {
//     try {
//         // Make a request to the odds API
//         const response = await axios.get('https://api.the-odds-api.com/v3/odds/?apiKey=4c3f36088c08d83c4475541ad7d0ee3a&region=us&markets=h2h,spreads,totals&oddsFormat=american&sport=upcoming', {
//         /*  params: {
//             apiKey: 'YOUR_API_KEY_HERE', // Replace with your own API key
//             regions: 'uk', // Limit to UK regions
//             markets: 'h2h', // Only include head-to-head markets
//             oddsFormat: 'decimal', // Use decimal odds format
//           },*/
//         });
    
//         // Extract the relevant match data from the API response
//         const matches = response.data.map(match => {
//           return {
//             homeTeam: match.teams[0],
//             awayTeam: match.teams[1],
//             homeOdds: match.sites[0].odds.h2h[0],
//             drawOdds: match.sites[0].odds.h2h[1],
//             awayOdds: match.sites[0].odds.h2h[2],
//           };
//         });
    
//         // Send the match data to the React app
//         res.json(response);
//       } catch (error) {
//         console.error(error);
//         next(error);
//       }
// })
/* POST read notification*/
router.post('/notification_read/:_id', ensureLoggedIn, notificationRead)

/* GET all notifications */
router.get('/notifications', ensureLoggedIn, getNotifications)

/* push subscribe, unsubscribe */
router.post('/notifications/subscribe', ensureLoggedIn, subscribeDevice)
router.post('/notifications/unsubscribe', ensureLoggedIn, unsubscribeDevice)

/* GET home page. */
router.get('/home_timeline', ensureLoggedIn, homeTimeline)

/* GET best matches page. */
router.get('/matches', ensureLoggedIn, getBestMatches)
router.get('/match/:matchId', ensureLoggedIn, getMatch)
router.delete('/match/:matchId', ensureLoggedIn, deleteMatch)

router.get('/picks', getMyPicks)
//router.get('/pick/:id', getPick)
router.put('/pick/:id', ensureLoggedIn, updatePick)
router.delete('/pick/:id', ensureLoggedIn, deleteOnePick)

/* GET user timeline */
router.get('/user_timeline/:username', userTimeline)

/* GET user friends and followers */
router.get('/followers/:username', getFollowers)
router.get('/friends/:username', getFriends)

/* POST post a reply */
router.post('/post/:postId/reply', ensureLoggedIn, replyToPost)

/* GET Post liked_by and reposted_by */
router.get('/post/:postId/likes', getLikes)
router.get('/post/:postId/reposts', getReposts)

/* GET Post replies */
router.get('/post/:postId/replies', getReplies)

/* POST create new post. */
router.post('/post', ensureLoggedIn, createPost)
router.post('/post-pick', ensureLoggedIn ,uploadImagesToCloudinary, createPostAndPick)
router.post('/match', ensureLoggedIn, createMatch)

/* POST repost a post. */
router.post('/repost', ensureLoggedIn, repostPost)

/* POST unrepost a post. */
router.post('/unrepost', ensureLoggedIn, unrepostPost)

/* GET get a single post. */
router.get('/post/:postId',  getPost)
router.delete('/posts/:id', ensureLoggedIn, deleteOnePost)

router.post('/like/:postId', ensureLoggedIn, likePost)
router.post('/unlike/:postId', ensureLoggedIn, unlikePost)

/* GET get a single user detail. */
router.get('/user/:username', getUser)

router.post('/follow/:username', ensureLoggedIn, followUser)
router.post('/unfollow/:username', ensureLoggedIn, unFollowUser)

/* POST update authenticated user */
router.post('/updateuser', ensureLoggedIn, updateUser)

/* GET seach results */
router.get('/search', search)

/* GET trends. */
router.get('/trends', trends)

/* GET user Suggestions */
router.get('/users', ensureLoggedIn, userSuggests)

module.exports = router
