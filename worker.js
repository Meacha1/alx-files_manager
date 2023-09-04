const Queue = require('bull');
const thumbnail = require('image-thumbnail');
const fs = require('fs');
const dbClient = require('./utils/db');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId, localPath } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  // Check if the document exists in the DB
  const fileDocument = await dbClient.files.findOne({
    _id: dbClient.ObjectID(fileId),
    userId: dbClient.ObjectID(userId),
  });

  if (!fileDocument) throw new Error('File not found');

  // Generate thumbnails with different sizes (500, 250, 100)
  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map(async (size) => {
    const thumbnailData = await thumbnail(localPath, { width: size });
    const thumbnailFileName = `${localPath}_${size}`;

    await fs.promises.writeFile(thumbnailFileName, thumbnailData, { flag: 'w+', encoding: 'binary' });
  });

  await Promise.all(thumbnailPromises);
});

fileQueue.on('completed', (job) => {
  console.log(`Thumbnail generation completed for job ${job.id}`);
});
