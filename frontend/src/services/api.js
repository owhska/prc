import axiosInstance from '../utils/axiosConfig';

// ===== SERVIÇOS DE API PARA SQLITE =====

// Usuários
export const userService = {
  // Buscar todos os usuários
  getAll: async () => {
    const response = await axiosInstance.get('/api/usuarios');
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await axiosInstance.post('/api/login', { email, password });
    return response.data;
  },

  // Cadastro
  register: async (userData) => {
    const response = await axiosInstance.post('/api/cadastro', userData);
    return response.data;
  },

  // Reset password
  resetPassword: async (email) => {
    const response = await axiosInstance.post('/api/reset-password', { email });
    return response.data;
  },

  // Upsert user (criar ou atualizar)
  upsert: async (userData) => {
    const response = await axiosInstance.post('/api/usuarios/upsert', userData);
    return response.data;
  },

  // Atualizar último login
  updateLastLogin: async (userId) => {
    const response = await axiosInstance.patch(`/api/usuarios/${userId}/last-login`);
    return response.data;
  }
};

// Tarefas
export const taskService = {
  // Buscar todas as tarefas
  getAll: async () => {
    const response = await axiosInstance.get('/api/tarefas');
    return response.data;
  },

  // Criar nova tarefa
  create: async (taskData) => {
    const response = await axiosInstance.post('/api/tarefas', taskData);
    return response.data;
  },

  // Atualizar status da tarefa
  updateStatus: async (taskId, status) => {
    const response = await axiosInstance.patch(`/api/tarefas/${taskId}/status`, { status });
    return response.data;
  },

  // Deletar tarefa
  delete: async (taskId) => {
    const response = await axiosInstance.delete(`/api/tarefas/${taskId}`);
    return response.data;
  },

  // Buscar arquivos da tarefa
  getFiles: async (taskId) => {
    const response = await axiosInstance.get(`/api/files/task/${taskId}`);
    return response.data;
  },

  // Upload de arquivo
  uploadFile: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);
    
    const response = await axiosInstance.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Deletar arquivo
  deleteFile: async (fileId) => {
    const response = await axiosInstance.delete(`/api/files/${fileId}`);
    return response.data;
  }
};

// Pontos
export const pontoService = {
  // Buscar pontos do usuário
  getByUser: async () => {
    const response = await axiosInstance.get('/api/ponto');
    return response.data;
  },

  // Buscar todos os pontos (admin)
  getAll: async () => {
    const response = await axiosInstance.get('/api/ponto/todos');
    return response.data;
  },

  // Registrar ponto
  register: async (pontoData) => {
    const response = await axiosInstance.post('/api/ponto', pontoData);
    return response.data;
  },

  // Deletar ponto
  delete: async (pontoId) => {
    const response = await axiosInstance.delete(`/api/ponto/${pontoId}`);
    return response.data;
  }
};

// Horas trabalhadas
export const horasService = {
  // Buscar horas de um mês específico
  getByMonth: async (userId, year, month) => {
    const response = await axiosInstance.get(`/api/horas-trabalhadas/${userId}/${year}/${month}`);
    return response.data;
  },

  // Salvar horas trabalhadas
  save: async (horasData) => {
    const response = await axiosInstance.post('/api/horas-trabalhadas', horasData);
    return response.data;
  }
};

// Logs
export const logService = {
  // Buscar logs
  getAll: async () => {
    const response = await axiosInstance.get('/api/logs');
    return response.data;
  },

  // Criar novo log
  create: async (logData) => {
    const response = await axiosInstance.post('/api/logs', logData);
    return response.data;
  }
};

export default {
  userService,
  taskService,
  pontoService,
  horasService,
  logService
};
