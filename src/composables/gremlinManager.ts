import * as sentenceManager from "@/composables/sentenceManager"
import axios from "axios"

export function vertexAlias(word: sentenceManager.ModifiedSpacyToken | undefined) {
    if (word == undefined) {
        const error = '程式控制有問題，不應該執行到這裡'
        return
    }
    return 'sourceV-' + word.indexInSentence
}

export function connectorAlias(dependency: sentenceManager.ModifiedSpacyDependency) {
    return "connector_" + dependency.trueStart + "-" + dependency.trueEnd
}

export const vertexLabels = Object.freeze({
    linearTargetPattern: "LinearTargetPatternPiece"
    , sourcePattern: "SourcePatternPiece"
})
export const edgeLabels = Object.freeze({
    applicable: 'applicable'
    , follows: 'follows'
    , traceTo: 'traceTo'
})
export const aliases = Object.freeze({
    sourcePatternBeginning: "sourcePatternBeginning"
})

export const propertyNames = Object.freeze({
    isConnector: "isConnector"
    , isPlaceholder: "isPlaceholder"
    , seqNo: "seqNo"
})

export const projectKeys = Object.freeze({
    traceToEdge: "traceToEdge"
    , traceToInV: "traceToInV"
    , connectorInEdge: "connectorInEdge"
    , tracer: "tracer"
})

export class GremlinInvoke {

    commandBuffer: string
    constructor(nested?: boolean) {
        if (! nested) {
            this.commandBuffer = "g"
        } else {
            this.commandBuffer = ''
        }
    }

    call(method: string, ...values: any[]) {
        if (this.commandBuffer !== '') {
            this.commandBuffer = this.commandBuffer.concat(".")
        }
        this.commandBuffer = this.commandBuffer.concat(method, "(")
        if (values !== undefined) {
            values.forEach( (value: string | number | boolean | GremlinInvoke, index: number) => {
                if (index !== 0) this.commandBuffer = this.commandBuffer.concat(", ")
                if (value instanceof GremlinInvoke) {
                    this.commandBuffer = this.commandBuffer.concat(value.command())
                } else {
                    this.commandBuffer = this.commandBuffer.concat(JSON.stringify(value))
                }
            })
        }
        this.commandBuffer = this.commandBuffer.concat(")")
        return this
    }

    outE(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("outE", ...values)
    }
    property(...values: any[]) {
        return this.call("property", ...values)
    }
    as(alias: string) {
        return this.call("as", alias)
    }
    select(key: string) {
        return this.call("select", key)
    }

    command() {
        return this.commandBuffer
    }
}

export const submit = (commandOrObject: string | GremlinInvoke) => {
    let command = ''
    if (commandOrObject instanceof GremlinInvoke) {
        command = commandOrObject.command()
    } else {
        command = commandOrObject
    }

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
