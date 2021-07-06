import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import spacyAgent from '@/composables/parse-providers/spacyAgent'
import googleApi from '@/composables/google-api'
import PrimeVue from 'primevue/config'

const app = createApp(App)

// vuex
const store = createStore({
  state () {
    return {
        currentSentenceIndex: 0
        , originalText : ''
    }
  }
  , modules: {
    sentenceNavigator: {
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
        , saveSentences (state, sentences) {
          state.sentences = sentences
        }
      }
    }
    , newSentenceNavigator: {
      namespaced: true
      , state: () => ({
        sentences: []
        , currentSentenceIndex: 0
      })
      , mutations: {
        storeSentences (state, sentences) {
          state.sentences = sentences
        }
        , shiftSentence(state, offset) {
            const newIndex = state.currentSentenceIndex + offset
            if (newIndex < 0) return
            state.currentSentenceIndex = newIndex
        }
      }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      // 這是為了要拿句子的拆分
      googleApi(documentText).then((parse) => {
        commit('newSentenceNavigator/storeSentences', parse.sentences.map(sentence => sentence.text.content))
      })
      spacyAgent(documentText).then((documentParse) => {
        const sentences = documentParse.spacy_sents
        sentences.forEach((spacySentence) => spacySentence.indexInDocument = sentences.indexOf(spacySentence))
        commit('sentenceNavigator/saveSentences', sentences)
        commit('sentenceNavigator/saveSpacyFormatParse', documentParse)
      })
      commit('storeOriginalText', documentText)
    }
  }
  , mutations: {
    storeOriginalText (state, documentText) {
        state.originalText = documentText
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
    sentenceNavigatorDoc (state) {
      return state.sentenceNavigator.spacyFormatParse
    }
    , isDocumentReady(state) {
      return (state.sentenceNavigator.sentences.length > 0)
    }
    , maxSentenceIndex(state) {
      if (! state.sentenceNavigator.sentences.length > 0) {
        return -1 
      }
      return state.sentenceNavigator.sentences.length - 1
    }
    , currentSentence (state) {
      return state.sentenceNavigator.sentences[state.currentSentenceIndex]
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')