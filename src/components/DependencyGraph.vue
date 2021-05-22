<template>
    <SentenceParseGraph :parse="currentSentenceSpacyParse"></SentenceParseGraph>
    <SentenceParseGraph :parse="currentSentenceStanfordNLPParseSpacyFormat"></SentenceParseGraph>
    <SentenceParseGraph :parse="currentSentenceGoogleParseSpacyFormat"></SentenceParseGraph>
    <SentenceParseGraph2 :spacyAgent="parseBySpacy"></SentenceParseGraph2>
    <DocumentInput></DocumentInput>
    <PatternDialog></PatternDialog>
    <DocumentPanel></DocumentPanel>
</template>

<script>
import DocumentPanel from "./DocumentPanel.vue"
import DocumentInput from "./DocumentInput.vue"
import PatternDialog from "./PatternDialog.vue"
import SentenceParseGraph from "./SentenceParseGraph.vue"
import SentenceParseGraph2 from "./SentenceParseGraph2.vue"
import { mapGetters } from 'vuex'
import spacyAgent from '../assets/js/spacyAgent.js'

export default {
  name: 'DependencyGraph'
  , components: {
      SentenceParseGraph
      , SentenceParseGraph2
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
  , methods: {
    parseBySpacy: async function (documentText) {
      const result = await spacyAgent(documentText)
      console.log(result)
      return result
    }
  }
}
</script>
