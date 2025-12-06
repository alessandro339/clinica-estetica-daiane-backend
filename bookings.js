const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).send({error:'No token'});
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(e) { return res.status(401).json({error:'Token inválido'}) }
}

router.get('/services', (req,res)=>{
  db.all("SELECT * FROM services", (err,rows)=> res.json(rows));
});

router.get('/availability', (req,res)=>{
  const { date, service_id } = req.query;
  if(!date || !service_id) return res.status(400).json({error:'date e service_id são obrigatórios'});
  db.get("SELECT duration_minutes FROM services WHERE id = ?", [service_id], (err, srv) => {
    if(err || !srv) return res.status(400).json({error:'serviço não encontrado'});
    const duration = srv.duration_minutes;
    const slots = [];
    const start = 9*60; const end = 18*60;
    for(let m = start; m + duration <= end; m += duration){
      const hh = String(Math.floor(m/60)).padStart(2,'0');
      const mm = String(m%60).padStart(2,'0');
      slots.push(`${hh}:${mm}`);
    }
    db.all("SELECT time FROM bookings WHERE date = ? AND service_id = ? AND status != 'CANCELLED'", [date, service_id], (err, rows) => {
      const booked = rows.map(r => r.time);
      const avail = slots.filter(s => !booked.includes(s));
      res.json(avail);
    });
  });
});

router.post('/', authMiddleware, (req,res)=>{
  const { service_id, date, time } = req.body;
  const user_id = req.user.id;
  const created_at = new Date().toISOString();
  db.run("INSERT INTO bookings (user_id, service_id, date, time, created_at) VALUES (?,?,?,?,?)",
    [user_id, service_id, date, time, created_at], function(err){
      if(err) return res.status(400).json({error:'erro ao criar agendamento'});
      const bookingId = this.lastID;
      notifyOwner({ bookingId, date, time });
      res.json({ bookingId, status: 'PENDING' });
    });
});

function notifyOwner({bookingId, date, time}){
  db.get("SELECT b.id,b.date,b.time,u.name as client, u.email as client_email, s.name as service FROM bookings b JOIN users u ON b.user_id = u.id JOIN services s ON b.service_id = s.id WHERE b.id = ?", [bookingId], (err,row)=>{
    if(!row) return;
    const owner = process.env.OWNER_EMAIL;
    const subject = `Novo agendamento #${bookingId} - ${row.service}`;
    const html = `<p>Novo agendamento por ${row.client}</p><p>Serviço: ${row.service}</p><p>Data: ${date} - ${time}</p><p>Abra o painel para aprovar.</p>`;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      transporter.sendMail({ from: process.env.SMTP_USER, to: owner, subject, html }).catch(console.error);
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM && process.env.OWNER_PHONE) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const body = `Novo agendamento #${bookingId}\nCliente: ${row.client}\nServiço: ${row.service}\nData: ${date} ${time}\nVerifique o painel para aprovar.`;
        client.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:${process.env.OWNER_PHONE}`,
          body
        }).catch(console.error);
      } catch(e){ console.error('twilio error', e.message) }
    }
  });
}

module.exports = router;
