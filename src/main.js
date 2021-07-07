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
    newSentenceNavigator: {
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
        const newSentences = parse.sentences.map(({ text: {content: text} }) => ({text}))
        newSentences.forEach((sentence, index) => {sentence.index = index})
        spacyAgent(documentText).then((documentParse) => {
          const sentences = documentParse.spacy_sents
          // 句子的屬性（以後準備拿掉）
          sentences.forEach((spacySentence, index) => {
            newSentences[index].start = spacySentence.start
            newSentences[index].end = spacySentence.end
          })
        })
        commit('newSentenceNavigator/storeSentences', newSentences)
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
      return (state.newSentenceNavigator.sentences.length > 0)
    }
    , maxSentenceIndex(state) {
      if (! state.newSentenceNavigator.sentences.length > 0) {
        return -1 
      }
      return state.newSentenceNavigator.sentences.length - 1
    }
    , currentSentence (state) {
      return state.newSentenceNavigator.sentences[state.currentSentenceIndex]
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')