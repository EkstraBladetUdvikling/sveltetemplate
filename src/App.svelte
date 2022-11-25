<script lang="ts">
  import '@ekstra-bladet/designsystem/css/designsystem.css';

  import { Icon } from '@ekstra-bladet/designsystem';

  export let name: string;

  const tabs = [{ content: 'flurps', title: 'Step 1' }];
</script>

<div class="flex flex-justify--center">
  <main class="grid-width--medium">
    <h1><Icon name="ekstrabladet" /> Hello {name}!</h1>
    <p>
      Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.
    </p>
    <p>
      And visit the <a href="https://ekstrabladetudvikling.github.io/eb-designsystem/">Designsystem documentation</a> to
      learn how the designsystem works
    </p>
  </main>
</div>
