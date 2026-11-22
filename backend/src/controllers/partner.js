import * as properties from '../services/property.js';
import * as inventory from '../services/inventory.js';

export async function listProperties(req, res) {
  res.json({ properties: await properties.listOwnedProperties(req.user.id) });
}

export async function getProperty(req, res) {
  res.json({ property: await properties.getOwnedProperty(req.validatedParams.id, req.user.id) });
}

export async function createProperty(req, res) {
  res.status(201).json({ property: await properties.createProperty(req.user.id, req.body) });
}

export async function updateProperty(req, res) {
  res.json({ property: await properties.updateProperty(req.validatedParams.id, req.user.id, req.body) });
}

export async function createRoomType(req, res) {
  const property = await properties.findOwnedProperty(req.validatedParams.id, req.user.id);
  res.status(201).json({ roomType: await inventory.createRoomTypeWithInventory(property, req.body, new Date()) });
}

export async function updateRoomType(req, res) {
  res.json({ roomType: await properties.updateOwnedRoomType(req.validatedParams.id, req.user.id, req.body) });
}

export async function getInventory(req, res) {
  const room = await properties.findOwnedRoomType(req.validatedParams.id, req.user.id);
  const { from, to } = req.validatedQuery;
  res.json({ inventory: await inventory.getInventoryRange(room.id, from, to) });
}

export async function updateInventory(req, res) {
  const room = await properties.findOwnedRoomType(req.validatedParams.id, req.user.id);
  res.json(await inventory.updateInventoryRange(room, req.body, new Date()));
}
