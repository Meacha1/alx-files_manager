const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sha1 = require('sha1');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

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

      // Extract required data from the request body
      const { name, type, data, parentId, isPublic } = req.body;

      // Check if name and type are provided
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }

      // Check if data is missing for file and image types
      if ((type === 'file' || type === 'image') && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Check if parentId is provided
      if (parentId !== undefined) {
        // Find the parent file in the database
        const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Create a new file document
      const fileDocument = {
        userId,
        name,
        type,
        parentId: parentId || 0,
        isPublic: isPublic || false,
      };

      // If the type is 'file' or 'image', store the file content locally
      if (type === 'file' || type === 'image') {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileUuid = uuidv4();
        const localPath = path.join(folderPath, fileUuid);

        // Save the file content locally
        const decodedData = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, decodedData);

        fileDocument.localPath = localPath;
      }

      // Insert the new file document into the collection
      const result = await dbClient.db.collection('files').insertOne(fileDocument);

      // Return the new file with a status code of 201
      const createdFile = {
        id: result.insertedId,
        userId,
        name,
        type,
        parentId: parentId || 0,
        isPublic: isPublic || false,
      };

      return res.status(201).json(createdFile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  static async getShow(req, res) {
    // Retrieve the user based on the token
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

      // Retrieve the file document based on the provided ID and user ID
      const fileId = req.params.id;
      const query = { _id: ObjectId(fileId), userId };

      const file = await dbClient.db.collection('files').findOne(query);

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getIndex(req, res) {
    // Retrieve the user based on the token
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

      // Extract query parameters
      const parentId = req.query.parentId || '0';
      const page = parseInt(req.query.page || 0);
      const perPage = 20;

      // Perform aggregation to paginate the files
      const pipeline = [
        {
          $match: {
            userId,
            parentId: parentId.toString(),
          },
        },
        {
          $skip: page * perPage,
        },
        {
          $limit: perPage,
        },
      ];

      const files = await dbClient.db.collection('files').aggregate(pipeline).toArray();

      return res.json(files);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = FilesController;
