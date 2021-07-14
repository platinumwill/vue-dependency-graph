import axios from "axios"

export default function(command) {
    
    let argument = {
        gremlin: command
    }
    return new Promise((resolve, reject) => {
        axios.post('http://stanford-local:8182/', JSON.stringify(argument)).then(function(response) {
            const result = response.data.result
            resolve(result.data)
        }).catch(function(error) {
            console.error(error)
            reject(error)
        })
    })

}