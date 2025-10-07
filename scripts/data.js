export async function loadInstitutions() {
  const response = await fetch('./data/institutions.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${response.status}`);
  }
  const data = await response.json();
  return data;
}
