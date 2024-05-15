import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
// import { ObjectId } from 'mongodb';
import mimeTypes from 'mime-types';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const FilesController = {
  /**
     * Create a new file in DB and in disk
     */
  async postUpload(req, res) {
    const { 'x-token': token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized ' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;
    // const { userId } = req;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.connection.collection('files').findOne({ _id: parentId });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type !== 'folder') {
      // Store file locally
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      const fileId = uuidv4();
      const localPath = `${filePath}/${fileId}`;
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

      newFile.localPath = localPath;
    }

    try {
      const result = await dbClient.connection.collection('files').insertOne(newFile);
      const { _id } = result.ops[0];
      return res.status(201).json({ id: _id, ...newFile });
    } catch (error) {
      console.log(`Error, Cannot create file: ${error}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * Retrieve the file document based on the ID
   */
  async getShow(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }

    // const { userId } = req;
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const file = await dbClient.connection.collection('files').findOne({ _id: id, userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  },

  /**
   * Retrieve all users file documents for a specific parentId
   * and with pagination.
   */
  async getIndex(req, res) {
    const { 'x-token': token } = req.headers;
    const { parentId = 0, page = 0 } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // const { userId } = req;
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const pageSize = 20;
    // eslint-disable-next-line radix
    const skip = parseInt(page) * pageSize;

    const files = await dbClient.connection.collection('files').aggregate([
      { $match: { parentId, userId } },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray();

    return res.status(200).json(files);
  },

  /**
   * Set isPublic to true on the file document based on the ID
   */
  async putPublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const file = await dbClient.connection.collection('files').findOne({ _id: id, userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.connection.collection('files').updateOne({ _id: id }, { $set: { isPublic: true } });

    const updatedFile = await dbClient.connection.collection('files').findOne({ _id: id });

    return res.status(200).json(updatedFile);
  },

  /**
   * Set isPublic to false on the file document based on the ID
   */
  async putUnpublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const file = await dbClient.connection.collection('files').findOne({ _id: id, userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.connection.collection('files').updateOne({ _id: id }, { $set: { isPublic: false } });

    const updatedFile = await dbClient.connection.collection('files').findOne({ _id: id });

    return res.status(200).json(updatedFile);
  },

  /**
   * Return the content of the file document based on the ID
   */
  async getFile(req, res) {
    const { id } = req.params;
    const { userId } = req;

    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.connection.collection('files').findOne({ _id: id });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!userId || file.userId !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mimeTypes.lookup(file.name);

    if (!mimeType) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.setHeader('Content-Type', mimeType);

    const fileContent = fs.readFileSync(file.localPath);

    return res.send(fileContent);
  },
};

module.exports = FilesController;
