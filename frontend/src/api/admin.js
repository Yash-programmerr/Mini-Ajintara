import client from './client.js';

const path = '/admin/properties';
export const adminKeys = (userId) => ['admin', userId, 'properties'];

export async function getPendingProperties(page, limit) {
  return (await client.get(path, { params: { status: 'pending', page, limit } })).data;
}

export async function getPropertyForReview(id) {
  return (await client.get(path + '/' + id)).data.property;
}

export async function reviewProperty(id, decision) {
  return (await client.patch(path + '/' + id + '/review', decision)).data.property;
}
