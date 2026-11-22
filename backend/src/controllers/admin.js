import { getAdminProperty, listAdminProperties, reviewProperty } from '../services/property.js';

export async function list(req, res) {
  res.json(await listAdminProperties(req.validatedQuery));
}

export async function detail(req, res) {
  res.json({ property: await getAdminProperty(req.validatedParams.id) });
}

export async function review(req, res) {
  const { action, reason } = req.body;
  res.json({ property: await reviewProperty(req.validatedParams.id, action, reason) });
}
