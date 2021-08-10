<script lang="ts">
  import '@ekstra-bladet/designsystem/dist/eb-designsystem--utilities.css';

  import { Icon } from '@ekstra-bladet/designsystem';
  import Button from '@ekstra-bladet/designsystem/src/components/button/Button.svelte';
  import Accordion from '@ekstra-bladet/designsystem/src/components/accordion/Accordion.svelte';

  export let name: string;

  let tabs = [{ content: 'flurps', title: 'Step 1' }];
</script>

<main class="">
  <h1><Icon name="ekstrabladet" /> Hello {name}!</h1>
  <p>
    Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.
  </p>
  <p>
    And visit the <a href="https://ekstrabladetudvikling.github.io/eb-designsystem/">Designsystem documentation</a> to learn
    how the designsystem works
  </p>
  <Button>Her!</Button>
  <Accordion dataTheme="lightmode" {tabs} />
</main>
