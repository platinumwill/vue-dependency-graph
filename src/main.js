import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App)

const spacyFormatParse = {
  namespaced: true
  , state: () => ({
    parse: {}
  })
  , getters: {
    isReady (state) {
      return (!( JSON.stringify(state.parse) === JSON.stringify({}) ))
    }
    , parse (state) {
      return state.parse
    }
    , currentSentenceParse (state, getters, rootState, rootGetters) {
      if (!getters.isReady) {
        return {}
      }
      const filteredArcs = getters.parse.arcs.filter(
        arc =>
          arc.start >= rootGetters.currentSentence.start 
          && arc.end >= rootGetters.currentSentence.start
          && arc.start < rootGetters.currentSentence.end 
          && arc.end < rootGetters.currentSentence.end 
        )
      let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
      arcsClone.forEach(function (arc) {
        arc.start -= (rootGetters.currentSentence.start)
        arc.end -= (rootGetters.currentSentence.start)
      })
      
      const sentenceParse = {
        words: getters.parse.words.filter(
          (word, index) =>
            index >= rootGetters.currentSentence.start 
            && index < rootGetters.currentSentence.end
          )
        , arcs: arcsClone
      }
      return sentenceParse
    }
  }
  , mutations: {
    storeSpacyFormatParse (state, input) {
      state.parse = input
    }
  }
}
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
    spacyFormatParseProviders: {
      namespaced: true
      , modules: {
        spacy: spacyFormatParse
        , google: spacyFormatParse
        , stanfordnlp: spacyFormatParse
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
        commit('storeSpacySentences', parsedDocument.spacy_sents)
      }).catch(function(error) {
        console.log(error)
      })
    }
  }
  , mutations: {
    storeOriginalText (state, originalText) {
        state.originalText = originalText
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
    documentParse (state, getters) {
      return getters['spacyFormatParseProviders/spacy/parse']
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
    , currentSentenceSpacyParse (state, getters) {
      return getters['spacyFormatParseProviders/spacy/currentSentenceParse']
    }
    , currentSentenceGoogleParseSpacyFormat (state, getters) {
      return getters['spacyFormatParseProviders/google/currentSentenceParse']
    }
    , currentSentenceStanfordNLPParseSpacyFormat (state, getters) {
      return getters['spacyFormatParseProviders/stanfordnlp/currentSentenceParse']
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
app.mount('#app')