import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/Auth.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const validatePasswords = () => {
    if (!newPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return false;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return false;
    }
    return true;
  };

  const resetPassword = async () => {
    if (!validatePasswords()) return;

    if (isLoading) return; // Prevenir múltiplos cliques

    try {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.post(`${API_BASE_URL}/api/reset-password/${token}`, {
        newPassword
      });

      setSuccessMessage("Senha redefinida com sucesso!");
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      console.error("Erro na redefinição de senha:", error);
      const errorMessage = error.response?.data?.error || "Erro ao redefinir a senha. Por favor, tente novamente.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="card-body">
          {error && <div className="auth-alert-danger" role="alert">{error}</div>}
          {successMessage && <div className="auth-alert-success" role="alert">{successMessage}</div>}

          <div className="auth-form-group">
            <label htmlFor="newPassword">Nova senha</label>
            <input
              type="password"
              className="auth-form-control"
              id="newPassword"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Confirme sua nova senha</label>
            <input
              type="password"
              className="auth-form-control"
              id="confirmPassword"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            className="auth-btn-primary"
            onClick={resetPassword}
            disabled={isLoading}
          >
            {isLoading ? ("Redefinindo...") : ("Redefinir senha")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

