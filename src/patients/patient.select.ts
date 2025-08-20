// Keep one source of truth for what we expose outside
export const patientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  dateOfBirth: true,
  gender: true,
  emergencyContact: true, // JSON (e.g., {name, phone, relation})
  medicalHistory: true,
  allergies: true,
  dentalHistory: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true, // you can set this to false if you prefer not to expose it
} as const;
