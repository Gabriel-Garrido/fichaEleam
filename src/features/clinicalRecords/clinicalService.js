// Service for clinical records

export const getClinicalRecords = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/clinical-records`);
    if (!response.ok) throw new Error("Failed to fetch clinical records");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addClinicalRecord = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/clinical-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to add clinical record");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
