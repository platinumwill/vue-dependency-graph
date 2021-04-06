<template>
    <DependencyGraph></DependencyGraph>
</template>

<script>
import DependencyGraph from "./components/DependencyGraph.vue";

export default {
  name: 'App',
  components: {
        DependencyGraph
  }
}
</script>

<style>
body {
    background-color: black;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}
</style>
