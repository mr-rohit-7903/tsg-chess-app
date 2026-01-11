function getExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateRatingChange(playerRating, opponentRating, result, kFactor = 32) {
    // result: 1 for win, 0.5 for draw, 0 for loss
    const expectedScore = getExpectedScore(playerRating, opponentRating);
    const change = Math.round(kFactor * (result - expectedScore));
    return change;
}

module.exports = {
    calculateRatingChange
};
