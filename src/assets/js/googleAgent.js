import axios from 'axios'
export default async function (documentText) {
    console.log('i am google')
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const google_url = 'https://language.googleapis.com/v1/documents:analyzeSyntax?key=AIzaSyAxueNH_QGMkUSVBse8VSzfOTUUZ1oRfxM';
            let google_param = {};
            let document = {};
            document.type = 'PLAIN_TEXT'
            document.language = 'en'
            document.content = documentText
            google_param.document = document
            google_param.encodingType = 'UTF8'
            axios.post(google_url, google_param).then(function(response) {
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
                resolve(googleParseConvertedSpacy)
            }).catch(function(error) {
                console.log(error)
                reject(error)
            })
        }, 1000)
    })
}