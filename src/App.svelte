<script>
  let schoolsDataset = { results: [] };

  async function fetchData() {
    const response = await fetch('https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records?limit=20');
    schoolsDataset = await response.json();
  }
   // Créez une réaction qui se déclenche chaque fois que schoolsDataset est mis à jour 
  $: results = schoolsDataset.results;
  fetchData();
</script>

<h1>RankMySchool</h1>
{console.log(results)}
<ul>
  {#each results as { ips }, i}
    <li>
        {i + 1}:  <p>{ips}</p>
    </li>
  {/each}
</ul>

<style>

</style>
