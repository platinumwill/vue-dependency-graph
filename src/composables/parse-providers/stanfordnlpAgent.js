import stanfordnlpApi from '@/composables/stanfordnlp-api'

export default async function (documentText) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            stanfordnlpApi(documentText).then((stanfordParse) => {
                console.log("STANFORD parse:")
                console.log(stanfordParse)
                // 手動把 sentenceIndex 加到 dependency 裡面
                stanfordParse.sentences.forEach(sentence => sentence.tokens.forEach(token => token.sentenceIndex = sentence.index))
                stanfordParse.sentences.forEach(sentence => sentence.enhancedDependencies.forEach(dependency => dependency.sentenceIndex = sentence.index))
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
            }).catch((error) => {
                console.log(error)
                reject(error)
            })
        }, 1000)
    })
}