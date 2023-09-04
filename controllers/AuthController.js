const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Bad request' });
    }

    try {
      // Retrieve the user from the database
      const user = await dbClient.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if the password matches
      if (user.password !== sha1(password)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a token
      const token = uuidv4();

      // Store the token in Redis
      await redisClient.set(`auth_${token}`, user.id);

      return res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  
  }

  static async getDisconnect(req, res) {
    const { token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await redisClient.del(`auth_${token}`);

      return res.status(200).json({ message: 'Disconnected' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = AuthController;
