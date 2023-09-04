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

  static async getMe (request, response) {
    try {
      const userToken = request.header('X-Token');
      const authKey = `auth_${userToken}`;
      // console.log('USER TOKEN GET ME', userToken);
      const userID = await redisClient.get(authKey);
      console.log('USER KEY GET ME', userID);
      if (!userID) {
        response.status(401).json({ error: 'Unauthorized' });
      }
      const user = await dbClient.getUser({ _id: ObjectId(userID) });
      // console.log('USER GET ME', user);
      response.json({ id: user._id, email: user.email });
    } catch (error) {
      console.log(error);
      response.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = UsersController;
