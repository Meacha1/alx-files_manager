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

    // Check if the email already exists in the DB
    const userExists = await dbClient
      .db()
      .collection('users')
      .findOne({ email });

    if (userExists) {
      console.log('User already exists');
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);
    console.log(`Hashed password: ${hashedPassword}`);

    // Create a new user object
    const newUser = {
      email,
      password: hashedPassword,
    };

    console.log('Inserting the new user into the DB');

    // Insert the new user into the DB
    const result = await dbClient
      .db()
      .collection('users')
      .insertOne(newUser);

    console.log('User inserted into the DB');

    // Return the new user's ID and email
    return res.status(201).json({ id: result.insertedId, email });
  }
}

module.exports = UsersController;
