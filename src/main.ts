import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import googleApi from '@/composables/api/google-api'
import stanfordnlpApi from '@/composables/api/stanfordnlp-api'
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
        currentSentenceIndex: 0
      })
      , mutations: {
        shiftSentence(state, offset) {
            const newIndex = state.currentSentenceIndex + offset
            if (newIndex < 0) return
            state.currentSentenceIndex = newIndex
        }
      }
    }
    , baseline: {
      namespaced: true
      , state: () => ({
        sentences: []
      })
      , mutations: {
        storeSentences (state, sentences) {
          state.sentences = sentences
        }
      }
    }
    , flags: {
      namespaced: true
      , state: () => ({
        toggling: false
      })
      , mutations: {
        setToggling (state, toggling) {
          state.toggling = toggling
        }
      }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      // 這是為了要拿句子的拆分
      googleApi(documentText).then((parse) => {
        const sentences = parse.sentences.map(({ text: {content: text} }: any) => ({text}))
        sentences.forEach((sentence: any, index: number) => {sentence.index = index})
        stanfordnlpApi(documentText).then((stanfordnlpParse) => {
          // 句子的屬性（以後準備拿掉）
          console.log("google sentences: ", sentences.length)
          console.log("stanfordnlp sentences: ", stanfordnlpParse.sentences.length)
          let start = 0
          sentences.forEach((sentence: any, index: number) => {
            sentence.start = start
            sentence.end = start + stanfordnlpParse.sentences[index].tokens.length - 1
            start += stanfordnlpParse.sentences[index].tokens.length
          })
          commit('baseline/storeSentences', sentences)
          commit('storeOriginalText', documentText)
        })
      })
    }
    , setToggling({commit}, toggling) {
      commit('flags/setToggling', toggling)
    }
  }
  , mutations: {
    storeOriginalText (state: any, documentText) {
        state.originalText = documentText
    }
    , shiftSentence(state: any, offset) {
        const newIndex = state.currentSentenceIndex + offset
        if (newIndex < 0) {
            return
        }
        state.currentSentenceIndex = newIndex
    }
  }
  , getters: {
    isDocumentReady(state, getters) {
      return (getters.baselineSentences.length > 0)
    }
    , baselineSentences(state: any) {
      return state.baseline.sentences
    }
    , maxSentenceIndex(state, getters) {
      if (! (getters.baselineSentences.length > 0)) {
        return -1 
      }
      return getters.baselineSentences.length - 1
    }
    , currentSentenceIndex (state: any) {
      return state.sentenceNavigator.currentSentenceIndex
    }
    , currentSentence (state, getters) {
      return getters.baselineSentences[getters.currentSentenceIndex]
    }
    , toggling (state: any) {
      return state.flags.toggling
    }
  }
})

app.use(store)
app.use(PrimeVue)
app.mount('#app')