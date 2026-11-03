// js/views/authView.js
import { authService } from "../services/authService.js";
import { resolveContainer } from "../utils.js";
import { slideToSubmit } from "../components/slideToSubmit.js";

export const authView = {
  render(target, onAuthSuccess) {
    const container = resolveContainer(target);
    let isLoginMode = true;
    let notice = "";

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
                <input type="text" id="auth-name" placeholder="Santiago Escobar" autocomplete="name" required />
              </div>
            ` : ""}

            <div class="form-group">
              <label for="auth-email">Correo Electrónico</label>
              <input type="email" id="auth-email" placeholder="usuario@correo.com" autocomplete="email" required />
            </div>

            <div class="form-group">
              <label for="auth-password">Contraseña</label>
              <input type="password" id="auth-password" placeholder="••••••••" minlength="6" autocomplete="${isLoginMode ? "current-password" : "new-password"}" required />
            </div>

            ${notice ? `<div class="alert-info">${notice}</div>` : ""}
            <div id="auth-error" class="alert-error" style="display: none;"></div>

            ${isLoginMode ? `
              <div id="auth-slider"></div>
              <button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true">Ingresar</button>
            ` : `
              <button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block">Registrarme</button>
            `}
          </form>

          <div class="auth-toggle">
            <span>${isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}</span>
            <button type="button" id="toggle-mode-btn" class="btn-link">
              ${isLoginMode ? "Crear una cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      `;

      const form = document.getElementById("auth-form");
      const toggleBtn = document.getElementById("toggle-mode-btn");
      const errorDiv = document.getElementById("auth-error");
      const submitBtn = document.getElementById("auth-submit-btn");

      // En el login se confirma deslizando; en el registro sigue el botón normal
      const slider = isLoginMode
        ? slideToSubmit.mount(document.getElementById("auth-slider"), {
            label: "Desliza para ingresar",
            onComplete: () => {
              if (!form.checkValidity()) {
                form.reportValidity();
                slider.reset();
                return;
              }
              form.requestSubmit();
            }
          })
        : null;

      const setBusy = () => {
        if (slider) slider.setBusy();
        else { submitBtn.disabled = true; submitBtn.textContent = "Procesando..."; }
      };
      const setIdle = () => {
        if (slider) slider.reset();
        else { submitBtn.disabled = false; submitBtn.textContent = "Registrarme"; }
      };

      toggleBtn.addEventListener("click", () => {
        isLoginMode = !isLoginMode;
        notice = "";
        renderForm();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorDiv.style.display = "none";
        setBusy();

        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;

        try {
          if (isLoginMode) {
            await authService.signIn(email, password);
          } else {
            const fullName = document.getElementById("auth-name").value.trim();
            const { session } = await authService.signUp(email, password, fullName);
            if (!session) {
              // Cuentas auto-confirmadas: la sesión no viene en el registro, pero el login funciona
              try {
                await authService.signIn(email, password);
              } catch {
                isLoginMode = true;
                notice = "Tu cuenta se creó. Si tu proyecto exige confirmar el correo, revisa tu bandeja y luego inicia sesión.";
                renderForm();
                return;
              }
            }
          }
          if (onAuthSuccess) onAuthSuccess();
        } catch (err) {
          errorDiv.textContent = err.message || "Ocurrió un error en la autenticación";
          errorDiv.style.display = "block";
          setIdle();
        }
      });
    };

    renderForm();
  }
};