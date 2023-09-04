const { Worker, Queue } = require('bull');
const dbClient = require('./utils/db');
const userQueue = new Queue('userQueue');

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

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  // Retrieve the user from the database
  const user = await dbClient.users.findOne({ _id: userId });

  if (!user) throw new Error('User not found');

  // Simulate sending a welcome email
  console.log(`Welcome ${user.email}!`);
});
