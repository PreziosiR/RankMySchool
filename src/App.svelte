<script>
  import {
    academies,
    rentree_scolaire,
    secteurs,
    encodeParam,
    departements,
  } from "./utils.js";
  let schoolsDataset = { results: [] };
  let filteredResults = [];
  let rentreeScolaireFilter = "";
  let academieFilter = "";
  let codeDuDepartementFilter = "";
  let departementFilter = "";
  let uaiFilter = "";
  let codeInseeDeLaCommuneFilter = "";
  let nomDeLaCommuneFilter = "";
  let secteurFilter = "";

  async function fetchData() {
    let baseUrl =
      "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records";
    let selectFields = [];
    let filters = [];

    // Ajouter les filtres à l'URL
    if (rentreeScolaireFilter)
      filters.push(encodeParam("rentree_scolaire", rentreeScolaireFilter));
    if (academieFilter) filters.push(encodeParam("academie", academieFilter));
    if (codeDuDepartementFilter)
      filters.push(encodeParam("code_du_departement", codeDuDepartementFilter));
    if (departementFilter)
      filters.push(encodeParam("departement", departementFilter));
    if (uaiFilter) filters.push(encodeParam("uai", uaiFilter));
    if (codeInseeDeLaCommuneFilter)
      filters.push(
        encodeParam("code_insee_de_la_commune", codeInseeDeLaCommuneFilter)
      );
    if (nomDeLaCommuneFilter)
      filters.push(encodeParam("nom_de_la_commune", nomDeLaCommuneFilter));
    if (secteurFilter) filters.push(encodeParam("secteur", secteurFilter));

    let url = `${baseUrl}?limit=20`;
    if (selectFields.length > 0) {
      url += `&select=${encodeURIComponent(selectFields.join(","))}`;
    }
    if (filters.length > 0) url += "&" + filters.join("&");

    // Construire l'URL avec les champs sélectionnés et les filtres
    const response = await fetch(url);
    schoolsDataset = await response.json();
    filteredResults = schoolsDataset.results;
  }
</script>

<h1>RankMySchool</h1>
<div>
  <select bind:value={rentreeScolaireFilter}>
    <option value="">Année scolaire</option>
    {#each rentree_scolaire as year}
      <option value={year}>{year}</option>
    {/each}
  </select>
  <select bind:value={academieFilter}>
    <option value="">Académie</option>
    {#each academies as academie}
      <option value={academie}>{academie}</option>
    {/each}
  </select>
  <input
    type="text"
    placeholder="Code du département"
    bind:value={codeDuDepartementFilter}
  />
  <select bind:value={departementFilter}>
    <option value="">Département</option>
    {#each departements as departement}
      <option value={departement}>{departement}</option>
    {/each}
  </select>
    <input type="text" placeholder="UAI" bind:value={uaiFilter} />
    <input
      type="text"
      placeholder="Code INSEE de la commune"
      bind:value={codeInseeDeLaCommuneFilter}
    />
    <input
      type="text"
      placeholder="Nom de la commune"
      bind:value={nomDeLaCommuneFilter}
    />
    <select bind:value={secteurFilter}>
      <option value="">Secteur</option>
      {#each secteurs as secteur}
        <option value={secteur}>{secteur}</option>
      {/each}
    </select>
    <button on:click={fetchData}>Rechercher</button>
</div>
<ul>
  {#each filteredResults as item, i}
    <li>
      <p>{item.rentree_scolaire}</p>
      <p>{item.academie} : {item.departement}</p>
      <p>
        {item.nom_de_l_etablissment === "A COMPLETER"
          ? item.nom_de_la_commune
          : item.nom_de_l_etablissment} : {item.ips}
      </p>
    </li>
  {/each}
</ul>

<style>
  li {
    border: 1px solid #ccc;
    margin-bottom: 10px;
    padding: 5px;
    list-style-type: none;
    border-radius: 5px;
  }
</style>
