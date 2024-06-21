<script>
    export let onSelectType;
</script>

<div class="type-selection">
    <button on:click={() => onSelectType('ecole')}>Écoles Primaire</button>
    <button on:click={() => onSelectType('college')}>Collège</button>
    <button on:click={() => onSelectType('lycee')}>Lycée</button>
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