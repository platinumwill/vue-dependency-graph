<template>
    <SentenceParseGraph></SentenceParseGraph>
    <DocumentInput></DocumentInput>
    <PatternDialog></PatternDialog>
    <DocumentPanel></DocumentPanel>
</template>

<script>
import DocumentPanel from "./DocumentPanel.vue"
import DocumentInput from "./DocumentInput.vue"
import PatternDialog from "./PatternDialog.vue"
import SentenceParseGraph from "./SentenceParseGraph.vue"

export default {
  name: 'DependencyGraph'
  , components: {
      SentenceParseGraph
      , DocumentPanel
      , DocumentInput
      , PatternDialog
  } 
  , props: {
    parse: {
        type: Object
        , default: function() {
            return {}
        }
    }
    , provided() {
        return {
            config: this.config
        }
    }
  }
}
</script>
