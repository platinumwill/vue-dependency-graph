import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App)

const parseProvider = {
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
        parsedDocument: {
        }
        , googleParse: {
        }
        , currentSentenceIndex: 0
        , originalText : ''
        , spacySentences: []
    }
  }
  , modules: {
    parseProviders: {
      namespaced: true
      , modules: {
        spacy: parseProvider
        , google: parseProvider
        , stanfordnlp: parseProvider
      }
    }
  }
  , actions: {
    async parseAndStoreDocument({commit}, documentText) {
      const params = new URLSearchParams();
      params.append('text', documentText);
      await axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
        const parsedDocument = response.data
        commit('storeOriginalText', documentText)

        function putArcKey(arc) {
          arc.key = arc.start + '_to_' + arc.end
        }
        parsedDocument.arcs.forEach(putArcKey)

        console.log("SPACY parse:")
        console.log(parsedDocument)
        commit('storeParsedDocument', parsedDocument)
        commit('storeSpacySentences', parsedDocument.spacy_sents)
        commit('parseProviders/spacy/storeSpacyFormatParse', parsedDocument, {root: true})
      }).catch(function(error) {
        console.log(error)
      })

      // Stanford CoreNLP
      // properties={"annotators":"tokenize,pos,parse,lemma","outputFormat":"json"}
      // await axios.post('http://localhost:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
      await axios.post('http://stanford-local:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
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
        const googleParsedResult = response.data
        // const googleParseConvertedSpacy = {googleParsedResult}
        console.log("GOOGLE parse in SPACY format:")
        const googleParseConvertedSpacy = ({
                    arcs: googleParsedResult.tokens.map(({ dependencyEdge: { label, headTokenIndex: j }}, i) => (i != j) ? ({ label, start: Math.min(i, j), end: Math.max(i, j), dir: (j > i) ? 'left' : 'right' }) : null).filter(word => word != null)
                    , words: googleParsedResult.tokens.map(({ text: { content: text }, partOfSpeech: { tag }} ) => ({ text, tag }))
                })
        console.log(googleParseConvertedSpacy)
        commit('parseProviders/google/storeSpacyFormatParse', googleParseConvertedSpacy, {root: true})
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
    , storeParsedDocument (state, parsedDocument) {
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
      return getters['parseProviders/spacy/currentSentenceParse']
    }
    , currentSentenceGoogleParseSpacyFormat (state, getters) {
      return getters['parseProviders/google/currentSentenceParse']
    }
    , isDocumentReady(state, getters) {
      return (
        getters.spacySentences.length > 0
        && getters['parseProviders/google/isReady']
        )
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