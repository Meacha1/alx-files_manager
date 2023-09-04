const { describe, it, before } = require('just');
const { expect } = require('chai'); // You can use the Chai assertion library

const dbClient = require('../../utils/db');

describe('+ DBClient utility', () => {
  before(async () => {
    const [usersCollection, filesCollection] = await Promise.all([
      dbClient.usersCollection(),
      dbClient.filesCollection(),
    ]);
    await Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})]);
  });

  it('+ Client is alive', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('+ nbUsers returns the correct value', async () => {
    expect(await dbClient.nbUsers()).to.equal(0);
  });

  it('+ nbFiles returns the correct value', async () => {
    expect(await dbClient.nbFiles()).to.equal(0);
  });
});
