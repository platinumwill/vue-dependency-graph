import * as sentenceManager from "@/composables/sentenceManager"

export function vertexAlias(word: sentenceManager.ModifiedSpacyToken) {
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
})

export const projectKeys = Object.freeze({
    traceToEdge: "traceToEdge"
    , traceToInV: "traceToInV"
    , connectorInEdge: "connectorInEdge"
    , tracer: "tracer"
})

export class GremlinInvoke {

    commandBuffer: string
    constructor(nested: boolean) {
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
            values.forEach( (value, index) => {
                if (index !== 0) this.commandBuffer = this.commandBuffer.concat(", ")
                this.commandBuffer = this.commandBuffer.concat(JSON.stringify(value))
            })
        }
        this.commandBuffer = this.commandBuffer.concat(")")
        return this
    }
    nest(method: string, ...nested: any[]) {
        if (this.commandBuffer !== '') {
            this.commandBuffer = this.commandBuffer.concat(".")
        }
        this.commandBuffer = this.commandBuffer.concat(method, "(")
        if (nested !== undefined) {
            nested.forEach( (value, index) => {
                if (index !== 0) this.commandBuffer = this.commandBuffer.concat(", ")
                this.commandBuffer = this.commandBuffer.concat(value)
            })
        }
        this.commandBuffer = this.commandBuffer.concat(")")
        return this
    }

    command() {
        return this.commandBuffer
    }
}