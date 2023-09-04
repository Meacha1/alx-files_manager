const assert = require('assert');
const { describe, it, before } = require('just');

// Import the necessary modules
const dbClient = require('../../utils/db');

describe('+ AuthController', () => {
  const mockUser = {
    email: 'meacha@gmail.com',
    password: '123456',
  };
  let token = '';

  before(async () => {
    this.timeout(10000);

    try {
      const usersCollection = await dbClient.usersCollection();
      await usersCollection.deleteMany({ email: mockUser.email });

      const res = await request.post('/users')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        })
        .expect(201);

      expect(res.body.email).to.eql(mockUser.email);
      expect(res.body.id.length).to.be.greaterThan(0);
    } catch (error) {
      throw error;
    }
  });

  describe('+ GET: /connect', () => {
    it('+ Fails with no "Authorization" header field', async () => {
      this.timeout(5000);

      try {
        const res = await request.get('/connect').expect(401);
        assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
      } catch (error) {
        throw error;
      }
    });

    it('+ Fails for a non-existent user', async () => {
      this.timeout(5000);

      try {
        const res = await request.get('/connect')
          .auth('foo@bar.com', 'raboof', { type: 'basic' })
          .expect(401);
        assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
      } catch (error) {
        throw error;
      }
    });

    it('+ Fails with a valid email and wrong password', async () => {
      this.timeout(5000);

      try {
        const res = await request.get('/connect')
          .auth(mockUser.email, 'raboof', { type: 'basic' })
          .expect(401);
        assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
      } catch (error) {
        throw error;
      }
    });

    it('+ Fails with an invalid email and valid password', async () => {
      this.timeout(5000);

      try {
        const res = await request.get('/connect')
          .auth('zoro@strawhat.com', mockUser.password, { type: 'basic' })
          .expect(401);
        assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
      } catch (error) {
        throw error;
      }
    });

    it('+ Succeeds for an existing user', async () => {
      this.timeout(5000);

      try {
        const res = await request.get('/connect')
          .auth(mockUser.email, mockUser.password, { type: 'basic' })
          .expect(200);
        assert.ok(res.body.token);
        assert(res.body.token.length > 0);
        token = res.body.token;
      } catch (error) {
        throw error;
      }
    });
  });
});
