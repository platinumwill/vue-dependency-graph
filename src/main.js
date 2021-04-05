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
            , spacy_sents: []
        }
        , currentSentenceIndex: 0
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      const params = new URLSearchParams();
      params.append('text', documentText);
      await axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
        const parsedDocument = response.data
        parsedDocument.originalText = documentText

        function adjustArcs(arc) {
          arc.key = arc.start + '_to_' + arc.end
        }
        parsedDocument.arcs.forEach(adjustArcs)

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
      return state.parsedDocument
    }
    , currentSentenceParse (state, getters) {
      function wordsFilter(word, index) {
        if (index < getters.currentSentence.start) {
          return false
        }
        if (index >= getters.currentSentence.end) {
          return false
        }
        return true
      }
      const filteredWords = state.parsedDocument.words.filter(wordsFilter)
      function arcsFilter(arc) {
        if (arc.start < getters.currentSentence.start && arc.end < getters.currentSentence.start) {
          return false
        }
        if (arc.start >= getters.currentSentence.end && arc.end >= getters.currentSentence.end) {
          return false
        }
        return true;
      }
      const filteredArcs = getters.documentParse.arcs.filter(arcsFilter)
      function adjustArc(arc) {
        arc.start -= (getters.currentSentence.start)
        arc.end -= (getters.currentSentence.start)
      }
      // let arcsClone = filteredArcs.slice(0)// PROGRESS
      let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
      arcsClone.forEach(adjustArc)
      const sentenceParse = {
        words: filteredWords
        , arcs: arcsClone
      }
      return sentenceParse
    }
    , isDocumentReady(state) {
      if (state.parsedDocument.spacy_sents.length <= 0) {
        return false
      }
      return true
    }
    , maxSentenceIndex(state, getters) {
      if (! getters.isDocumentReady) {
        return -1 
      }
      return state.parsedDocument.spacy_sents.length - 1
    }
    , currentSentenceIndex(state) {
      return state.currentSentenceIndex
    }
    , currentSentence (state, getters) {
      return getters.documentParse.spacy_sents[getters.currentSentenceIndex]
    }
  }
})

app.use(store)
app.mount('#app')