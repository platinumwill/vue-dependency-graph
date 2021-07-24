import axios from 'axios'
export default async function (documentText) {
    return new Promise((resolve, reject) => {
            const google_url = 'https://language.googleapis.com/v1/documents:annotateText?key=AIzaSyAxueNH_QGMkUSVBse8VSzfOTUUZ1oRfxM';
            let google_param = {};
            let document = {};
            document.type = 'PLAIN_TEXT'
            document.language = 'en'
            document.content = documentText
            const features = {
}
            features.extractSyntax = true
            features.extractEntities = false
            features.extractDocumentSentiment = false
            features.classifyText = false
            features.extractEntitySentiment = false

            google_param.document = document
            google_param.encodingType = 'UTF8'
            google_param.features = features

            axios.post(google_url, google_param).then(function(response) {
                resolve(response.data)
            }).catch(function(error) {
                console.log(error)
                reject(error)
            })
    })
}