import stanfordnlpApi from '@/composables/api/stanfordnlp-api'

export default async function (documentText: string) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            stanfordnlpApi(documentText).then((stanfordParse) => {
                console.log("STANFORD parse:")
                console.log(stanfordParse)
                // 手動把 sentenceIndex 加到 dependency 裡面
                stanfordParse.sentences.forEach( (sentence: any) => sentence.tokens.forEach( (token: any) => token.sentenceIndex = sentence.index))
                stanfordParse.sentences.forEach( (sentence: any) => sentence.enhancedDependencies.forEach( (dependency: any) => dependency.sentenceIndex = sentence.index))
                const tokens = stanfordParse.sentences.flatMap( (sentence: any) => sentence.tokens )
                const dependencies = stanfordParse.sentences.flatMap( (sentence: any) => sentence.enhancedDependencies )
                function newInfoDependency(dependency: any) {
                    const governorToken = tokens.find( (token: any) => token.sentenceIndex == dependency.sentenceIndex && token.index == dependency.governor)
                    const dependentToken = tokens.find( (token: any) => token.sentenceIndex == dependency.sentenceIndex && token.index == dependency.dependent)
                    return {
                        start: Math.min(tokens.indexOf(governorToken), tokens.indexOf(dependentToken))
                        , end: Math.max(tokens.indexOf(governorToken), tokens.indexOf(dependentToken))
                        , dir: dependency.governor > dependency.dependent ? 'left' : 'right'
                        , label: dependency.dep
                    }
                }
                const stanfordSpacyFormatParse = {
                    arcs: dependencies.map( (dependency: any) => newInfoDependency(dependency)).filter( (arc: any) => arc.start >= 0)
                    , words: tokens.map(({originalText: text, pos: tag, lemma: lemma}: any) => ({text, tag, lemma}))
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