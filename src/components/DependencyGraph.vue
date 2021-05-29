<template>
    <SentenceParseGraph :spacyFormatParseProvider="parseBySpacy"></SentenceParseGraph>
    <SentenceParseGraph :spacyFormatParseProvider="parseByGooglenlp"></SentenceParseGraph>
    <SentenceParseGraph :spacyFormatParseProvider="parseByStanfordnlp"></SentenceParseGraph>
    <DocumentInput></DocumentInput>
    <DocumentPanel></DocumentPanel>
</template>

<script>
import DocumentPanel from "./DocumentPanel.vue"
import DocumentInput from "./DocumentInput.vue"
import SentenceParseGraph from "./SentenceParseGraph.vue"
import { mapGetters } from 'vuex'
import spacyAgent from '../assets/js/spacyAgent.js'
import stanfordnlpAgent from '../assets/js/stanfordnlpAgent.js'
import googlenlpAgent from '../assets/js/googleAgent.js'

export default {
  name: 'DependencyGraph'
  , components: {
      SentenceParseGraph
      , DocumentPanel
      , DocumentInput
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
    ])
  }
  , methods: {
    parseBySpacy: async function (documentText) {
      const result = await spacyAgent(documentText)
      console.log(result)
      return result
    }
    , parseByStanfordnlp: async function (documentText) {
      const result = await stanfordnlpAgent(documentText)
      console.log(result)
      return result
    }
    , parseByGooglenlp: async function (documentText) {
      const result = await googlenlpAgent(documentText)
      console.log(result)
      return result
    }
  }
}
</script>
