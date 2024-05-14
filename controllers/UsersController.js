// import { ObjectId }  from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';

const UsersController = {
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
};

module.exports = UsersController;
