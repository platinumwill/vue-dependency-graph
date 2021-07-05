<template>
    <SentenceParseGraph v-for="(provider, index) in spacyFormatParseProviders" :key="index" :spacyFormatParseProvider="provider"></SentenceParseGraph>
    <DocumentInput></DocumentInput>
    <DocumentPanel></DocumentPanel>
</template>

<script>
import DocumentPanel from "./DocumentPanel.vue"
import DocumentInput from "./DocumentInput.vue"
import SentenceParseGraph from "./SentenceParseGraph.vue"
import parseProviderManager from "@/composables/parse-providers/parseProviderManager.js"

export default {
  name: 'DependencyGraph'
  , components: {
      SentenceParseGraph
      , DocumentPanel
      , DocumentInput
  } 
  , setup() {
    const {
      spacyFormatParseProviders
    } = parseProviderManager()

    return {
      spacyFormatParseProviders
    }
  }
}
</script>
