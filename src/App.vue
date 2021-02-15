<template>
    <DependencyGraph :parse="parse"></DependencyGraph>
</template>

<script>
import DependencyGraph from "./components/DependencyGraph.vue";

export default {
  name: 'App',
  components: {
        DependencyGraph
  }, data() {
    return {
      parse: {
        words: [
        { text: "Samuel", tag: "PROPN", lemma: "Samuel" },
        { text: "L.", tag: "PROPN", lemma: "l." },
        { text: "Jackson", tag: "PROPN", lemma: "jackson" },
        { text: "sent", tag: "VERB", lemma: "sent" },
        { text: "an", tag: "DET", lemma: "an" },
        { text: "email", tag: "NOUN", lemma: "email" },
        { text: "to", tag: "ADP", lemma: "to" },
        { text: "Stanford", tag: "PROPN", lemma: "stanford" },
        { text: "University.", tag: "PROPN", lemma: "university" },
        { text: "He", tag: "PRON", lemma: "he" },
        { text: "did", tag: "AUX", lemma: "did" },
        { text: "n't", tag: "PART", lemma: "nt" },
        { text: "get", tag: "AUX", lemma: "get" },
        { text: "a", tag: "DET", lemma: "a" },
        { text: "reply.", tag: "NOUN", lemma: "reply" },
      ],
      arcs: [
        { start: 0, end: 2, label: "compound", dir: "left" },
        { start: 1, end: 2, label: "compound", dir: "left" },
        { start: 2, end: 3, label: "nsubj", dir: "left" },
        { start: 4, end: 5, label: "det", dir: "left" },
        { start: 3, end: 5, label: "dobj", dir: "right" },
        { start: 3, end: 6, label: "dative", dir: "right" },
        { start: 7, end: 8, label: "compound", dir: "left" },
        { start: 6, end: 8, label: "pobj", dir: "right" },
        { start: 9, end: 12, label: "nsubj", dir: "left" },
        { start: 10, end: 12, label: "aux", dir: "left" },
        { start: 11, end: 12, label: "neg", dir: "left" },
        { start: 13, end: 14, label: "det", dir: "left" },
        { start: 12, end: 14, label: "dobj", dir: "right" },
      ],
      settings: { lang: "en", direction: "ltr" },
      }
    }
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
