const sha1 = require('sha1');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    console.log('Received POST request to create a new user.');
    
    // Extract email and password from the request body
    const { email, password } = req.body;
    
    console.log(`Received email: ${email}`);
    console.log(`Received password: ${password}`);
    
    // Check if email and password are provided
    if (!email) {
      console.log('Missing email');
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      console.log('Missing password');
      return res.status(400).json({ error: 'Missing password' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);
    console.log(`Hashed password: ${hashedPassword}`);

    try {
      // Check if the user already exists
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ email });
      if (user) {
        console.log(`User already exists with email ${email}`);
        return res.status(400).json({ error: 'Already exist' });
      }

      // Create the user
      const result = await usersCollection.insertOne({
        email,
        password: hashedPassword,
      });

      if (result && result.ops && result.ops.length > 0) {
        console.log('User created');
        console.log(result);

        // Return the new user (excluding the password)
        const newUser = { ...result.ops[0] };
        delete newUser.password;

        return res.status(201).json(newUser);
      } else {
        console.log('User creation failed');
        return res.status(500).json({ error: 'User creation failed' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UsersController;
