const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(req, res) {
    // Retrieve the user ID based on the token
    const token = req.headers['x-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Retrieve the user ID associated with the token from Redis
      const redisKey = `auth_${token}`;
      const userId = await redisClient.get(redisKey);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Extract file attributes from the request body
      const { name, type, data, parentId, isPublic = false } = req.body;

      // Check for missing attributes
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Check parentId if provided
      if (parentId !== undefined) {
        const filesCollection = dbClient.db.collection('files');
        const parentFile = await filesCollection.findOne({ _id: parentId });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Create a new file document
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId: parentId || '0',
      };

      // If type is not folder, store the file on disk and update localPath
      if (type !== 'folder') {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        const filePath = path.join(folderPath, uuidv4());

        // Save the file content to disk
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

        newFile.localPath = filePath;
      }

      // Insert the new file document into the database
      const filesCollection = dbClient.db.collection('files');
      const result = await filesCollection.insertOne(newFile);

      // Return the new file with status code 201
      const createdFile = {
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId: parentId || '0',
      };

      return res.status(201).json(createdFile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = FilesController;
