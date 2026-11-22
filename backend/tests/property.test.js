import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';
import { useDisposableReplica } from './helpers/replica.js';

const listing = {
  name: 'Garden Lodge', city: '  Goa ', address: '42 River Road', description: 'A garden by the river.',
  amenities: [' Wi-Fi ', 'Wi-Fi'], images: ['https://example.com/lodge.jpg'],
};
const room = { name: 'Deluxe', basePricePaise: 750000, totalRooms: 4, maxGuests: 3 };
const range = { from: '2027-02-01', to: '2027-02-03' };

describe.skipIf(!process.env.TEST_REPLICA_URI)('A2 property management', () => {
  useDisposableReplica('property');
  const users = {};
  const tokens = {};
  beforeAll(async () => {
    for (const [name, role] of [['Owner', 'partner'], ['Other', 'partner'], ['Admin', 'admin'], ['Guest', 'guest']]) {
      users[name] = await User.create({ name, role, email: name + '@test.example', passwordHash: 'unused' });
      tokens[name] = jwt.sign({ sub: users[name].id }, env.JWT_SECRET);
    }
  });
  function api(method, path, who = 'Owner') {
    return request(app)[method]('/api/' + path).set('Authorization', 'Bearer ' + tokens[who]);
  }
  const create = (body = listing) => api('post', 'partner/properties').send(body);
  const review = (id, body) => api('patch', 'admin/properties/' + id + '/review', 'Admin').send(body);

  it('normalizes creation, lists the owned property and exposes public identifiers', async () => {
    const result = await create().expect(201);
    const { property } = result.body;
    expect(property).toMatchObject({ partnerId: users.Owner.id, status: 'pending', cityKey: 'goa', amenities: ['Wi-Fi'] });
    expect(property.id).toMatch(/^[a-f0-9]{24}$/);
    const roomsUrl = 'partner/properties/' + property.id + '/room-types';
    const added = await api('post', roomsUrl).send(room).expect(201);
    const roomId = added.body.roomType.id;
    await api('patch', 'partner/room-types/' + roomId).send({ maxGuests: 5 }).expect(200);
    for (const extra of [{ totalRooms: 2 }, { basePricePaise: 120000 }]) {
      await api('patch', 'partner/room-types/' + roomId).send(extra).expect(400);
    }
    const list = await api('get', 'partner/properties').expect(200);
    expect(list.body.properties).toContainEqual(expect.objectContaining({
      id: property.id, roomTypes: [expect.objectContaining({ id: roomId, maxGuests: 5 })],
    }));
    expect(list.text).not.toMatch(/"(_id|__v|passwordHash)"/);
    const changed = await api('patch', 'partner/properties/' + property.id).send({ city: ' New   Delhi ' }).expect(200);
    expect(changed.body.property.cityKey).toBe('new delhi');
    expect(changed.body.property.status).toBe('pending');
  });

  it('requires the correct role for each router', async () => {
    for (const path of ['partner/properties', 'admin/properties']) {
      await request(app).get('/api/' + path).expect(401);
      await api('get', path, 'Guest').expect(403);
    }
    await api('get', 'partner/properties', 'Admin').expect(403);
    await api('get', 'admin/properties', 'Owner').expect(403);
  });

  it.each([
    { images: [] }, { images: ['http://example.com/image'] }, { images: ['javascript:alert(1)'] },
    { images: ['data:image/png,test'] }, { status: 'approved' }, { partnerId: 'other' }, { cityKey: 'x' },
  ])('rejects invalid property fields %j', async (fields) => {
    const result = await create({ ...listing, ...fields }).expect(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns INVALID_ID before querying for malformed resource ids', async () => {
    const result = await api('get', 'partner/properties/invalid').expect(400);
    expect(result.body.error.code).toBe('INVALID_ID');
  });

  it('conceals another partner’s property, room type and inventory', async () => {
    const { body: { property } } = await create().expect(201);
    const path = 'partner/properties/' + property.id;
    const { body: { roomType } } = await api('post', path + '/room-types').send(room).expect(201);
    const roomPath = 'partner/room-types/' + roomType.id;
    const cases = [
      api('get', path, 'Other'), api('patch', path, 'Other').send({ name: 'Other Lodge' }),
      api('post', path + '/room-types', 'Other').send(room), api('patch', roomPath, 'Other').send({ name: 'Twin' }),
      api('get', roomPath + '/inventory', 'Other').query(range),
      api('put', roomPath + '/inventory', 'Other').send({ ...range, totalRooms: 5 }),
    ];
    for (const call of cases) {
      const result = await call.expect(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
    }
    const list = await api('get', 'partner/properties', 'Other');
    expect(list.body.properties).toEqual([]);
  });

  it('paginates pending properties, includes the partner and returns review details', async () => {
    const { body: { property } } = await create().expect(201);
    await create().expect(201);
    const page = (n) => api('get', 'admin/properties', 'Admin').query({ page: n, limit: 1 }).expect(200);
    const [first, second] = await Promise.all([page(1), page(2)]);
    expect(first.body).toMatchObject({ page: 1, limit: 1, totalPages: first.body.total });
    expect(first.body.items[0]).toMatchObject({ status: 'pending', partnerId: { id: users.Owner.id, email: users.Owner.email, name: 'Owner' } });
    expect(first.body.items[0].id).not.toBe(second.body.items[0].id);
    const detail = await api('get', 'admin/properties/' + property.id, 'Admin').expect(200);
    expect(detail.body.property).toMatchObject({ id: property.id, roomTypes: [] });
    expect(first.text + detail.text).not.toMatch(/"(_id|__v|passwordHash)"/);
    await api('get', 'admin/properties', 'Admin').query({ limit: 51 }).expect(400);
  });

  it('resubmits rejected edits and keeps approval on later edits', async () => {
    const { body: { property } } = await create().expect(201);
    const path = 'partner/properties/' + property.id;
    const reason = 'Please confirm the street address.';
    await review(property.id, { action: 'reject' }).expect(400);
    await review(property.id, { action: 'reject', reason }).expect(200);
    expect((await api('get', path)).body.property).toMatchObject({ status: 'rejected', rejectReason: reason });
    const edited = await api('patch', path).send({ name: '$updated' }).expect(200);
    expect(edited.body.property).toMatchObject({ name: '$updated', status: 'pending', rejectReason: null });
    await review(property.id, { action: 'approve' }).expect(200);
    const approved = await api('patch', path).send({ city: 'Jaipur' }).expect(200);
    expect(approved.body.property).toMatchObject({ status: 'approved', rejectReason: null });
    expect((await review(property.id, { action: 'approve' }).expect(409)).body.error.code).toBe('NOT_PENDING');
    await review('000000000000000000000001', { action: 'approve' }).expect(404);
  });

  it('lets exactly one concurrent reviewer decide a pending listing', async () => {
    const { body: { property } } = await create().expect(201);
    const results = await Promise.all([review(property.id, { action: 'approve' }),
      review(property.id, { action: 'reject', reason: 'Incomplete address' })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409).body.error.code).toBe('NOT_PENDING');
  });
});
