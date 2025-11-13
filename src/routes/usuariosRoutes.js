const express = require('express');
const router = express.Router();
const conexao = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configure multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'anexo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens, PDFs e documentos são permitidos'));
    }
  }
});

// === CADASTRO DE USUÁRIO ===
router.post('/register', async (req, res) => {
  const { nome, email, senha, profissional } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos!' });
  }

  try {
    const [existe] = await conexao.promise().query(
      'SELECT id FROM usuario WHERE email = ?',
      [email]
    );
    if (existe.length > 0) {
      return res.status(409).json({ mensagem: 'E-mail já cadastrado!' });
    }

    const hash = await bcrypt.hash(senha, 10);
    
    const [result] = await conexao.promise().query(
       'INSERT INTO usuario (nome, email, senha, profissional) VALUES (?, ?, ?, ?)',
       [nome, email, hash, profissional ? 1 : 0]
    );

    req.session.usuario = { 
      id: result.insertId, 
      nome,
      profissional: profissional || false
    };

    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso!',
      id: result.insertId,
      nome,
      profissional: profissional || false
    });
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro);
    res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
});

// === LOGIN ===
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Informe e-mail e senha!' });
  }

  try {
    const [rows] = await conexao.promise().query(
      'SELECT id, nome, senha, profissional FROM usuario WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensagem: 'E-mail ou senha inválidos!' });
    }

    const usuario = rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'E-mail ou senha inválidos!' });
    }

    req.session.usuario = { 
      id: usuario.id, 
      nome: usuario.nome,
      profissional: usuario.profissional
    };

    res.json({ 
      id: usuario.id, 
      nome: usuario.nome,
      profissional: usuario.profissional
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ mensagem: 'Erro no servidor ao efetuar login.' });
  }
});

// === VERIFICAR SESSÃO ===
router.get('/sessao', (req, res) => {
  if (req.session.usuario) {
    res.json(req.session.usuario);
  } else {
    res.status(401).json({ mensagem: 'Não autenticado' });
  }
});

// === LOGOUT ===
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
      return res.status(500).json({ mensagem: 'Erro ao sair.' });
    }
    res.clearCookie('connect.sid');
    res.json({ mensagem: 'Logout realizado com sucesso!' });
  });
});

// === FÓRUM: PERGUNTAS ===
router.get('/pergunta', async (req, res) => {
  try {
    const [rows] = await conexao.promise().query(`
      SELECT p.id, p.titulo, p.descricao, p.fk_Usuario_id as usuario_id, 
             p.nome_arquivo, u.nome AS autor, u.profissional
      FROM pergunta p
      LEFT JOIN usuario u ON u.id = p.fk_Usuario_id
      ORDER BY p.id DESC
    `);
    res.status(200).json(rows);
  } catch (erro) {
    console.error('Erro ao buscar perguntas:', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar perguntas.' });
  }
});

// === CRIAR PERGUNTA COM UPLOAD (100% CORRIGIDO) ===
router.post('/pergunta', upload.single('anexo'), async (req, res) => {
  try {
    console.log('📝 Recebendo pergunta...');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    if (!req.session.usuario) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado' });
    }

    const { titulo, descricao } = req.body;
    const usuario_id = req.session.usuario.id;

    if (!titulo || !descricao) {
      return res.status(400).json({ mensagem: 'Título e descrição são obrigatórios' });
    }

    // Processar o anexo se existir
    let nome_arquivo = null;

    if (req.file) {
      nome_arquivo = req.file.filename;
      console.log('✅ Anexo salvo como:', nome_arquivo);
    }

    // QUERY CORRETA para sua tabela (apenas nome_arquivo)
    const query = `
      INSERT INTO pergunta (titulo, descricao, fk_Usuario_id, nome_arquivo) 
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await conexao.promise().query(query, [
      titulo, 
      descricao, 
      usuario_id, 
      nome_arquivo
    ]);

    console.log('✅ Pergunta inserida com ID:', result.insertId);

    // Buscar a pergunta criada
    const [pergunta] = await conexao.promise().execute(`
      SELECT p.*, u.nome as autor, u.profissional 
      FROM pergunta p 
      JOIN usuario u ON p.fk_Usuario_id = u.id 
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json({
      mensagem: 'Pergunta criada com sucesso!',
      pergunta: pergunta[0]
    });

  } catch (error) {
    console.error('🔴 ERRO DETALHADO ao criar pergunta:');
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ mensagem: 'Arquivo muito grande. Máximo 5MB.' });
      }
    }
    
    res.status(500).json({ 
      mensagem: 'Erro interno do servidor ao criar pergunta',
      erro: error.message 
    });
  }
});

// === EXCLUIR PERGUNTA ===
router.delete('/pergunta/:id', async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado' });
    }

    const perguntaId = req.params.id;
    const usuario_id = req.session.usuario.id;

    // Verificar se a pergunta existe e se o usuário é o autor
    const [perguntas] = await conexao.promise().execute(
      'SELECT * FROM pergunta WHERE id = ? AND fk_Usuario_id = ?',
      [perguntaId, usuario_id]
    );

    if (perguntas.length === 0) {
      return res.status(404).json({ mensagem: 'Pergunta não encontrada ou você não tem permissão para excluí-la' });
    }

    // Primeiro excluir as respostas associadas
    await conexao.promise().execute(
      'DELETE FROM resposta WHERE fk_Pergunta_id = ?',
      [perguntaId]
    );

    // Depois excluir a pergunta
    await conexao.promise().execute(
      'DELETE FROM pergunta WHERE id = ?',
      [perguntaId]
    );

    res.json({ mensagem: 'Pergunta excluída com sucesso!' });

  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
});

// === FÓRUM: RESPOSTAS ===
router.get('/resposta/:perguntaId', async (req, res) => {
  const { perguntaId } = req.params;
  try {
    const [rows] = await conexao.promise().query(`
      SELECT r.*, u.nome AS autor, u.profissional, r.fk_Usuario_id as usuario_id
      FROM resposta r 
      LEFT JOIN usuario u ON u.id = r.fk_Usuario_id 
      WHERE r.fk_Pergunta_id = ? 
      ORDER BY r.id ASC`,
      [perguntaId]
    );
    res.status(200).json(rows);
  } catch (erro) {
    console.error('Erro ao buscar respostas:', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar respostas.' });
  }
});

router.post('/resposta', async (req, res) => {
  const { descricao, pergunta_id } = req.body;

  if (!req.session.usuario) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
  }

  // VERIFICA SE É PROFISSIONAL
  if (!req.session.usuario.profissional) {
    return res.status(403).json({ mensagem: 'Apenas profissionais podem responder perguntas.' });
  }

  const usuario_id = req.session.usuario.id;

  if (!descricao || !pergunta_id) {
    return res.status(400).json({ mensagem: 'Campos obrigatórios faltando.' });
  }

  try {
    await conexao.promise().query(
      'INSERT INTO resposta (descricao, fk_Pergunta_id, fk_Usuario_id) VALUES (?, ?, ?)',
      [descricao, pergunta_id, usuario_id]
    );
    res.status(201).json({ mensagem: 'Resposta cadastrada com sucesso!' });
  } catch (erro) {
    console.error('Erro ao cadastrar resposta:', erro);
    res.status(500).json({ mensagem: 'Erro ao cadastrar resposta.' });
  }
});

// === EXCLUIR RESPOSTA ===
router.delete('/resposta/:id', async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado' });
    }

    const respostaId = req.params.id;
    const usuario_id = req.session.usuario.id;

    // Verificar se a resposta existe e se o usuário é o autor
    const [respostas] = await conexao.promise().execute(
      'SELECT * FROM resposta WHERE id = ? AND fk_Usuario_id = ?',
      [respostaId, usuario_id]
    );

    if (respostas.length === 0) {
      return res.status(404).json({ mensagem: 'Resposta não encontrada ou você não tem permissão para excluí-la' });
    }

    // Excluir a resposta
    await conexao.promise().execute(
      'DELETE FROM resposta WHERE id = ?',
      [respostaId]
    );

    res.json({ mensagem: 'Resposta excluída com sucesso!' });

  } catch (error) {
    console.error('Erro ao excluir resposta:', error);
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
});

// === PROFISSIONAIS ===
router.get('/profissional', async (req, res) => {
  try {
    const [rows] = await conexao.promise().query(
      'SELECT id, nome, especialidade, cidade, contato FROM profissional ORDER BY nome ASC'
    );
    res.status(200).json(rows);
  } catch (erro) {
    console.error('Erro ao buscar profissionais:', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar profissionais.' });
  }
});

// === MUDANÇA DE SENHA ===
router.post('/mudar-senha', async (req, res) => {
  console.log('📝 Recebendo requisição para mudar senha...');
  
  const { senhaAtual, novaSenha } = req.body;
  console.log('Dados recebidos:', { senhaAtual, novaSenha });

  if (!req.session.usuario) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
  }

  if (!senhaAtual || !novaSenha) {
    console.log('❌ Campos faltando');
    return res.status(400).json({ mensagem: 'Preencha todos os campos!' });
  }

  if (novaSenha.length < 6) {
    console.log('❌ Senha muito curta');
    return res.status(400).json({ mensagem: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const usuarioId = req.session.usuario.id;
    console.log('👤 ID do usuário:', usuarioId);
    
    // Buscar usuário e senha atual
    const [rows] = await conexao.promise().query(
      'SELECT senha FROM usuario WHERE id = ?',
      [usuarioId]
    );

    if (rows.length === 0) {
      console.log('❌ Usuário não encontrado no banco');
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];
    console.log('✅ Usuário encontrado');
    
    // Verificar senha atual
    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
    console.log('🔐 Senha atual correta?', senhaCorreta);
    
    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Senha atual incorreta.' });
    }

    // Criptografar nova senha
    const hashNovaSenha = await bcrypt.hash(novaSenha, 10);
    
    // Atualizar senha no banco
    await conexao.promise().query(
      'UPDATE usuario SET senha = ? WHERE id = ?',
      [hashNovaSenha, usuarioId]
    );

    console.log('✅ Senha alterada com sucesso!');
    res.json({ mensagem: 'Senha alterada com sucesso!' });
    
  } catch (erro) {
    console.error('❌ Erro ao mudar senha:', erro);
    res.status(500).json({ mensagem: 'Erro ao alterar senha.' });
  }
});

module.exports = router;