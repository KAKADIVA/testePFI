const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const usuariosRoutes = require('./src/routes/usuariosRoutes');

const app = express();

// === Configurações básicas ===
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// === Configuração da sessão ===
app.use(session({
  secret: 'chaveSeguraAqui123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 2
  }
}));

// === Servir arquivos estáticos (HTML, CSS, JS, imagens) ===
app.use(express.static(path.join(__dirname, 'src/public')));

// === SERVIR ARQUIVOS DE UPLOAD ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === Rota principal ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// === Rotas da API ===
app.use('/usuarios', usuariosRoutes);

// === Iniciar servidor ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});