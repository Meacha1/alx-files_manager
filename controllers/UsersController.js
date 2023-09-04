const sha1 = require('sha1');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    // Extract email and password from the request body
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // Check if the user already exists
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ email });
      if (user) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password using SHA1
      const hashedPassword = sha1(password);

      // Create the new user object
      const newUser = {
        email,
        password: hashedPassword,
      };

      // Insert the new user into the database
      const result = await usersCollection.insertOne(newUser);
      console.log('Insert result:', result);

      if (result && result.ops && result.ops.length > 0) {
        // Return the new user with email and id
        const createdUser = {
          email: result.ops[0].email,
          id: result.ops[0]._id.toString(), // Convert ObjectId to string
        };
        return res.status(201).json(createdUser);
      } else {
        console.log('User creation failed');
        return res.status(500).json({ error: 'User creation failed' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    // Retrieve the token from the X-Token header
    const token = req.headers['x-token'];
  
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    try {
      // Retrieve the user ID associated with the token from Redis
      const redisKey = `auth_${token}`;
      const userId = await redisClient.get(redisKey);
  
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      // Retrieve the user based on the user ID
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ _id: userId });
  
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      // Return the user object with email and id
      const userInfo = {
        id: user._id,
        email: user.email,
      };
  
      return res.status(200).json(userInfo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
}
}

module.exports = UsersController;
