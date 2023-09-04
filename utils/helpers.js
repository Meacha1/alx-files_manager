const redisClient = require('./redis');
const dbClient = require('./db');

/**
 * Retrieves the authentication token from the request headers.
 * @param {object} request - The HTTP request object.
 * @returns {string} The authentication token key.
 */
async function getAuthToken(request) {
  const token = request.headers['x-token'];
  return `auth_${token}`;
}

/**
 * Checks authentication against verified information and returns the user ID of the user.
 * @param {object} request - The HTTP request object.
 * @returns {string|null} The user ID or null if not found.
 */
async function findUserIdByToken(request) {
  const key = await getAuthToken(request);
  const userId = await redisClient.get(key);
  return userId || null;
}

/**
 * Gets a user by their user ID.
 * @param {string} userId - The user ID to search for.
 * @returns {object|null} The user object or null if not found.
 */
async function findUserById(userId) {
  const userExistsArray = await dbClient.users.find(`ObjectId("${userId}")`).toArray();
  return userExistsArray[0] || null;
}

module.exports = {
  findUserIdByToken,
  findUserById,
};
