export const API_BASE_URL = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/";

export function generateApiUrl(type, filters) {
  const endpointMap = {
    ecole: "fr-en-ips_ecoles_v2",
    college: "fr-en-ips-colleges-ap2023",
    lycee: "fr-en-ips_lycees"
  };
  const endpoint = endpointMap[type];
  let url = `${API_BASE_URL}${endpoint}/records?`;

  // Ajoutez ici la logique pour ajouter les filtres à l'URL
  Object.keys(filters).forEach(key => {
    if (filters[key]) {
      url += `&${key}=${encodeURIComponent(filters[key])}`;
    }
  });

  return url;
}