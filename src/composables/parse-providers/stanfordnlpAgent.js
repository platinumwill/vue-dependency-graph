import axios from 'axios'
export default async function (documentText) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Stanford CoreNLP
            // properties={"annotators":"tokenize,pos,parse,lemma","outputFormat":"json"}
            // await axios.post('http://localhost:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
            axios.post('http://stanford-local:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
                console.log("STANFORD parse:")
                const stanfordParse = response.data
                // 手動把 sentenceIndex 加到 dependency 裡面
                stanfordParse.sentences.forEach(sentence => sentence.tokens.forEach(token => token.sentenceIndex = sentence.index))
                stanfordParse.sentences.forEach(sentence => sentence.enhancedDependencies.forEach(dependency => dependency.sentenceIndex = sentence.index))
                console.log(stanfordParse)
                const tokens = stanfordParse.sentences.flatMap( (sentence) => sentence.tokens )
                const dependencies = stanfordParse.sentences.flatMap( (sentence) => sentence.enhancedDependencies )
                function newInfoDependency(dependency) {
                    const governorToken = tokens.find(token => token.sentenceIndex == dependency.sentenceIndex && token.index == dependency.governor)
                    const dependentToken = tokens.find(token => token.sentenceIndex == dependency.sentenceIndex && token.index == dependency.dependent)
                    return {
                        start: Math.min(tokens.indexOf(governorToken), tokens.indexOf(dependentToken))
                        , end: Math.max(tokens.indexOf(governorToken), tokens.indexOf(dependentToken))
                        , dir: dependency.governor > dependency.dependent ? 'left' : 'right'
                        , label: dependency.dep
                    }
                }
                const stanfordSpacyFormatParse = {
                    arcs: dependencies.map(dependency => newInfoDependency(dependency)).filter(arc => arc.start >= 0)
                    , words: tokens.map(({originalText: text, pos: tag, lemma: lemma}) => ({text, tag, lemma}))
                }
                resolve(stanfordSpacyFormatParse)
                console.log("STANFORD parse in Spacy format:")
                console.log(stanfordSpacyFormatParse)
            }).catch(function(error) {
                console.log(error)
                reject(error)
            })
        }, 1000)
    })
}