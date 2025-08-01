const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pcp.db');

// Conectar ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco SQLite:', err.message);
    } else {
        console.log('Conectado ao banco SQLite com sucesso!');
        initializeDatabase();
    }
});

// Função para inicializar as tabelas
function initializeDatabase() {
    console.log('🔧 Inicializando banco de dados SQLite...');
    
    // 1. Tabela de usuários
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            uid VARCHAR(255) PRIMARY KEY,
            nome_completo VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            cargo VARCHAR(50) DEFAULT 'usuario',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela usuarios:', err.message);
        } else {
            console.log('✅ Tabela usuarios criada/verificada com sucesso!');
        }
    });

    // 2. Tabela de tarefas
    db.run(`
        CREATE TABLE IF NOT EXISTS tarefas (
            id VARCHAR(255) PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            responsavel VARCHAR(255) NOT NULL,
            responsavel_id VARCHAR(255) NOT NULL,
            data_vencimento DATE,
            observacoes TEXT,
            status VARCHAR(50) DEFAULT 'pendente',
            recorrente BOOLEAN DEFAULT FALSE,
            frequencia VARCHAR(50) DEFAULT 'mensal',
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (responsavel_id) REFERENCES usuarios (uid)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela tarefas:', err.message);
        } else {
            console.log('✅ Tabela tarefas criada/verificada com sucesso!');
        }
    });


    // 4. Tabela de horas trabalhadas
    db.run(`
        CREATE TABLE IF NOT EXISTS horas_trabalhadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            total_minutes INTEGER NOT NULL,
            total_hours VARCHAR(50) NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES usuarios (uid)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela horas_trabalhadas:', err.message);
        } else {
            console.log('✅ Tabela horas_trabalhadas criada/verificada com sucesso!');
        }
    });

    // 5. Tabela para metadados de arquivos
    db.run(`
        CREATE TABLE IF NOT EXISTS arquivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            size INTEGER NOT NULL,
            task_id VARCHAR(255) NOT NULL,
            uploaded_by VARCHAR(255) NOT NULL,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            download_count INTEGER DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES tarefas (id),
            FOREIGN KEY (uploaded_by) REFERENCES usuarios (uid)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela arquivos:', err.message);
        } else {
            console.log('✅ Tabela arquivos criada/verificada com sucesso!');
        }
    });

    // 6. Tabela de logs de atividade
    db.run(`
        CREATE TABLE IF NOT EXISTS atividade_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            task_id VARCHAR(255),
            task_title VARCHAR(255),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES usuarios (uid),
            FOREIGN KEY (task_id) REFERENCES tarefas (id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela atividade_logs:', err.message);
        } else {
            console.log('✅ Tabela atividade_logs criada/verificada com sucesso!');
        }
    });

    // 7. Tabela para logs de arquivos (mantida para compatibilidade)
    db.run(`
        CREATE TABLE IF NOT EXISTS arquivo_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            arquivo_id INTEGER NOT NULL,
            action VARCHAR(50) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (arquivo_id) REFERENCES arquivos (id),
            FOREIGN KEY (user_id) REFERENCES usuarios (uid)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela arquivo_logs:', err.message);
        } else {
            console.log('✅ Tabela arquivo_logs criada/verificada com sucesso!');
        }
    });

    // Migração: adicionar campo password se não existir
    db.run(`ALTER TABLE usuarios ADD COLUMN password VARCHAR(255)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Erro na migração do campo password:', err.message);
        } else if (!err) {
            console.log('✅ Campo password adicionado à tabela usuarios!');
        }
    });
    
    
    console.log('🎉 Inicialização do banco de dados concluída!');
    
    // Criar usuário de teste admin se não existir
    createTestUser();
}

// Função para criar usuário de teste
function createTestUser() {
    const testUser = {
        uid: 'test-admin-123',
        nomeCompleto: 'Admin Teste',
        email: 'admin@test.com',
        password: 'senha123',
        cargo: 'admin'
    };
    
    // Verificar se o usuário já existe
    db.get('SELECT uid FROM usuarios WHERE email = ?', [testUser.email], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário de teste:', err.message);
            return;
        }
        
        if (!row) {
            // Usuário não existe, criar
            db.run(`
                INSERT INTO usuarios (uid, nome_completo, email, password, cargo)
                VALUES (?, ?, ?, ?, ?)
            `, [testUser.uid, testUser.nomeCompleto, testUser.email, testUser.password, testUser.cargo], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar usuário de teste:', err.message);
                } else {
                    console.log('✅ Usuário de teste criado:', testUser.email, '/ senha:', testUser.password);
                }
            });
        } else {
            console.log('👤 Usuário de teste já existe:', testUser.email);
        }
    });
}

// Função para inserir um novo arquivo
function insertFile(fileData) {
    return new Promise((resolve, reject) => {
        const { filename, originalName, filePath, mimeType, size, taskId, uploadedBy } = fileData;
        
        const sql = `
            INSERT INTO arquivos (filename, original_name, file_path, mime_type, size, task_id, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [filename, originalName, filePath, mimeType, size, taskId, uploadedBy], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    filename,
                    originalName,
                    filePath,
                    mimeType,
                    size,
                    taskId,
                    uploadedBy,
                    uploadDate: new Date().toISOString()
                });
            }
        });
    });
}

// Função para buscar arquivos por task_id
function getFilesByTaskId(taskId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM arquivos 
            WHERE task_id = ? 
            ORDER BY upload_date DESC
        `;
        
        db.all(sql, [taskId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Função para buscar um arquivo por ID
function getFileById(fileId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM arquivos WHERE id = ?`;
        
        db.get(sql, [fileId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Função para deletar um arquivo
function deleteFile(fileId) {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM arquivos WHERE id = ?`;
        
        db.run(sql, [fileId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deletedRows: this.changes });
            }
        });
    });
}

// Função para incrementar contador de downloads
function incrementDownloadCount(fileId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE arquivos SET download_count = download_count + 1 WHERE id = ?`;
        
        db.run(sql, [fileId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ updatedRows: this.changes });
            }
        });
    });
}

// Função para log de atividades de arquivos
function logFileActivity(arquivoId, action, userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO arquivo_logs (arquivo_id, action, user_id)
            VALUES (?, ?, ?)
        `;
        
        db.run(sql, [arquivoId, action, userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

// ===== FUNÇÕES PARA USUÁRIOS =====

// Inserir ou atualizar usuário
function upsertUser(userData) {
    return new Promise((resolve, reject) => {
        const { uid, nomeCompleto, email, password, cargo = 'usuario' } = userData;
        
        const sql = `
            INSERT OR REPLACE INTO usuarios (uid, nome_completo, email, password, cargo, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [uid, nomeCompleto, email, password, cargo], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ uid, nomeCompleto, email, cargo });
            }
        });
    });
}

// Buscar usuário por UID
function getUserByUid(uid) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM usuarios WHERE uid = ?`;
        
        db.get(sql, [uid], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Buscar usuário por email
function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM usuarios WHERE email = ?`;
        
        db.get(sql, [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Buscar todos os usuários
function getAllUsers() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM usuarios ORDER BY nome_completo`;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// ===== FUNÇÕES PARA TAREFAS =====

// Criar nova tarefa
function createTask(taskData) {
    return new Promise((resolve, reject) => {
        const { id, titulo, responsavel, responsavelId, dataVencimento, observacoes, recorrente, frequencia } = taskData;
        
        const sql = `
            INSERT INTO tarefas (id, titulo, responsavel, responsavel_id, data_vencimento, observacoes, recorrente, frequencia)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [id, titulo, responsavel, responsavelId, dataVencimento, observacoes, recorrente, frequencia], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, ...taskData });
            }
        });
    });
}

// Buscar tarefa por ID
function getTaskById(taskId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM tarefas WHERE id = ?`;
        
        db.get(sql, [taskId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Buscar todas as tarefas
function getAllTasks() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM tarefas ORDER BY data_criacao DESC`;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Buscar tarefas por usuário
function getTasksByUser(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM tarefas WHERE responsavel_id = ? ORDER BY data_criacao DESC`;
        
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Atualizar status da tarefa
function updateTaskStatus(taskId, status) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE tarefas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(sql, [status, taskId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ taskId, status, updatedRows: this.changes });
            }
        });
    });
}

// Deletar tarefa
function deleteTask(taskId) {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM tarefas WHERE id = ?`;
        
        db.run(sql, [taskId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deletedRows: this.changes });
            }
        });
    });
}


// ===== FUNÇÕES PARA HORAS TRABALHADAS =====

// Inserir/atualizar horas trabalhadas
function upsertHorasTrabalhadas(horasData) {
    return new Promise((resolve, reject) => {
        const { userId, userName, date, totalMinutes, totalHours } = horasData;
        
        const sql = `
            INSERT OR REPLACE INTO horas_trabalhadas (user_id, user_name, date, total_minutes, total_hours, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [userId, userName, date, totalMinutes, totalHours], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ userId, userName, date, totalMinutes, totalHours });
            }
        });
    });
}

// Buscar horas trabalhadas por usuário e período
function getHorasTrabalhadasByUserAndPeriod(userId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM horas_trabalhadas 
            WHERE user_id = ? AND date >= ? AND date < ? 
            ORDER BY date
        `;
        
        db.all(sql, [userId, startDate, endDate], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// ===== FUNÇÕES PARA LOGS DE ATIVIDADE =====

// Inserir log de atividade
function insertActivityLog(logData) {
    return new Promise((resolve, reject) => {
        const { userId, userEmail, action, taskId, taskTitle } = logData;
        
        const sql = `
            INSERT INTO atividade_logs (user_id, user_email, action, task_id, task_title)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [userId, userEmail, action, taskId, taskTitle], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    userId,
                    userEmail,
                    action,
                    taskId,
                    taskTitle
                });
            }
        });
    });
}

// Buscar logs de atividade
function getActivityLogs(userId = null, limit = 100) {
    return new Promise((resolve, reject) => {
        let sql, params;
        
        if (userId) {
            sql = `SELECT * FROM atividade_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`;
            params = [userId, limit];
        } else {
            sql = `SELECT * FROM atividade_logs ORDER BY timestamp DESC LIMIT ?`;
            params = [limit];
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    db,
    // Arquivos
    insertFile,
    getFilesByTaskId,
    getFileById,
    deleteFile,
    incrementDownloadCount,
    logFileActivity,
    uploadsDir,
    // Usuários
    upsertUser,
    getUserByUid,
    getUserByEmail,
    getAllUsers,
    // Tarefas
    createTask,
    getTaskById,
    getAllTasks,
    getTasksByUser,
    updateTaskStatus,
    deleteTask,
    // Horas trabalhadas
    upsertHorasTrabalhadas,
    getHorasTrabalhadasByUserAndPeriod,
    // Logs
    insertActivityLog,
    getActivityLog: getActivityLogs
};
