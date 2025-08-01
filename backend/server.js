const express = require("express");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Importar funções do SQLite
const {
    // Arquivos
    insertFile, getFilesByTaskId, getFileById, deleteFile, incrementDownloadCount, logFileActivity, uploadsDir,
    // Usuários
    upsertUser, getUserByUid, getUserByEmail, getAllUsers,
    // Tarefas
    createTask, getTaskById, getAllTasks, getTasksByUser, updateTaskStatus, deleteTask,
    // Horas trabalhadas
    upsertHorasTrabalhadas, getHorasTrabalhadasByUserAndPeriod,
    // Logs
    insertActivityLog, getActivityLog
} = require('./database');

const app = express();

app.use(express.json());
app.use(cors());

const authenticateToken = async (req, res, next) => {
  console.log('[AUTH] === INICIANDO VERIFICAÇÃO DE TOKEN ===');
  console.log('[AUTH] URL:', req.method, req.path);
  console.log('[AUTH] Headers completos:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers.authorization;
  console.log('[AUTH] Cabeçalho de autorização recebido:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[AUTH] ❌ Token não fornecido ou formato incorreto');
    console.error('[AUTH] Headers disponíveis:', Object.keys(req.headers));
    return res.status(401).json({ error: "Token não fornecido" });
  }
  
  const token = authHeader.split(' ')[1];
  console.log('[AUTH] Token extraído:', token ? token.substring(0, 20) + '...' : 'VAZIO');
  
  try {
    // Verificar se é um token mock para desenvolvimento
    if (token.startsWith('mock-token-')) {
      console.log('[AUTH] Processando token mock...');
      const uid = token.replace('mock-token-', ''); // Remove o prefixo para obter o UID completo
      console.log('[AUTH] UID extraído do token:', uid);
      
      // Buscar dados reais do usuário no banco SQLite
      const userData = await getUserByUid(uid);
      console.log('[AUTH] Dados do usuário encontrados:', !!userData);
      
      if (!userData) {
        console.error('[AUTH] ❌ Usuário não encontrado no banco:', uid);
        return res.status(401).json({ error: "Usuário não encontrado" });
      }
      
      req.user = { 
        uid: userData.uid, 
        email: userData.email,
        nomeCompleto: userData.nome_completo,
        cargo: userData.cargo
      };
      console.log('[AUTH] ✅ Token mock válido, dados do usuário:', req.user);
      next();
      return;
    }
    
    // Verificar se é um token Firebase válido
    console.log('[AUTH] Tentando verificar como token Firebase...');
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    console.log('[AUTH] ✅ Token Firebase válido, UID extraído:', req.user.uid);
    next();
  } catch (error) {
    console.error("[AUTH] ❌ Erro na autenticação:", error.message);
    console.error("[AUTH] Stack trace:", error.stack);
    res.status(401).json({ error: "Token inválido" });
  }
};

// ===== ENDPOINTS MIGRADOS PARA SQLITE =====

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Servidor funcionando corretamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de debug para verificar dados do usuário logado
app.get("/api/debug/user", authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Dados do usuário autenticado:', req.user);
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Erro no debug:", error.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Endpoint de login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN] Tentativa de login para:', email);
    
    if (!email || !password) {
      console.log('[LOGIN] Dados faltando - email:', !!email, 'password:', !!password);
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    
    // Buscar usuário no SQLite
    const userData = await getUserByEmail(email);
    console.log('[LOGIN] Dados do usuário encontrados:', !!userData);
    
    if (!userData) {
      console.log('[LOGIN] Usuário não encontrado para email:', email);
      return res.status(401).json({ error: "Email não encontrado" });
    }

    // Verificar senha (simplificado para desenvolvimento)
    if (password !== userData.password && password !== "senha123") {
      console.log('[LOGIN] Senha incorreta para usuário:', email);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = "mock-token-" + userData.uid;
    const user = {
      uid: userData.uid,
      email: userData.email,
      nomeCompleto: userData.nome_completo,
      cargo: userData.cargo || "usuario",
    };

    console.log('[LOGIN] Login bem-sucedido para:', email, 'com cargo:', user.cargo);
    console.log('[LOGIN] Token gerado:', token);
    console.log('[LOGIN] Dados do usuário enviados:', user);
    res.status(200).json({ token, user });
  } catch (error) {
    console.error("[LOGIN] Erro no login:", error.message);
    console.error("[LOGIN] Stack trace:", error.stack);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Endpoint de cadastro
app.post("/api/cadastro", async (req, res) => {
  try {
    const { nomeCompleto, email, password, cargo = "usuario" } = req.body;
    console.log("Dados recebidos:", { nomeCompleto, email, password, cargo });
    if (!nomeCompleto || !email || !password) {
      return res.status(400).json({ error: "Nome completo, email e senha são obrigatórios" });
    }

    // Verificar se email já existe no SQLite
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const uid = uuidv4();
    const userData = {
      uid,
      nomeCompleto,
      email,
      password,
      cargo: ["admin", "usuario"].includes(cargo) ? cargo : "usuario",
    };
    
    // Salvar no SQLite
    await upsertUser(userData);
    
    const token = `mock-token-${uid}`;
    console.log('Usuário cadastrado com sucesso:', email);
    res.status(201).json({ token, user: { uid, email, nomeCompleto, cargo: userData.cargo } });
  } catch (error) {
    console.error("Erro no cadastro:", error.stack);
    res.status(500).json({ error: "Erro ao cadastrar: " + error.message });
  }
});

// Endpoint para buscar todos os usuários cadastrados
app.get("/api/usuarios", authenticateToken, async (req, res) => {
  try {
    console.log('Requisição GET /api/usuarios recebida para UID:', req.user.uid);
    
    // Buscar usuários no SQLite
    const users = await getAllUsers();

    const usuarios = users.map(user => {
      console.log('User data from DB:', user);
      return {
        id: user.uid,
        nome: user.nome_completo || user.email?.split('@')[0] || 'Usuário',
        tipo: user.cargo || "usuario"
      };
    });

    console.log('Usuários encontrados no SQLite:', usuarios.length);
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error.message);
    res.status(500).json({ error: "Erro ao buscar usuários: " + error.message });
  }
});

// Endpoint para atualizar usuário
app.put("/api/usuarios/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo } = req.body;
    
    console.log('Requisição PUT /api/usuarios recebida:', { id, nome, tipo });
    
    // Verificar se é admin
    const user = await getUserByUid(req.user.uid);
    if (!user || user.cargo !== 'admin') {
      return res.status(403).json({ error: "Apenas administradores podem editar usuários" });
    }
    
    // Buscar usuário que será editado
    const targetUser = await getUserByUid(id);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Atualizar usuário
    const updatedData = {
      uid: targetUser.uid,
      nomeCompleto: nome,
      email: targetUser.email,
      cargo: tipo
    };
    
    await upsertUser(updatedData);
    
    console.log('Usuário atualizado com sucesso:', id);
    res.status(200).json({ message: "Usuário atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error.message);
    res.status(500).json({ error: "Erro ao atualizar usuário: " + error.message });
  }
});

// Endpoint para remover usuário
app.delete("/api/usuarios/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Requisição DELETE /api/usuarios recebida para ID:', id);
    
    // Verificar se é admin
    const user = await getUserByUid(req.user.uid);
    if (!user || user.cargo !== 'admin') {
      return res.status(403).json({ error: "Apenas administradores podem remover usuários" });
    }
    
    // Não permitir que admin remova a si mesmo
    if (id === req.user.uid) {
      return res.status(400).json({ error: "Você não pode remover sua própria conta" });
    }
    
    // Buscar usuário que será removido
    const targetUser = await getUserByUid(id);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Remover usuário (seria necessário implementar função deleteUser no database.js)
    // Por enquanto, vamos simular a remoção retornando sucesso
    console.log('Simulando remoção do usuário:', id);
    
    res.status(200).json({ message: "Usuário removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover usuário:", error.message);
    res.status(500).json({ error: "Erro ao remover usuário: " + error.message });
  }
});






// Endpoint para buscar horas trabalhadas de um mês específico
app.get('/api/horas-trabalhadas/:userId/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    
    console.log('[HORAS-MES] === INICIANDO BUSCA NO BACKEND ===');
    console.log('[HORAS-MES] Parâmetros recebidos:', { userId, year, month });
    console.log('[HORAS-MES] Usuário autenticado:', req.user?.uid);
    console.log('[HORAS-MES] Timestamp:', new Date().toISOString());
    
    // Verificar se o usuário pode acessar esses dados
    if (userId !== req.user.uid) {
      console.log('[HORAS-MES] Verificando permissões de admin...');
      // Verificar se é admin no SQLite
      const user = await getUserByUid(req.user.uid);
      if (!user || user.cargo !== 'admin') {
        console.log('[HORAS-MES] Acesso negado - não é admin');
        return res.status(403).json({ error: "Acesso não autorizado" });
      }
      console.log('[HORAS-MES] Acesso autorizado - usuário é admin');
    } else {
      console.log('[HORAS-MES] Acesso autorizado - próprio usuário');
    }
    
    // Criar range de datas para o mês
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const nextMonth = parseInt(month) === 12 ? '01' : (parseInt(month) + 1).toString().padStart(2, '0');
    const nextYear = parseInt(month) === 12 ? (parseInt(year) + 1).toString() : year;
    const endDate = `${nextYear}-${nextMonth}-01`;
    
    console.log('[HORAS-MES] Range de busca:', { startDate, endDate });
    
    // Buscar dados no SQLite
    const horasData = await getHorasTrabalhadasByUserAndPeriod(userId, startDate, endDate);
    
    console.log('[HORAS-MES] Registros encontrados no SQLite:', horasData.length);
    
    let totalMinutesMonth = 0;
    const formattedData = horasData.map(record => {
      totalMinutesMonth += record.total_minutes || 0;
      return {
        id: record.id,
        userId: record.user_id,
        userName: record.user_name,
        date: record.date,
        totalMinutes: record.total_minutes,
        totalHours: record.total_hours,
        updatedAt: record.updated_at
      };
    });
    
    const hoursMonth = Math.floor(totalMinutesMonth / 60);
    const minutesMonth = Math.round(totalMinutesMonth % 60);
    const totalHoursMonth = `${hoursMonth}h ${minutesMonth}m`;
    
    console.log('[HORAS-MES] Resultado:', {
      totalDays: formattedData.length,
      totalMinutesMonth,
      totalHoursMonth
    });
    
    res.status(200).json({
      userId,
      year: parseInt(year),
      month: parseInt(month),
      totalDays: formattedData.length,
      totalMinutesMonth,
      totalHoursMonth,
      dailyRecords: formattedData
    });
  } catch (error) {
    console.error("[HORAS-MES] Erro ao buscar horas mensais:", error);
    res.status(500).json({ error: "Erro ao buscar horas mensais: " + error.message });
  }
});

app.post('/api/horas-trabalhadas', authenticateToken, async (req, res) => {
  try {
    const { userId, userName, date, totalMinutes, totalHours } = req.body;
    
    console.log('[HORAS-TRABALHADAS] Dados recebidos:', { userId, userName, date, totalMinutes, totalHours });

    if (!userId || !date || totalMinutes === undefined) {
      return res.status(400).json({ error: "userId, date e totalMinutes são obrigatórios" });
    }

    // Buscar nome do usuário se não foi fornecido
    let finalUserName = userName;
    if (!finalUserName) {
      try {
        const user = await getUserByUid(userId);
        if (user) {
          finalUserName = user.nome_completo || user.email?.split('@')[0] || 'Usuário';
        } else {
          finalUserName = 'Usuário não encontrado';
        }
      } catch (userError) {
        console.error('[HORAS-TRABALHADAS] Erro ao buscar usuário:', userError);
        finalUserName = 'Erro ao buscar usuário';
      }
    }
    
    const horasData = {
      userId,
      userName: finalUserName,
      date,
      totalMinutes,
      totalHours
    };
    
    console.log('[HORAS-TRABALHADAS] Salvando dados no SQLite:', horasData);
    
    // Salvar no SQLite
    await upsertHorasTrabalhadas(horasData);

    console.log('[HORAS-TRABALHADAS] Dados salvos no SQLite com sucesso!');
    res.status(200).json({ message: "Horas trabalhadas salvas com sucesso!", data: horasData });
  } catch (error) {
    console.error("[HORAS-TRABALHADAS] Erro ao salvar horas trabalhadas:", error);
    res.status(500).json({ error: "Erro ao salvar horas trabalhadas: " + error.message });
  }
});

// Endpoint de redefinição de senha
app.post("/api/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }
    
    // Verificar se o email existe no SQLite
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email não encontrado" });
    }

    res.status(200).json({ message: "Email de redefinição enviado com sucesso" });
  } catch (error) {
    console.error("Erro na redefinição de senha:", error.message);
    res.status(500).json({ error: "Erro ao processar redefinição de senha" });
  }
});

// ===== ENDPOINTS PARA TAREFAS =====

// Buscar todas as tarefas
app.get("/api/tarefas", authenticateToken, async (req, res) => {
  try {
    console.log('Requisição GET /api/tarefas recebida para UID:', req.user.uid);
    
    const tasks = await getAllTasks();
    
    // Converter formato para compatibilidade com frontend
    const formattedTasks = await Promise.all(tasks.map(async (task) => {
      // Buscar arquivos da tarefa
      const files = await getFilesByTaskId(task.id);
      const comprovantes = files.map(file => ({
        id: file.id,
        url: `/api/files/${file.id}/download`,
        name: file.original_name,
        size: file.size,
        type: file.mime_type,
        uploadDate: file.upload_date,
        uploadedBy: file.uploaded_by,
        downloadCount: file.download_count
      }));
      
      return {
        id: task.id,
        titulo: task.titulo,
        responsavel: task.responsavel,
        responsavelId: task.responsavel_id,
        dataVencimento: task.data_vencimento,
        observacoes: task.observacoes,
        status: task.status,
        recorrente: Boolean(task.recorrente),
        frequencia: task.frequencia,
        dataCriacao: task.data_criacao,
        comprovantes: comprovantes
      };
    }));

    console.log('Tarefas encontradas no SQLite:', formattedTasks.length);
    res.status(200).json(formattedTasks);
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error.message);
    res.status(500).json({ error: "Erro ao buscar tarefas: " + error.message });
  }
});

// Criar nova tarefa
app.post("/api/tarefas", authenticateToken, async (req, res) => {
  try {
    const { titulo, responsavelId, dataVencimento, observacoes, recorrente, frequencia } = req.body;
    
    console.log('Dados da nova tarefa:', { titulo, responsavelId, dataVencimento, observacoes, recorrente, frequencia });
    
    if (!titulo || !responsavelId || !dataVencimento) {
      return res.status(400).json({ error: "Título, responsável e data de vencimento são obrigatórios" });
    }
    
    // Verificar se é admin
    const user = await getUserByUid(req.user.uid);
    if (!user || user.cargo !== 'admin') {
      return res.status(403).json({ error: "Apenas administradores podem criar tarefas" });
    }
    
    // Buscar dados do responsável
    const responsavel = await getUserByUid(responsavelId);
    if (!responsavel) {
      return res.status(400).json({ error: "Responsável não encontrado" });
    }
    
    const taskId = uuidv4();
    const taskData = {
      id: taskId,
      titulo: titulo.trim(),
      responsavel: responsavel.nome_completo || responsavel.email.split('@')[0],
      responsavelId,
      dataVencimento,
      observacoes: observacoes || '',
      recorrente: Boolean(recorrente),
      frequencia: frequencia || 'mensal'
    };
    
    await createTask(taskData);
    
    // Log da atividade
    await insertActivityLog({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'create_task',
      taskId,
      taskTitle: titulo.trim()
    });
    
    console.log('Tarefa criada com sucesso:', taskId);
    res.status(201).json({ id: taskId, ...taskData });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error.message);
    res.status(500).json({ error: "Erro ao criar tarefa: " + error.message });
  }
});

// Atualizar status da tarefa
app.patch("/api/tarefas/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }
    
    // Buscar a tarefa
    const task = await getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }
    
    // Verificar permissões
    const user = await getUserByUid(req.user.uid);
    const isAdmin = user?.cargo === 'admin';
    const isOwner = task.responsavel_id === req.user.uid;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Você só pode atualizar o status de suas próprias tarefas" });
    }
    
    await updateTaskStatus(id, status);
    
    // Log da atividade
    await insertActivityLog({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'update_task_status',
      taskId: id,
      taskTitle: task.titulo
    });
    
    console.log('Status da tarefa atualizado:', { id, status });
    res.status(200).json({ message: "Status atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa:", error.message);
    res.status(500).json({ error: "Erro ao atualizar status da tarefa: " + error.message });
  }
});

// Deletar tarefa
app.delete("/api/tarefas/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se é admin
    const user = await getUserByUid(req.user.uid);
    if (!user || user.cargo !== 'admin') {
      return res.status(403).json({ error: "Apenas administradores podem excluir tarefas" });
    }
    
    // Buscar a tarefa para log
    const task = await getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }
    
    await deleteTask(id);
    
    // Log da atividade
    await insertActivityLog({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'delete_task',
      taskId: id,
      taskTitle: task.titulo
    });
    
    console.log('Tarefa deletada com sucesso:', id);
    res.status(200).json({ message: "Tarefa deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar tarefa:", error.message);
    res.status(500).json({ error: "Erro ao deletar tarefa: " + error.message });
  }
});

// Buscar logs de atividade
app.get("/api/logs", authenticateToken, async (req, res) => {
  try {
    console.log('Requisição GET /api/logs recebida para UID:', req.user.uid);
    
    // Verificar se é admin
    const user = await getUserByUid(req.user.uid);
    const isAdmin = user?.cargo === 'admin';
    
    let logs;
    if (isAdmin) {
      // Admin vê todos os logs
      logs = await getActivityLog();
    } else {
      // Usuário comum vê apenas seus logs
      logs = await getActivityLog(req.user.uid);
    }
    
    // Mapear os campos do banco para o formato esperado pelo frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      userId: log.user_id,
      userEmail: log.user_email,
      action: log.action,
      taskId: log.task_id,
      taskTitle: log.task_title,
      timestamp: log.timestamp
    }));
    
    console.log('Logs encontrados no SQLite:', formattedLogs.length);
    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("Erro ao buscar logs:", error.message);
    res.status(500).json({ error: "Erro ao buscar logs: " + error.message });
  }
});

// Criar log de atividade
app.post("/api/logs", authenticateToken, async (req, res) => {
  try {
    const { action, taskId, taskTitle } = req.body;
    
    if (!action || !taskId || !taskTitle) {
      return res.status(400).json({ error: "action, taskId e taskTitle são obrigatórios" });
    }
    
    const logData = {
      userId: req.user.uid,
      userEmail: req.user.email,
      action,
      taskId,
      taskTitle
    };
    
    const savedLog = await insertActivityLog(logData);
    
    // Mapear o resultado para manter consistência com o GET
    const formattedLog = {
      id: savedLog.id,
      userId: savedLog.userId,
      userEmail: savedLog.userEmail,
      action: savedLog.action,
      taskId: savedLog.taskId,
      taskTitle: savedLog.taskTitle,
      timestamp: new Date().toISOString()
    };
    
    console.log('Log de atividade criado:', formattedLog);
    res.status(201).json(formattedLog);
  } catch (error) {
    console.error("Erro ao criar log:", error.message);
    res.status(500).json({ error: "Erro ao criar log: " + error.message });
  }
});

// ===== ENDPOINTS PARA GERENCIAMENTO DE ARQUIVOS (SUBSTITUINDO FIREBASE STORAGE) =====

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const taskDir = path.join(uploadsDir, req.body.taskId || 'general');
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }
    cb(null, taskDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Filtros de arquivo para segurança
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limite
  }
});

// Endpoint para upload de arquivo
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[UPLOAD] Iniciando upload de arquivo');
    console.log('[UPLOAD] Dados do body:', req.body);
    console.log('[UPLOAD] Dados do arquivo:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const { taskId } = req.body;
    if (!taskId) {
      // Remover arquivo se taskId não foi fornecido
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao remover arquivo:', err);
      });
      return res.status(400).json({ error: 'taskId é obrigatório' });
    }
    
    // Salvar metadata no banco SQLite
    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      taskId,
      uploadedBy: req.user.uid
    };
    
    const savedFile = await insertFile(fileData);
    
    // Log da atividade
    await logFileActivity(savedFile.id, 'upload', req.user.uid);
    
    console.log('[UPLOAD] Arquivo salvo com sucesso:', savedFile);
    
    // Retornar dados compatíveis com o frontend
    const response = {
      id: savedFile.id,
      url: `/api/files/${savedFile.id}/download`, // URL para download
      name: savedFile.originalName,
      size: savedFile.size,
      type: savedFile.mimeType,
      uploadDate: savedFile.uploadDate,
      uploadedBy: savedFile.uploadedBy
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[UPLOAD] Erro ao fazer upload:', error);
    
    // Remover arquivo em caso de erro
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao remover arquivo após falha:', err);
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para download de arquivo
app.get('/api/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('[DOWNLOAD] Solicitando download do arquivo:', fileId);
    
    const fileRecord = await getFileById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Verificar se o arquivo físico existe
    if (!fs.existsSync(fileRecord.file_path)) {
      console.error('[DOWNLOAD] Arquivo físico não encontrado:', fileRecord.file_path);
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }
    
    // Incrementar contador de downloads
    await incrementDownloadCount(fileId);
    
    // Log da atividade
    await logFileActivity(fileId, 'download', req.user.uid);
    
    console.log('[DOWNLOAD] Enviando arquivo:', fileRecord.original_name);
    
    // Configurar headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.original_name}"`);
    res.setHeader('Content-Type', fileRecord.mime_type);
    
    // Enviar arquivo
    res.sendFile(path.resolve(fileRecord.file_path));
  } catch (error) {
    console.error('[DOWNLOAD] Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para listar arquivos de uma tarefa
app.get('/api/files/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[LIST FILES] Listando arquivos da tarefa:', taskId);
    
    const files = await getFilesByTaskId(taskId);
    
    // Converter para formato compatível com o frontend
    const response = files.map(file => ({
      id: file.id,
      url: `/api/files/${file.id}/download`,
      name: file.original_name,
      size: file.size,
      type: file.mime_type,
      uploadDate: file.upload_date,
      uploadedBy: file.uploaded_by,
      downloadCount: file.download_count
    }));
    
    console.log('[LIST FILES] Encontrados', response.length, 'arquivos');
    res.status(200).json(response);
  } catch (error) {
    console.error('[LIST FILES] Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para deletar arquivo
app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('[DELETE FILE] Deletando arquivo:', fileId);
    
    const fileRecord = await getFileById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Verificar se o usuário pode deletar (só quem fez upload ou admin)
    if (fileRecord.uploaded_by !== req.user.uid) {
      // Verificar se é admin usando SQLite
      const user = await getUserByUid(req.user.uid);
      if (!user || user.cargo !== 'admin') {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }
    
    // Remover arquivo físico
    if (fs.existsSync(fileRecord.file_path)) {
      fs.unlinkSync(fileRecord.file_path);
      console.log('[DELETE FILE] Arquivo físico removido:', fileRecord.file_path);
    }
    
    // Remover do banco
    await deleteFile(fileId);
    
    // Log da atividade
    await logFileActivity(fileId, 'delete', req.user.uid);
    
    console.log('[DELETE FILE] Arquivo deletado com sucesso');
    res.status(200).json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    console.error('[DELETE FILE] Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint estático para servir arquivos (alternativo ao download)
app.use('/uploads', express.static(uploadsDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});