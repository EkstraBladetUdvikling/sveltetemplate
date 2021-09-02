import App from './App.svelte';

const app = new App({
  props: {
    name: 'Ekstra Bladet',
  },
  target: document.body,
});

export default app;
