import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const UsersController = {
  /**
   * Create a new user in the Database.
   */
  async postNew(req, res) {
    // get data been sent to the server && validate the data
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await dbClient.connection.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exists' });
    }

    const hashedPassword = sha1(password);

    const newUser = {
      email,
      password: hashedPassword,
    };

    // store the newUser in the db and return newUser id and email upon success with status 201
    try {
      const result = await dbClient.connection.collection('users').insertOne(newUser);
      const { _id, email } = result.ops[0];
      return res.status(201).json({ id: _id, email });
    } catch (error) {
      console.log(`Error creating user: ${error}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * Retrieve a user base on the token used.
   */
  async getMe(req, res) {
    const { 'x-token': token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.connection.collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json({ email: user.email, id: user._id });
  },
};

module.exports = UsersController;
