import client from './client.js';

const path = '/admin/properties';
export const adminKeys = (userId) => ['admin', userId, 'properties'];

export async function getPendingProperties(page, limit, signal) {
  return (await client.get(path, { params: { status: 'pending', page, limit }, signal })).data;
}

export async function getPropertyForReview(id, signal) {
  return (await client.get(path + '/' + id, { signal })).data.property;
}

export async function reviewProperty(id, decision) {
  return (await client.patch(path + '/' + id + '/review', decision)).data.property;
}
