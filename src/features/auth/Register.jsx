import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useLoading, useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";
import { authErrorMessage, register, validateInvitationToken } from "./authService";
import { validateEmail } from "../../utils/validators";
import { validatePassword } from "../../utils/passwordValidation";

// El registro está restringido a usuarios con invitación válida.
// Los nuevos administradores ingresan a la plataforma solo a través del
// flujo de demo solicitado desde la landing page y aprobado por superadmin.
// El trigger handle_new_user valida el invite_token en el servidor.

function Register() {
  const [params] = useSearchParams();
  const inviteToken  = params.get("invite") || "";
  const invitedEmail = params.get("email")  || "";

  const navigate = useNavigate();
  const { loading, setLoading } = useLoading();
  const { authLoading } = useAuth();

  const [userData, setUserData] = useState({
    nombre: "",
    email: invitedEmail,
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error,  setError]  = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [validatingInvite, setValidatingInvite] = useState(Boolean(inviteToken));
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (invitedEmail) setUserData((prev) => ({ ...prev, email: invitedEmail }));
  }, [invitedEmail]);

  useEffect(() => {
    if (!inviteToken) {
      setValidatingInvite(false);
      return;
    }

    let cancelled = false;
    setValidatingInvite(true);
    setInviteError(null);

    validateInvitationToken({ inviteToken, email: invitedEmail })
      .then((info) => {
        if (cancelled) return;
        setInviteInfo(info);
        if (info?.email) {
          setUserData((prev) => ({ ...prev, email: info.email }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setInviteInfo(null);
        setInviteError(authErrorMessage(err, err.message || "La invitación no es válida o expiró."));
      })
      .finally(() => {
        if (!cancelled) setValidatingInvite(false);
      });

    return () => { cancelled = true; };
  }, [inviteToken, invitedEmail]);

  // Sin token de invitación → mostrar pantalla explicativa
  // (solo cuando auth terminó de cargar; durante authLoading el spinner de abajo lo maneja)
  if (!authLoading && !inviteToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 text-center">
          <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
            FichaEleam
          </button>
          <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Acceso por invitación</h2>
          <p className="text-sm text-slate-500">
            El registro directo no está disponible. Si fuiste invitado por un ELEAM, usa el link que recibiste por correo.
          </p>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full border border-slate-300 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && inviteError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 text-center">
          <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
            FichaEleam
          </button>
          <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invitación no disponible</h2>
          <p className="text-sm text-slate-500">{inviteError}</p>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full border border-slate-300 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };


  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (!userData.nombre.trim()) {
      setError("Ingresa tu nombre completo.");
      return;
    }
    if (!validateEmail(userData.email)) {
      setError("El correo electrónico no es válido.");
      return;
    }
    const passwordError = validatePassword(userData.password, userData.confirmPassword);
    if (passwordError) { setError(passwordError); return; }

    setLoading(true);
    try {
      await validateInvitationToken({ inviteToken, email: userData.email });
      const result = await register({
        nombre: userData.nombre,
        email: userData.email,
        password: userData.password,
        inviteToken,
      });
      if (!result?.session) setRegistered(true);
    } catch (err) {
      setError(authErrorMessage(err, err.message || "No se pudo completar el registro. Por favor, inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || validatingInvite) {
    return <Loading message={validatingInvite ? "Validando invitación..." : "Procesando..."} />;
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 text-center">
          <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
            FichaEleam
          </button>
          <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cuenta activada</h2>
          <p className="text-sm text-slate-500">
            Ya puedes iniciar sesión con <span className="font-medium text-slate-700">{userData.email}</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <button type="button"
 onClick={() => navigate("/")} className="text-2xl font-black text-teal-700 tracking-tight">
          FichaEleam
        </button>
        <p className="text-sm text-slate-500 mt-1">Plataforma para ELEAM</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-1">Activando tu cuenta</p>
          <p className="text-sm text-emerald-700">
            Fuiste invitado a {inviteInfo?.eleam_nombre || "un ELEAM"} como{" "}
            <span className="font-semibold">{inviteInfo?.rol === "familiar" ? "familiar" : "funcionario"}</span>.
            {inviteInfo?.residente_nombre && (
              <> Acceso vinculado a <span className="font-semibold">{inviteInfo.residente_nombre}</span>.</>
            )}
          </p>
          {inviteInfo?.email && (
            <p className="text-xs text-emerald-700 mt-2">
              Usa el correo <span className="font-semibold">{inviteInfo.email}</span>.
            </p>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-5">Crea tu contraseña</h1>

        <form className="space-y-4" onSubmit={handleRegister} noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
            <Input
              type="text"
              name="nombre"
              placeholder="Tu nombre completo"
              value={userData.nombre}
              onChange={handleChange}
              autoComplete="name"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
            <Input
              type="email"
              name="email"
              placeholder="tu@email.cl"
              value={userData.email}
              onChange={handleChange}
              readOnly={Boolean(inviteInfo?.email)}
              autoComplete="email"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 read-only:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                value={userData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar contraseña</label>
            <Input
              type={showPw ? "text" : "password"}
              name="confirmPassword"
              placeholder="Repite la contraseña"
              value={userData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors"
          >
            Activar mi cuenta
          </Button>
        </form>

        <p className="text-sm text-center text-slate-400 mt-5">
          ¿Ya tienes cuenta?{" "}
          <button type="button"
 onClick={() => navigate("/login")} className="text-teal-700 hover:underline">
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;
