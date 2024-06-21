<script>
  let schoolsDataset = { results: [] };
  let filteredResults = [];
  let academieFilter = '';
  let departementFilter = '';
  let rentreeScolaireFilter = '';

  async function fetchData() {
    const response = await fetch('https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records?limit=20');
    schoolsDataset = await response.json();
  }
   // Créez une réaction qui se déclenche chaque fois que schoolsDataset est mis à jour 
  $: results = schoolsDataset.results;
  $: filteredResults = results.filter(({ academie, code_du_departement, rentree_scolaire }) =>
    (academie.includes(academieFilter) || academieFilter === '') &&
    (code_du_departement.includes(departementFilter) || departementFilter === '') &&
    (rentree_scolaire.includes(rentreeScolaireFilter) || rentreeScolaireFilter === '')
  );
  fetchData();
</script>

<h1>RankMySchool</h1>
<div>
  <input type="text" placeholder="Académie" bind:value={academieFilter}>
  <input type="text" placeholder="Code du département" bind:value={departementFilter}>
  <input type="text" placeholder="Rentrée scolaire" bind:value={rentreeScolaireFilter}>
</div>
<ul>
  {#each filteredResults as item, i}
    <li>
      <p>{item.rentree_scolaire}</p>
      <p>{item.academie} : {item.departement}</p>

      <p>{item.nom_de_l_etablissment === "A COMPLETER" ? item.nom_de_la_commune : item.nom_de_l_etablissment} : {item.ips}</p>
    </li>
  {/each}
</ul>

<style>
  li {
    border: 1px solid #ccc; /* Ajoute une bordure légère */
    margin-bottom: 10px; /* Espacement de 10px entre chaque bloc */
    padding: 5px; /* Ajoute un peu d'espace à l'intérieur de chaque bloc */
    list-style-type: none; /* Enlève les puces */
    border-radius: 5px;
  }
</style>
