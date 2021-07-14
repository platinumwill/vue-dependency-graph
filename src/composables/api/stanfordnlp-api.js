import axios from 'axios'

export default async function (documentText) {
    return new Promise((resolve, reject) => {
            // Stanford CoreNLP
            // properties={"annotators":"tokenize,pos,parse,lemma","outputFormat":"json"}
            // await axios.post('http://localhost:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D', documentText).then(function(response) {
            axios.post('http://stanford-local:9000/?properties=%7B%22annotators%22%3A%22tokenize%2Cpos%2Cparse%2Clemma%22%2C%22outputFormat%22%3A%22json%22%7D'
                , documentText)
            .then(function(response) {
                resolve(response.data)
            }).catch(function(error) {
                console.log(error)
                reject(error)
            })
    })
}