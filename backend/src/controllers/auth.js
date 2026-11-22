import * as auth from '../services/auth.js';

export async function signup(req, res) {
  res.status(201).json(await auth.signup(req.body));
}

export async function login(req, res) {
  res.json(await auth.login(req.body));
}

export function me(req, res) {
  res.json({ user: req.user });
}
