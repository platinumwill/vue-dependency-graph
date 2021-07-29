import * as sentenceManager from "@/composables/sentenceManager"

export function vertexAlias(word: sentenceManager.ModifiedSpacyToken) {
    return 'sourceV-' + word.indexInSentence
}
export const vertexLabels = Object.freeze({
    linearTargetPattern: "LinearTargetPatternPiece"
    , sourcePattern: "SourcePatternPiece"
    , connector: 'Connector'
})
export const edgeLabels = Object.freeze({
    applicable: 'applicable'
    , follows: 'follows'
})
export const aliases = Object.freeze({
    sourcePatternBeginning: "sourcePatternBeginning"
})
