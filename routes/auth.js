const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  const hashed = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (name,email,password) VALUES (?,?,?)", [name, email, hashed], function(err) {
    if (err) return res.status(400).json({ error: 'Usuário já existe ou erro' });
    const user = { id: this.lastID, name, email };
    const token = jwt.sign(user, process.env.JWT_SECRET);
    res.json({ user, token });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    const payload = { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.json({ user: payload, token });
  });
});

module.exports = router;
