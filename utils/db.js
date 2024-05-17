import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${dbHost}:${dbPort}/${dbName}`;

    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.connection = null;
    this.connected = false;
    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.connection = this.client.db();
      this.connected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.log(`Error connecting to MongoDB: ${error}`);
      this.connected = false;
    }
  }

  async isAlive() {
    // return this.connected;
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      if (!this.connected) {
        await this.connect();
      }
      const usersCollection = this.connection.collection('users');
      return await usersCollection.countDocuments();
    } catch (error) {
      console.log(`Error counting users ${error}`);
      return -1;
    }
  }

  async nbFiles() {
    try {
      if (!this.connected) {
        await this.connect();
      }
      const filesCollection = this.connection.collection('files');
      return await filesCollection.countDocuments();
    } catch (error) {
      console.log(`Error counting files ${error}`);
      return -1;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
