import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${dbHost}:${dbPort}/${dbName}`;

    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    this.client.connect((err) => {
      if (err) {
        console.log(`Error connecting to MongoDB: ${err}`);
      } else {
        console.log('Connected to MongoDB');
      }
    });
  }

  async isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    // Returns the number of documents in the collection users
    try {
      const usersCollection = this.client.db.collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (error) {
      console.log(`Error counting users ${error}`);
      return -1;
    }
  }

  async nbFiles() {
    // Returns the number of documents in the collection files
    try {
      const filesCollection = this.client.db.collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (error) {
      console.log(`Error counting files ${error}`);
      return -1;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
