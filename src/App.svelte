<script>
  let data = [];

  async function fetchData() {
    const response = await fetch('http://localhost:3000/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records');
    data = await response.json();
  }

  fetchData();
</script>

{#each data as item (item.id)}
  <p>{item.ips}</p>
{/each}

<style>

</style>
