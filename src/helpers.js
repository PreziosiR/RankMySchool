// Fonction d'assistance pour encoder les paramètres d'URL
export function encodeParam(key, value) {
  return `refine=${encodeURIComponent(key)}:${encodeURIComponent(value)}`;
}

export function getColorForIps(ips) {
  if (ips <= 70) return "#8B0000";
  else if (ips <= 80) return "#FF0000";
  else if (ips <= 90) return "#FF4500";
  else if (ips <= 100) return "#FFA500";
  else if (ips <= 110) return "#9ACD32";
  else if (ips <= 120) return "#6EBF00";
  else return "#5E9C00"; // Pour 121 et plus
}