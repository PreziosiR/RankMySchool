<script>
    export let onSelectType;
</script>

<div class="type-selection">
    <button on:click={() => onSelectType('écoles primaire')}>Écoles Primaire</button>
    <button on:click={() => onSelectType('collège')}>Collège</button>
    <button on:click={() => onSelectType('lycée')}>Lycée</button>
</div>

<style>
    .type-selection {
        display: flex;
        justify-content: space-around;
        margin-bottom: 20px;
    }
    button {
        padding: 10px 20px;
    }
</style>