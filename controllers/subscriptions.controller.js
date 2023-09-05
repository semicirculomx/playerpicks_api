const Subscription = require('../models/subscriptions.model'); // Adjust the path as needed

const checkSubscription = async (req, res, next) => {
    try {
      const { user } = req; // Assuming the user is attached to the request
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      let tipster = await User.findOne({ screen_name: username })
      // Check if the user is subscribed to the tipster
      const isSubscribed = await Subscription.isSubscribed(
        tipster._id,
        user._id // Assuming you pass the tipsterId in the URL
      );
  
      if (!isSubscribed && req.params.tipsterId !== user._id) {
        return res.status(403).json({ message: 'No estas suscrito a este tipster' });
      }
     next(); // Move to the next middleware or route handler
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  
module.exports = {
    checkSubscription
};