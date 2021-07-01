import axios from 'axios'
export default async function (documentText) {
    console.log('i am spacy')
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const params = new URLSearchParams();
            params.append('text', documentText);
            axios.post('http://localhost:5000/spacy/parse', params).then(function(response) {
                console.log(response.data)
                resolve(response.data)
            }).catch(function (error) {
                console.log(error)
                reject(error)
            })
        }, 1000)
    })
}