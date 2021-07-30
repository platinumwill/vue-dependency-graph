import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinManager from "@/composables/gremlinManager"
import gremlinApi, * as gremlinUtil from "@/composables/api/gremlin-api"

export class LinearTargetPatternPiece {

    source: sentenceManager.ModifiedSpacyElement
    appliedText?: string
    specifiedVuekey?: string

    static types = Object.freeze({
        token: {
            caption: "Token"
            , name: "token"
            , isToken: true
        }
        , dependency: {
            caption: "Dependency"
            , name: "dependency"
        }
        , text: {
            caption: "Text"
            , name: "text"
            , isText: true
        }
    })

    constructor(source: sentenceManager.ModifiedSpacyElement) {
        this.source = source
    }

    get isPlaceholder () {
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return this.source.isPlaceholder
        return false
    }

    get displayText () {
        if (
            this.source instanceof sentenceManager.ModifiedSpacyDependency
            && this.source.isPlaceholder
            ) return "{" + this.source.label + " 連接處}"
        return this.appliedText
    }
    
    get content () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return this.source.tag + " (" + this.source.lemma + ")"
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return this.source.label
        return "TEXT" // fixed text 
    }

    get type () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return LinearTargetPatternPiece.types.token
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return LinearTargetPatternPiece.types.dependency
        return LinearTargetPatternPiece.types.text
    }

    get vueKey () {
        if (this.specifiedVuekey == undefined) return this.source.vueKey
        return this.specifiedVuekey
    }

    get sortOrder () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return this.source.indexInSentence
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return (this.source.trueStart + this.source.trueEnd) / 2
        const error: string = "不應該執行到這裡"
        throw error
    }

}

export function queryOrGenerateDefaultPieces (currentSpacySentence: sentenceManager.ModifiedSpacySentence, targetPatternPieces: any[], targetPatternPiecesForRevert: any[]) {
    console.log(currentSpacySentence)

    const segmentPieces: LinearTargetPatternPiece[] = []

    const selectedWords = currentSpacySentence.words.filter((word) => {
        return word.selectedMorphologyInfoTypes.length > 0
    })
    selectedWords.forEach((selectedWord) => {
        const piece = new LinearTargetPatternPiece(selectedWord)
        segmentPieces.push(piece)
    })
    currentSpacySentence.arcs.filter((arc) => {
        return arc.selected
    }).forEach((selectedArc) => {
        const piece = new LinearTargetPatternPiece(selectedArc)
        segmentPieces.push(piece)
    })

    segmentPieces.sort(function(a, b) {
        return a.sortOrder - b.sortOrder
    })
    targetPatternPieces.splice(0, targetPatternPieces.length, ...segmentPieces)
    targetPatternPiecesForRevert.splice(
        0
        ,targetPatternPiecesForRevert.length
        , ...segmentPieces
    )
}

export const processTargetPatternStoring = (segmentPieces: LinearTargetPatternPiece[], gremlinInvoke: any) => {
    // save target pattern
    let lastAddedPieceAlias: string
    segmentPieces.forEach((piece, pieceIdx) => {
        const currentPieceAlias = 'v' + pieceIdx
        gremlinInvoke = gremlinInvoke
        .call("addV", gremlinManager.vertexLabels.linearTargetPattern)
        .call("as", currentPieceAlias)
        if (lastAddedPieceAlias) {
            gremlinInvoke = gremlinInvoke
            .call("addE", gremlinManager.edgeLabels.follows)
            .call("to", lastAddedPieceAlias)
        } else {
            gremlinInvoke = gremlinInvoke
            .call("addE", gremlinManager.edgeLabels.applicable)
            .call("to", gremlinManager.aliases.sourcePatternBeginning)
        }
        // 建立和 source 的關連
        if (piece.source instanceof sentenceManager.ModifiedSpacyDependency) {
            // 和 dependency 的關連
            gremlinInvoke
            .call("addE", gremlinManager.edgeLabels.traceToInDep)
            .call("from", currentPieceAlias)
            if (piece.source.sourcePatternEdgeId != undefined) { // 如果 source pattern 是既有的的狀況
                gremlinInvoke.nest(
                    "to"
                    , new gremlinUtil.GremlinInvoke()
                    .call("E", piece.source.sourcePatternEdgeId)
                    .call("inV")
                    .command
                )
            } else {
                gremlinInvoke.call("to", gremlinManager.connectorAlias(piece.source))
            }
        }
        if (piece.source instanceof sentenceManager.ModifiedSpacyToken) {
            gremlinInvoke
            .call("addE", gremlinManager.edgeLabels.traceTo)
            .call("from", currentPieceAlias)
            if (piece.source.sourcePatternVertexId != undefined) {
                gremlinInvoke.nest(
                    "to"
                    , new gremlinUtil.GremlinInvoke(true)
                    .call("V", piece.source.sourcePatternVertexId)
                    .command
                )
            } else {
                gremlinInvoke.call("to", gremlinManager.vertexAlias(piece.source))
            }
        }
        // TODO 處理和 source VERTEX 的關連
        lastAddedPieceAlias = currentPieceAlias
    })
    return gremlinInvoke
}

class LinearTargetPattern {
    id: string
    label: string

    constructor(id: string, label: string) {
        this.id = id
        this.label = label
    }
}

export const reloadMatchingTargetPatternOptions = (sourcePatternBeginningId: number, targetPatternOptions: any) => {
    targetPatternOptions.value.splice(0, targetPatternOptions.value.length)

    const gremlinCommand = new gremlinUtil.GremlinInvoke()
    .call("V", sourcePatternBeginningId)
    .call("in", "applicable")
    .command
    return new Promise( (resolve, reject) => {
        gremlinApi(gremlinCommand).then( (resultData) => {
            resultData['@value'].forEach( (targetPatternBeginning: any) => {
                const id = targetPatternBeginning['@value'].id['@value']
                const label = targetPatternBeginning['@value'].label + '-' + targetPatternBeginning['@value'].id['@value']
                targetPatternOptions.value.push(new LinearTargetPattern(id, label))
            })
            resolve(resultData)
        }).catch( (error) => {
            reject(error)
        })
    })
}
