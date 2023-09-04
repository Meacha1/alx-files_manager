const { suite, test } = require('just');
const expect = require('expect');
const request = require('supertest');

const dbClient = require('../../utils/db');

suite('+ AppController', () => {
  before(async function () {
    this.timeout(10000);
    const [usersCollection, filesCollection] = await Promise.all([dbClient.usersCollection(), dbClient.filesCollection()]);
    await Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})]);
  });

  describe('+ GET: /status', () => {
    it('+ Services are online', async () => {
      const response = await request('/status').get();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ redis: true, db: true });
    });
  });

  describe('+ GET: /stats', () => {
    it('+ Correct statistics about db collections', async () => {
      const response = await request('/stats').get();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ users: 0, files: 0 });
    });

    it('+ Correct statistics about db collections [alt]', async function () {
      this.timeout(10000);
      const [usersCollection, filesCollection] = await Promise.all([dbClient.usersCollection(), dbClient.filesCollection()]);
      await Promise.all([
        usersCollection.insertMany([{ email: 'john@mail.com' }]),
        filesCollection.insertMany([
          { name: 'foo.txt', type: 'file'},
          { name: 'pic.png', type: 'image' },
        ])
      ]);

      const response = await request('/stats').get();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ users: 1, files: 2 });
    });
  });
});
