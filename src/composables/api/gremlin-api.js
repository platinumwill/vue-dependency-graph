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
export class GremlinInvoke {
    constructor() {
        this.command = "g"
    }

    call(method, ...values) {
        this.command = this.command.concat(".")
        this.command = this.command.concat(method, "(")
        if (values !== undefined) {
            values.forEach( (value, index) => {
                if (index !== 0) this.command = this.command.concat(", ")
                this.command = this.command.concat(JSON.stringify(value))
            })
        }
        this.command = this.command.concat(")")
        return this
    }

    command() {
        return this.command
    }
}