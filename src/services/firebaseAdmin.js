import admin from "firebase-admin";
import serviceAccount from "../../serviceAccountKey.json"; // Asegúrate de que este archivo exista y esté configurado correctamente.

// Inicializa el SDK de Firebase Admin si no está ya inicializado.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const assignRole = async (uid, role) => {
  try {
    // Asigna un rol personalizado al usuario.
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`Rol '${role}' asignado al usuario con UID: ${uid}`);
    return { success: true, message: `Rol '${role}' asignado correctamente.` };
  } catch (error) {
    console.error("Error al asignar rol:", error);
    return { success: false, message: "Error al asignar rol.", error };
  }
};
