import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import axios from 'axios'
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
        , tempSpacyParse: undefined
      })
      , mutations: {
        saveTempSpacyParse (state, parse) {
          state.tempSpacyParse = parse
        }
      }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      commit('storeOriginalText', documentText)

      // 這是為了要拿句子的拆分
      const params = new URLSearchParams();
      params.append('text', documentText);
      await axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
        const parsedDocument = response.data
        const sentences = parsedDocument.spacy_sents
        sentences.forEach((spacySentence) => spacySentence.indexInDocument = sentences.indexOf(spacySentence))
        commit('storeSpacySentences', sentences)
        commit('baseline/saveTempSpacyParse', parsedDocument)
      }).catch(function(error) {
        console.log(error)
      })
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
    documentParse (state) {
      // TODO to be removed
      return state.baseline.tempSpacyParse
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