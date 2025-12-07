const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5001;

// Login do admin
const ADMIN_USER = 'admin@clinica.com';
const ADMIN_PASS = 'senha123';

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if(email === ADMIN_USER && password === ADMIN_PASS){
    const token = jwt.sign({ admin: true }, 'segredo_admin', { expiresIn: '2h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Login inválido' });
});

// Exemplo de rota protegida: agendamentos
app.get('/api/admin/bookings', (req, res) => {
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ error: 'Token não fornecido' });
  const token = auth.split(' ')[1];
  try {
    jwt.verify(token, 'segredo_admin');
    res.json([{ id:1, client:'João', service:'Corte', date:'2025-12-08', time:'10:00', status:'Pendente' }]);
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.listen(PORT, () => console.log(`Admin backend rodando na porta ${PORT}`));
