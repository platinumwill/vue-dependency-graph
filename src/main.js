import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App)

// vuex
const store = createStore({
  state () {
    return {
        parsedDocument: {
            originalText : ''
        }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      const params = new URLSearchParams();
      params.append('text', documentText);
      await axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
        const parsedDocument = response.data
        parsedDocument.originalText = documentText
        console.log(parsedDocument)
        console.log(parsedDocument.originalText)
        commit('storeParsedDocument', parsedDocument)
      }).catch(function(error) {
        console.log(error)
      })
    }
  }
  , mutations: {
    storeParsedDocument (state, parsedDocument) {
        state.parsedDocument = parsedDocument
    }
  }
  , getters: {
    documentParse (state) {
      return state.parsedDocument
    }
    , isDocumentReady(state) {
      if (state.parsedDocument.spacy_sents === undefined) {
        return false
      }
      if (state.parsedDocument.spacy_sents.length <= 0) {
        return false
      }
      return true
    }
    , maxSentenceIndex(state, getters) {
      console.log(state)
      if (! getters.isDocumentReady) {
        return -1 
      }
      return state.parsedDocument.spacy_sents.length - 1
    }
  }
})

app.use(store)
app.mount('#app')