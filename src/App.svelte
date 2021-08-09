<script lang="ts">
  import '@ekstra-bladet/designsystem/dist/eb-designsystem.css';
  import { Button, Icon } from '@ekstra-bladet/designsystem';

  export let name: string;
</script>

<main>
  <h1><Icon name="ekstrabladet" /> Hello {name}!</h1>
  <p>
    Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn
    how to build Svelte apps.
  </p>
  <p>
    And visit the <a
      href="https://ekstrabladetudvikling.github.io/eb-designsystem/"
      >Designsystem documentation</a
    > to learn how the designsystem works
  </p>
</main>
