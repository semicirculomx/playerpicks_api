const mongoose = require('mongoose')

exports.serializeMatch = async (match, client, level = 0) => {
    if (level > 1) {
        return
    }
    if (!match)
        return
    if (!match instanceof mongoose.Document)
        throw Error('Unknown match type')
    match = await match
        .populate({
            path: 'picks',
            populate: {
                path: 'user'
              }
          })
        .populate({
            path: 'posts',
            populate: {
                path: 'user'
              }
        })
        .execPopulate()

    match = match.toObject()
   return ({
        ...match,
    })
}
exports.serializeMatches = async (matches = [], client) => {
    if (!matches instanceof Array) //includes CoreDocumentArray
        throw Error("Unknown type")
    return Promise.all(matches.map(match => this.serializeMatch(match, client)))
}