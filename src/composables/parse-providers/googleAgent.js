import googleApi from "@/composables/api/google-api"
export default async function (documentText) {
    return new Promise((resolve, reject) => {
            googleApi(documentText).then((parse) => {
                console.log("GOOGLE parse:")
                console.log(parse)
                const googleParseConvertedSpacy = ({
                            arcs: parse.tokens.map(({ dependencyEdge: { label, headTokenIndex: j }}, i) => (i != j) ? ({ label, start: Math.min(i, j), end: Math.max(i, j), dir: (j > i) ? 'left' : 'right' }) : null).filter(word => word != null)
                            , words: parse.tokens.map(({ text: { content: text }, partOfSpeech: { tag, tense }, lemma: lemma } ) => ({ text, tag, tense, lemma }))
                        })
                console.log("GOOGLE parse in Spacy format:")
                console.log(googleParseConvertedSpacy)
                resolve(googleParseConvertedSpacy)
            }).catch((error) => {
                console.error(error)
                reject(error)
            })
    })
}