import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'

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
  , mutations: {
    saveParsedDocument (state, parsedDocument) {
        state.parsedDocument = parsedDocument
        console.log(state.parsedDocument)
    }
  }
})

app.use(store)