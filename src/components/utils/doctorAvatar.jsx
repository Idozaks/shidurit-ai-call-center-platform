/**
 * Generates a DiceBear avatar URL for a doctor based on their name.
 * Uses the "initials" style for a clean, professional look.
 * Falls back to image_url if the doctor has a custom photo.
 */
export function getDoctorAvatarUrl(doctor) {
  if (doctor?.image_url) return doctor.image_url;
  const seed = encodeURIComponent(doctor?.name || 'Doctor');
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=6366f1,8b5cf6,0ea5e9,14b8a6,f59e0b,ef4444&backgroundType=gradientLinear&fontWeight=600`;
}