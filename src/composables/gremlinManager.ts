import * as sentenceManager from "@/composables/sentenceManager"
import axios from "axios"

export function vertexAlias(word: sentenceManager.ModifiedSpacyToken | undefined) {
    if (word == undefined) {
        const error = '程式控制有問題，不應該執行到這裡'
        throw error
    }
    return 'sourceV-' + word.indexInSentence
}

export function connectorAlias(dependency: sentenceManager.ModifiedSpacyDependency) {
    return "connector_" + dependency.trueStart + "-" + dependency.trueEnd
}

export const vertexLabels = Object.freeze({
    linearTargetPattern: "LinearTargetPatternPiece"
    , sourcePattern: "SourcePatternPiece"
    , document: "Document"
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
    , content: 'content'
    , parse: 'parse'
    , id: 'id'
    , appliedText: 'appliedText'
})
export enum edgePropertyNames {
    traceToInDep = "traceToInDep"
}

export const projectKeys = Object.freeze({
    traceToEdge: "traceToEdge"
    , traceToInV: "traceToInV"
    , connectorInEdge: "connectorInEdge"
    , tracer: "tracer"
    , appliedText: "appliedText"
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

    V(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("V", ...values)
    }
    addV(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("addV", ...values)
    }
    valueMap(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("valueMap", ...values)
    }
    out(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("out", ...values)
    }
    outE(...values: string[] | number[] | boolean[] | GremlinInvoke[]) {
        return this.call("outE", ...values)
    }
    property(...values: any[]) {
        return this.call("property", ...values)
    }
    values(...values: any[]) {
        return this.call("values", ...values)
    }
    constant(...values: any[]) {
        return this.call("constant", ...values)
    }
    has(...values: any[]) {
        return this.call("has", ...values)
    }
    hasNot(...values: any[]) {
        return this.call("hasNot", ...values)
    }
    as(alias: string) {
        return this.call("as", alias)
    }
    select(key: string) {
        return this.call("select", key)
    }
    eq(value: number) {
        return this.call("eq", value)
    }
    gte(value: number) {
        return this.call("gte", value)
    }
    lt(value: number) {
        return this.call("lt", value)
    }
    where(value: GremlinInvoke) {
        return this.call("where", value)
    }
    and(value: GremlinInvoke) {
        return this.call("and", value)
    }
    not(value: GremlinInvoke) {
        return this.call("not", value)
    }
    is(value: GremlinInvoke) {
        return this.call("is", value)
    }
    count() {
        return this.call("count")
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

    const argument = {
        gremlin: command
    }
    return new Promise((resolve, reject) => {
        axios.post('http://janusgraph-server:8182/', JSON.stringify(argument)).then(function(response) {
            const result = response.data.result
            resolve(result.data)
        }).catch(function(error) {
            console.error(error)
            reject(error)
        })
    })
}

export const valueKey = '@value'
export const keys = {
    value: '@value'
    , properties: 'properties'
    , id: 'id'
}

export const isConnector = async (id: number) => {
    let keyValueList: any = undefined
    let resultData = undefined
    await loadValueMap(id).then( (returnedResultData: any) => {
        resultData = returnedResultData
    })
    if (resultData == undefined) return Promise.resolve(undefined)
    
    let result = false
    keyValueList = resultData[valueKey][0][valueKey]
    keyValueList.forEach( (ele: any, index: number) => {
        if (propertyNames.isConnector == ele) {
            result = keyValueList[index + 1][valueKey][0]
            return
        }
    })
    return Promise.resolve(result)
}

export const loadValueMap = async (id: number) => {
    const command: GremlinInvoke = new GremlinInvoke().V(id).valueMap()
    let result = undefined
    await submit(command).then( (resultData) => {
        result = resultData
    })
    return Promise.resolve(result)
}