import app from "../../services/firebaseConfig";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const auth = getAuth(app);

/**
 * Servicio de autenticación.
 * Contiene funciones para iniciar sesión y registrarse.
 */

/**
 * Inicia sesión con las credenciales proporcionadas.
 * @param {Object} credentials - Credenciales del usuario.
 * @returns {Promise<Object>} - Respuesta del servidor.
 */
export const login = async (credentials) => {
  try {
    console.log("Iniciando proceso de login con:", credentials);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    console.log("Login exitoso:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Error en el login:", error);
    throw error;
  }
};

/**
 * Registra un nuevo usuario.
 * @param {Object} data - Datos del usuario.
 * @returns {Promise<Object>} - Respuesta del servidor.
 */
export const register = async (data) => {
  try {
    console.log("Iniciando proceso de registro con:", data);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    console.log("Registro exitoso:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Error en el registro:", error);
    throw error;
  }
};

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<void>} - Respuesta del servidor.
 */
export const logout = async () => {
  try {
    console.log("Cerrando sesión...");
    await auth.signOut();
    console.log("Sesión cerrada exitosamente.");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    throw error;
  }
};
