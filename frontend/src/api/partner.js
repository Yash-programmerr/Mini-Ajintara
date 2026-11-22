import client from './client.js';

const properties = '/partner/properties';
const roomUrl = (id) => '/partner/room-types/' + id;

export const partnerKeys = (userId) => ['partner', userId];
export const propertyKey = (userId, id) => [...partnerKeys(userId), 'properties', id];
export const inventoryKey = (userId, id) => [...partnerKeys(userId), 'inventory', id];

export async function getProperties() {
  return (await client.get(properties)).data.properties;
}

export async function getProperty(id) {
  return (await client.get(properties + '/' + id)).data.property;
}

export async function saveProperty(id, fields) {
  const response = id ? await client.patch(properties + '/' + id, fields) : await client.post(properties, fields);
  return response.data.property;
}

export async function addRoomType(propertyId, fields) {
  return (await client.post(properties + '/' + propertyId + '/room-types', fields)).data.roomType;
}

export async function editRoomType(id, fields) {
  return (await client.patch(roomUrl(id), fields)).data.roomType;
}

export async function getInventory(id, from, to) {
  return (await client.get(roomUrl(id) + '/inventory', { params: { from, to } })).data.inventory;
}

export async function updateInventory(id, fields) {
  return (await client.put(roomUrl(id) + '/inventory', fields)).data;
}
