const { v4: uuidv4 } = require('uuid');
const sha1 = require('sha1');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
    static async getConnect(req, res) {
        // Extract Authorization header containing Basic Auth credentials
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
    
        // Decode Basic Auth credentials
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [email, password] = credentials.split(':');
    
        // Hash the provided password for comparison
        const hashedPassword = sha1(password);
    
        try {
          // Find the user based on email and hashed password
          const usersCollection = dbClient.db.collection('users');
          const user = await usersCollection.findOne({ email, password: hashedPassword });
    
          if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
    
          // Generate a random token using uuidv4
          const token = uuidv4();
    
          // Create a Redis key for the token and store the user ID for 24 hours
          const redisKey = `auth_${token}`;
          await redisClient.set(redisKey, user._id.toString(), 'EX', 24 * 3600); // 24 hours expiration
    
          // Return the generated token
          return res.status(200).json({ token });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'Server error' });
        }
      }

  static async getDisconnect(req, res) {
    // Retrieve the token from the X-Token header
    const token = req.headers['x-token'];
  
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    try {
      // Delete the token from Redis
      const redisKey = `auth_${token}`;
      const deletedCount = await redisClient.del(redisKey);
  
      if (deletedCount === 0) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      // Successfully disconnected, return 204 (No Content)
      return res.status(204).end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = AuthController;
