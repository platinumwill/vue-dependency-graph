<template>
    <SentenceParseGraph :parse="currentSentenceSpacyParse"></SentenceParseGraph>
    <SentenceParseGraph :parse="currentSentenceStanfordNLPParseSpacyFormat"></SentenceParseGraph>
    <SentenceParseGraph :parse="currentSentenceGoogleParseSpacyFormat"></SentenceParseGraph>
    <DocumentInput></DocumentInput>
    <PatternDialog></PatternDialog>
    <DocumentPanel></DocumentPanel>
</template>

<script>
import DocumentPanel from "./DocumentPanel.vue"
import DocumentInput from "./DocumentInput.vue"
import PatternDialog from "./PatternDialog.vue"
import SentenceParseGraph from "./SentenceParseGraph.vue"
import { mapGetters } from 'vuex'

export default {
  name: 'DependencyGraph'
  , components: {
      SentenceParseGraph
      , DocumentPanel
      , DocumentInput
      , PatternDialog
  } 
  , props: {
    provided() {
        return {
            config: this.config
        }
    }
  }
  , computed: {
    ...mapGetters([
      'isDocumentReady'
    , 'currentSentenceSpacyParse'
    , 'currentSentenceGoogleParseSpacyFormat'
    , 'currentSentenceStanfordNLPParseSpacyFormat'
    ])
  }
}
</script>
