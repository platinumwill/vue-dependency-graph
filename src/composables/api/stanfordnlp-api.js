import axios from 'axios'

export default async function (documentText) {
    return new Promise((resolve, reject) => {
            // Stanford CoreNLP
            // properties={"annotators":"tokenize,pos,parse,lemma","outputFormat":"json"}
            const encodedQueryString = encodeURI('?properties={"annotators": "tokenize,ssplit,pos,ner,depparse,openie"}&pipelineLanguage=en')
            axios.post('http://stanfordnlp-server:9000/' + encodedQueryString
                , documentText)
            .then(function(response) {
                resolve(response.data)
            }).catch(function(error) {
                console.log(error)
                reject(error)
            })
    })
}