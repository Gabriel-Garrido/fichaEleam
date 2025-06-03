/**
 * Servicio de gestión de residentes.
 * Contiene funciones para obtener y agregar residentes.
 */

/**
 * Obtiene la lista de residentes.
 * @returns {Promise<Array>} - Lista de residentes.
 */
export const getResidents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/residents`);
    if (!response.ok) throw new Error("Failed to fetch residents");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Agrega un nuevo residente.
 * @param {Object} data - Datos del residente.
 * @returns {Promise<Object>} - Respuesta del servidor.
 */
export const addResident = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/residents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to add resident");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
