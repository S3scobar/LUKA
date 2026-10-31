// js/views/authView.js
import { authService } from "../services/authService.js";

export const authView = {
  render(containerId, onAuthSuccess) {
    const container = document.getElementById(containerId);
    let isLoginMode = true;

    const renderForm = () => {
      container.innerHTML = `
        <div class="auth-card">
          <div class="auth-header">
            <i class="fa-solid fa-wallet auth-icon"></i>
            <h2>${isLoginMode ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
            <p>${isLoginMode ? "Accede a tu gestor de gastos" : "Registra tus datos para empezar"}</p>
          </div>

          <form id="auth-form" class="auth-form">
            ${!isLoginMode ? `
              <div class="form-group">
                <label for="auth-name">Nombre Completo</label>
                <input type="text" id="auth-name" placeholder="Santiago Escobar" required />
              </div>
            ` : ""}

            <div class="form-group">
              <label for="auth-email">Correo Electrónico</label>
              <input type="email" id="auth-email" placeholder="usuario@correo.com" required />
            </div>

            <div class="form-group">
              <label for="auth-password">Contraseña</label>
              <input type="password" id="auth-password" placeholder="••••••••" minlength="6" required />
            </div>

            <div id="auth-error" class="alert-error" style="display: none;"></div>

            <button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block">
              ${isLoginMode ? "Ingresar" : "Registrarme"}
            </button>
          </form>

          <div class="auth-toggle">
            <span>${isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}</span>
            <button type="button" id="toggle-mode-btn" class="btn-link">
              ${isLoginMode ? "Crear una cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      `;

      // Event Listeners
      const form = document.getElementById("auth-form");
      const toggleBtn = document.getElementById("toggle-mode-btn");
      const errorDiv = document.getElementById("auth-error");
      const submitBtn = document.getElementById("auth-submit-btn");

      toggleBtn.addEventListener("click", () => {
        isLoginMode = !isLoginMode;
        renderForm();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorDiv.style.display = "none";
        submitBtn.disabled = true;
        submitBtn.textContent = "Procesando...";

        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;

        try {
          if (isLoginMode) {
            await authService.signIn(email, password);
          } else {
            const fullName = document.getElementById("auth-name").value.trim();
            await authService.signUp(email, password, fullName);
          }
          if (onAuthSuccess) onAuthSuccess();
        } catch (err) {
          errorDiv.textContent = err.message || "Ocurrió un error en la autenticación";
          errorDiv.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = isLoginMode ? "Ingresar" : "Registrarme";
        }
      });
    };

    renderForm();
  }
};