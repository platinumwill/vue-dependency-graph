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
})
