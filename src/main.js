import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import spacyAgent from '@/composables/parse-providers/spacyAgent'
import PrimeVue from 'primevue/config'

const app = createApp(App)

// vuex
const store = createStore({
  state () {
    return {
        currentSentenceIndex: 0
        , originalText : ''
        , spacySentences: []
    }
  }
  , modules: {
    baseline: {
      namespaced: true
      , state: () => ({
        tokens: []
        , sentences: []
        , spacyFormatParse: undefined
      })
      , mutations: {
        saveSpacyFormatParse (state, parse) {
          state.spacyFormatParse = parse
        }
      }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      // 這是為了要拿句子的拆分
      const params = new URLSearchParams();
      params.append('text', documentText);
      spacyAgent(documentText).then((documentParse) => {
        const sentences = documentParse.spacy_sents
        sentences.forEach((spacySentence) => spacySentence.indexInDocument = sentences.indexOf(spacySentence))
        commit('storeSpacySentences', sentences)
        commit('baseline/saveSpacyFormatParse', documentParse)
      })
      commit('storeOriginalText', documentText)
    }
  }
  , mutations: {
    storeOriginalText (state, documentText) {
        state.originalText = documentText
    }
    , storeSpacySentences (state, sentences) {
        state.spacySentences = sentences
    }
    , shiftSentence(state, offset) {
        const newIndex = state.currentSentenceIndex + offset
        if (newIndex < 0) {
            return
        }
        state.currentSentenceIndex = newIndex
    }
  }
  , getters: {
    baselineParse (state) {
      return state.baseline.spacyFormatParse
    }
    , isDocumentReady(state) {
      return (state.spacySentences.length > 0)
    }
    , maxSentenceIndex(state) {
      if (! state.spacySentences.length > 0) {
        return -1 
      }
      return state.spacySentences.length - 1
    }
    , currentSentence (state) {
      return state.spacySentences[state.currentSentenceIndex]
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')