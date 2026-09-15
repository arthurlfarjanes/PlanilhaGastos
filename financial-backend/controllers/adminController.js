const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Listar todos os usuários
exports.listarUsuarios = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, is_active FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Criar novo usuário (Admin)
exports.criarUsuario = async (req, res, next) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email e senha são obrigatórios." });
  }

  try {
    // Check if exists
    const userExists = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email já está em uso." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO usuarios (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
      [username, email, hashedPassword, role || "user"]
    );
    res.status(201).json({ message: "Usuário criado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Editar Usuário
exports.editarUsuario = async (req, res, next) => {
  const { id } = req.params;
  const { username, email, role } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ error: "Username, email e role são obrigatórios." });
  }

  try {
    // Check if email is used by another user
    const userExists = await pool.query("SELECT id FROM usuarios WHERE email = $1 AND id != $2", [email, id]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email já está em uso por outro usuário." });
    }

    const result = await pool.query(
      "UPDATE usuarios SET username = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, username, email, role",
      [username, email, role, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({ message: "Usuário atualizado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Deletar Usuário
exports.deletarUsuario = async (req, res, next) => {
  const { id } = req.params;
  const { adminPassword } = req.body;

  try {
    // Buscar o usuário alvo para checar a role
    const targetUser = await pool.query("SELECT id, role FROM usuarios WHERE id = $1", [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Previne que o admin se delete
    if (parseInt(id) === req.user.userId) {
      return res.status(403).json({ error: "Você não pode deletar a sua própria conta." });
    }

    // Se o alvo for admin, exige a senha do admin que está executando a ação
    if (targetUser.rows[0].role === 'admin') {
      if (!adminPassword) {
        return res.status(400).json({ error: "Senha do administrador é obrigatória para deletar outro admin." });
      }

      // Buscar o hash do admin logado
      const currentUser = await pool.query("SELECT password_hash FROM usuarios WHERE id = $1", [req.user.userId]);
      const currentHash = currentUser.rows[0].password_hash;

      if (!currentHash) {
        return res.status(403).json({ error: "Sua conta não possui uma senha configurada (Login via Google). Por favor, vá no seu perfil e crie uma senha antes de realizar ações de segurança." });
      }

      const isPasswordValid = await bcrypt.compare(adminPassword, currentHash);
      
      if (!isPasswordValid) {
        return res.status(403).json({ error: "Senha de administrador incorreta." });
      }
    }

    // Deleta o usuário (cascata deve lidar com as transações se configurado, ou precisamos deletar antes)
    await pool.query("DELETE FROM transacoes WHERE user_id = $1", [id]);
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);

    res.json({ message: "Usuário deletado com sucesso." });
  } catch (err) {
    next(err);
  }
};

// Ativar/Desativar usuário
exports.toggleStatusUsuario = async (req, res, next) => {
  const { id } = req.params;
  const { is_active, adminPassword } = req.body;

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "Status 'is_active' deve ser booleano." });
  }

  // Previne que o admin se desative acidentalmente
  if (parseInt(id) === req.user.userId && is_active === false) {
    return res.status(403).json({ error: "Você não pode desativar a sua própria conta." });
  }

  try {
    // Buscar o usuário alvo para checar a role
    const targetUser = await pool.query("SELECT id, role FROM usuarios WHERE id = $1", [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Se o alvo for admin, exige a senha do admin logado
    if (targetUser.rows[0].role === 'admin') {
      if (!adminPassword) {
        return res.status(400).json({ error: "Senha do administrador é obrigatória para alterar status de outro admin." });
      }

      const currentUser = await pool.query("SELECT password_hash FROM usuarios WHERE id = $1", [req.user.userId]);
      const currentHash = currentUser.rows[0].password_hash;

      if (!currentHash) {
        return res.status(403).json({ error: "Sua conta não possui uma senha configurada (Login via Google). Por favor, vá no seu perfil e crie uma senha antes de realizar ações de segurança." });
      }

      const isPasswordValid = await bcrypt.compare(adminPassword, currentHash);
      
      if (!isPasswordValid) {
        return res.status(403).json({ error: "Senha de administrador incorreta." });
      }
    }

    const result = await pool.query(
      "UPDATE usuarios SET is_active = $1 WHERE id = $2 RETURNING id, username, is_active",
      [is_active, id]
    );

    res.json({ message: "Status atualizado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Reset de senha (gera uma senha temporária genérica)
exports.resetSenha = async (req, res, next) => {
  const { id } = req.params;
  const newPassword = "mefinance_reset_" + Math.floor(1000 + Math.random() * 9000);

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await pool.query(
      "UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING id, username",
      [hashedPassword, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({ 
      message: "Senha redefinida com sucesso.", 
      tempPassword: newPassword,
      user: result.rows[0].username 
    });
  } catch (err) {
    next(err);
  }
};

// Obter transações e dados de um usuário (Relatório)
exports.relatorioUsuario = async (req, res, next) => {
  const { id } = req.params;

  try {
    const transacoes = await pool.query(
      "SELECT id, descricao, valor, tipo, data::text FROM transacoes WHERE user_id = $1 ORDER BY data DESC",
      [id]
    );

    const balanco = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as total_receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as total_despesas
       FROM transacoes WHERE user_id = $1`,
      [id]
    );

    res.json({
      transacoes: transacoes.rows,
      resumo: {
        totalReceitas: parseFloat(balanco.rows[0].total_receitas),
        totalDespesas: parseFloat(balanco.rows[0].total_despesas),
        saldo: parseFloat(balanco.rows[0].total_receitas) - parseFloat(balanco.rows[0].total_despesas)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Obter os logs do sistema
exports.getSystemLogs = async (req, res, next) => {
  const { startDate, endDate, userId } = req.query;

  try {
    let query = `
      SELECT l.id, l.level, l.message, l.route, l.created_at, l.user_id, u.username
      FROM system_logs l
      LEFT JOIN usuarios u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND l.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND l.created_at <= $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      query += ` AND l.user_id = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT 500`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
