import Bull from 'bull';
import fs from 'fs';
import thumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.connection.collection('files').findOne({ _id: fileId, userId });

  if (!file) {
    throw new Error('File not found');
  }

  const imageSizes = [500, 250, 100];
  const promises = imageSizes.map((size) => {
    const thumbnailPath = `${file.localPath}_${size}`;

    return thumbnail(file.localPath, { width: size })
      .then((thumb) => fs.writeFileSync(thumbnailPath, thumb))
      .catch((err) => console.log(`Error generating thumbnail for size ${size}:`, err));
  });
  await Promise.all(promises);
});

module.exports = fileQueue;
