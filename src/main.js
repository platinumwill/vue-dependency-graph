import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App)
app.mount('#app')

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
      console.log(documentText)
      const params = new URLSearchParams();
      params.append('text', documentText);
      await axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
        const parsedDocument = response.data
        console.log(parsedDocument)
        commit('storeParsedDocument', parsedDocument)
      }).catch(function(error) {
        console.log(error)
      })
    }
  }
  , mutations: {
    storeParsedDocument (state, parsedDocument) {
        state.parsedDocument = parsedDocument
        console.log(state.parsedDocument)
    }
  }
})

app.use(store)