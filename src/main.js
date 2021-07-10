import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import googleApi from '@/composables/google-api'
import stanfordnlpApi from '@/composables/stanfordnlp-api'
import PrimeVue from 'primevue/config'

const app = createApp(App)

// vuex
const store = createStore({
  state () {
    return {
        originalText : ''
    }
  }
  , modules: {
    sentenceNavigator: {
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
        const sentences = parse.sentences.map(({ text: {content: text} }) => ({text}))
        sentences.forEach((sentence, index) => {sentence.index = index})
        stanfordnlpApi(documentText).then((stanfordnlpParse) => {
          // 句子的屬性（以後準備拿掉）
          let start = 0
          sentences.forEach((sentence, index) => {
            sentence.start = start
            sentence.end = start + stanfordnlpParse.sentences[index].tokens.length - 1
            start += stanfordnlpParse.sentences[index].tokens.length
          })
        })
        commit('sentenceNavigator/storeSentences', sentences)
        commit('storeOriginalText', documentText)
      })
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
    isDocumentReady(state) {
      return (state.sentenceNavigator.sentences.length > 0)
    }
    , maxSentenceIndex(state) {
      if (! state.sentenceNavigator.sentences.length > 0) {
        return -1 
      }
      return state.sentenceNavigator.sentences.length - 1
    }
    , currentSentence (state) {
      return state.sentenceNavigator.sentences[state.sentenceNavigator.currentSentenceIndex]
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')