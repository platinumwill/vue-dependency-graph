import axios from 'axios'
export default async function (documentText: string) {
    return new Promise((resolve, reject) => {
            const params = new URLSearchParams();
            params.append('text', documentText);
            axios.post('http://spacy-server:5000/spacy/parse', params).then(function(response) {
                console.log('SPACY parse:')
                console.log(response.data)
                resolve(response.data)
            }).catch(function (error) {
                console.log(error)
                reject(error)
            })
    })
}