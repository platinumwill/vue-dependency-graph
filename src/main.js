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
        , googleParse: {
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

        function putArcKey(arc) {
          arc.key = arc.start + '_to_' + arc.end
        }
        parsedDocument.arcs.forEach(putArcKey)

        console.log("SPACY parse:")
        console.log(parsedDocument)
        console.log(parsedDocument.originalText)
        commit('storeParsedDocument', parsedDocument)
      }).catch(function(error) {
        console.log(error)
      })

      // Stanford CoreNLP
      // properties={"annotators":"tokenize,pos,parse,lemma","outputFormat":"json"}
      // await axios.post('http://localhost:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
      await axios.post('http://172.22.102.238:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
        console.log("STANFORD pase:")
        console.log(response.data);
      }).catch(function(error) {
        console.log(error)
      })

      // Google NLP
      const google_url = 'https://language.googleapis.com/v1/documents:analyzeSyntax?key=AIzaSyAxueNH_QGMkUSVBse8VSzfOTUUZ1oRfxM';
      let google_param = {};
      let document = {};
      document.type = 'PLAIN_TEXT'
      document.language = 'en'
      document.content = documentText
      google_param.document = document
      google_param.encodingType = 'UTF8'
      await axios.post(google_url, google_param).then(function(response) {
        console.log("GOOGLE parse:")
        console.log(response.data);
      }).catch(function(error) {
        console.log(error)
      })

    }
  }
  , mutations: {
    storeParsedDocument (state, parsedDocument) {
        state.parsedDocument = parsedDocument
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
    documentParse (state) {
      return state.parsedDocument
    }
    , currentSentenceParse (state, getters) {
      function wordsFilter(word, index) {
        return (
          index >= getters.currentSentence.start 
          && index < getters.currentSentence.end
          )
      }
      const filteredWords = state.parsedDocument.words.filter(wordsFilter)
      function arcsFilter(arc) {
        return (
          arc.start >= getters.currentSentence.start 
          && arc.end >= getters.currentSentence.start
          && arc.start < getters.currentSentence.end 
          && arc.end < getters.currentSentence.end 
          ) 
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