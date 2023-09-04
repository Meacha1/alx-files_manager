const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract the Base64 encoded email and password from the Authorization header
    const authData = authHeader.slice('Basic '.length);
    const authBuffer = Buffer.from(authData, 'base64');
    const [email, password] = authBuffer.toString().split(':');

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    try {
      // Check if the user exists
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a random token
      const token = uuidv4();

      // Store the user ID in Redis with a key based on the token
      await redisClient.set(`auth_${token}`, user._id.toString(), 86400); // 24 hours expiration

      return res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(req, res) {
    const { 'x-token': token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Delete the token from Redis
      await redisClient.del(`auth_${token}`);

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = AuthController;
