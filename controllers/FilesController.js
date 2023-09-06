const { ObjectID } = require('mongodb');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Queue = require('bull');
const { findUserIdByToken } = require('../utils/helpers');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const thumbnail = require('image-thumbnail'); 

class UpdatedFilesController {
  /**
   * Creates a new file in the database and on disk.
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Object} The response containing the newly created file.
   */
  static async postUpload(request, response) {
    const fileQueue = new Queue('fileQueue');
    const userId = await findUserIdByToken(request);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId, isPublic, data } = request.body;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing or invalid type' });
    }

    if (type !== 'folder' && !data) {
      return response.status(400).json({ error: 'Missing data' });
    }

    let parentFile;

    if (parentId !== 0) {
      parentFile = await dbClient.files.findOne({
        _id: ObjectID(parentId),
        type: 'folder',
      });

      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found or not a folder' });
      }
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const filenameUUID = uuidv4();
    const localPath = `${folderPath}/${filenameUUID}`;

    if (type !== 'folder') {
      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData);

      if (type === 'image') {
        // Handle image-specific functionality here, e.g., generating thumbnails
        await fs.promises.writeFile(localPath, clearData, { encoding: 'binary' });
        await fileQueue.add({ userId, fileId: filenameUUID, localPath });
      }
    }

    const fileToInsert = {
      userId: ObjectID(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId === 0 ? 0 : ObjectID(parentId),
      localPath: type !== 'folder' ? localPath : null,
    };

    const result = await dbClient.files.insertOne(fileToInsert);

    return response.status(201).json({
      id: result.ops[0]._id.toString(),
      userId,
      name,
      type,
      isPublic: result.ops[0].isPublic,
      parentId: result.ops[0].parentId.toString(),
    });
  }

  /**
   * Retrieves a file based on its ID.
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Object} The response containing the file.
   */
  static async getShow(request, response) {
    // Retrieve the user based on the token
    const token = request.headers['x-token'];
    if (!token) { return response.status(401).json({ error: 'Unauthorized' }); }
    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) { return response.status(401).json({ error: 'Unauthorized' }); }
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) });
    if (!user) { return response.status(401).json({ error: 'Unauthorized' }); }

    const idFile = request.params.id || '';
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(idFile), userId: user._id });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  /**
   * Retrieves files attached to the user with optional pagination.
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Object} The response containing the list of files.
   */
  static async getIndex(request, response) {
    // Retrieve the user based on the token
    const token = request.headers['x-token'];
    if (!token) { return response.status(401).json({ error: 'Unauthorized' }); }
    const keyID = await redisClient.get(`auth_${token}`);
    if (!keyID) { return response.status(401).json({ error: 'Unauthorized' }); }
    const parentId = request.query.parentId || '0';
    const pagination = request.query.page || 0;
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) });
    if (!user) response.status(401).json({ error: 'Unauthorized' });

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await dbClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return response.send(filesArray);
  }
  
  /**
   * Sets isPublic to true on the file document based on the ID.
   * @param {object} request - The HTTP request object.
   * @param {object} response - The HTTP response object.
   */
  static async putPublish(request, response) {
    // Retrieve the user based on the token
    const userId = await findUserIdByToken(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id || '';
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(fileId), userId: ObjectID(userId) });

    if (!fileDocument) return response.status(404).json({ error: 'Not found' });

    // Update the value of isPublic to true
    await dbClient.db
      .collection('files')
      .updateOne({ _id: ObjectID(fileId) }, { $set: { isPublic: true } });

    return response.status(200).json(fileDocument);
  }

  /**
   * Sets isPublic to false on the file document based on the ID.
   * @param {object} request - The HTTP request object.
   * @param {object} response - The HTTP response object.
   */
  static async putUnpublish(request, response) {
    // Retrieve the user based on the token
    const userId = await findUserIdByToken(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id || '';
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(fileId), userId: ObjectID(userId) });

    if (!fileDocument) return response.status(404).json({ error: 'Not found' });

    // Update the value of isPublic to false
    await dbClient.db
      .collection('files')
      .updateOne({ _id: ObjectID(fileId) }, { $set: { isPublic: false } });

    return response.status(200).json(fileDocument);
  }
  
  /**
   * Returns the content of the file document based on the ID.
   * @param {object} request - The HTTP request object.
   * @param {object} response - The HTTP response object.
   */
  static async getFile(request, response) {
    const userId = await findUserIdByToken(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id || '';
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(fileId) });

    if (!fileDocument) return response.status(404).json({ error: 'Not found' });

    if (!fileDocument.isPublic && (fileDocument.userId !== userId)) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (fileDocument.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }

    const size = request.query.size || ''; // Get the size query parameter
    const localFilePath = `${localPath}_${size}`; // Construct the path for the thumbnail

    if (!fs.existsSync(localPath)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(fileDocument.name) || 'application/octet-stream';

    response.setHeader('Content-Type', mimeType);
    response.sendFile(localPath);
  }

}

module.exports = UpdatedFilesController;
