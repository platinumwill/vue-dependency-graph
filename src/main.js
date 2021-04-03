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
  }
})

app.use(store)
app.mount('#app')