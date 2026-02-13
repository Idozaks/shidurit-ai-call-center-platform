/**
 * Generates a DiceBear avatar URL for a doctor based on their name.
 * Uses the "initials" style for a clean, professional look.
 * Falls back to image_url if the doctor has a custom photo.
 */
export function getDoctorAvatarUrl(doctor) {
  if (doctor?.image_url) return doctor.image_url;
  const seed = encodeURIComponent(doctor?.name || 'Doctor');
  return `https://api.dicebear.com/9.x/toon-head/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear&radius=50`;
}