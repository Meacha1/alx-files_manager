// utils/db.js
const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}/${database}`;

    // Initialize the MongoDB client and connect to the database
    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect()
      .then(() => {
        console.log('Connected to MongoDB');
        // Access the database itself (assuming the database name is 'files_manager')
        this.db = this.client.db(database);
      })
      .catch((error) => console.error(`MongoDB Connection Error: ${error}`));
  }

  isAlive() {
    return !!this.client && this.client.isConnected();
  }

  async nbUsers() {
    const usersCollection = this.db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    const filesCollection = this.db.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
