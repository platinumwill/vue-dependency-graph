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
        saveTempSpacyParse (state, tempSpacyParse) {
          state.tempSpacyParse = tempSpacyParse
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
        const spacySentences = parsedDocument.spacy_sents
        spacySentences.forEach((spacySentence) => spacySentence.indexInDocument = spacySentences.indexOf(spacySentence))
        commit('storeSpacySentences', spacySentences)
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
    , storeSpacySentences (state, spacySentences) {
        state.spacySentences = spacySentences
    }
    , storeGoogleParse (state, googleParsedResult) {
        state.googleParse = googleParsedResult
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
    , originalText (state) {
      return state.originalText
    }
    , googleParse (state) {
      return state.googleParse
    }
    , spacySentences (state) {
      return state.spacySentences
    }
    , isGoogleParseReady (state) {
      return (state.googleParse.words !== undefined)
    }
    , isDocumentReady(state, getters) {
      return (getters.spacySentences.length > 0)
    }
    , maxSentenceIndex(state, getters) {
      if (! getters.isDocumentReady) {
        return -1 
      }
      return getters.spacySentences.length - 1
    }
    , currentSentenceIndex(state) {
      return state.currentSentenceIndex
    }
    , currentSentence (state, getters) {
      return getters.spacySentences[getters.currentSentenceIndex]
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')