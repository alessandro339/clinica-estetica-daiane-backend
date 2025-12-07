const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');

function adminAuth(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).send({error:'No token'});
  const token = auth.split(' ')[1];
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if(!user.isAdmin) return res.status(403).json({error:'Apenas admin'});
    req.user = user; next();
  } catch(e) { return res.status(401).json({error:'Token inválido'}) }
}

router.post('/service', adminAuth, (req,res)=>{
  const { name, duration_minutes, description } = req.body;
  db.run("INSERT INTO services (name, duration_minutes, description) VALUES (?,?,?)", [name, duration_minutes || 60, description || ''], function(err){
    if(err) return res.status(400).json({error:'erro ao adicionar'});
    res.json({ id: this.lastID, name, duration_minutes, description });
  });
});

router.get('/bookings', adminAuth, (req,res)=>{
  db.all("SELECT b.id,b.date,b.time,b.status,u.name as client, s.name as service FROM bookings b JOIN users u ON b.user_id=u.id JOIN services s ON b.service_id=s.id ORDER BY b.date, b.time", (err,rows)=> res.json(rows));
});

router.post('/bookings/:id/approve', adminAuth, (req,res)=>{
  const id = req.params.id;
  const { action } = req.body;
  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, id], function(err){
    if(err) return res.status(400).json({error:'erro'});
    res.json({ id, status });
  });
});

module.exports = router;
