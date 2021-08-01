import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinManager from "@/composables/gremlinManager"
import gremlinApi from "@/composables/api/gremlin-api"

export class LinearTargetPatternPiece {

    source: sentenceManager.ModifiedSpacyElement
    appliedText?: string
    specifiedVuekey?: string
    mappedGraphVertexId?: string

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
        .call("property", gremlinManager.propertyNames.isPlaceholder, piece.isPlaceholder)
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
            .call("addE", gremlinManager.edgeLabels.traceTo)
            .call("from", currentPieceAlias)
            if (piece.source.sourcePatternEdgeId != undefined) { // 如果 source pattern 是既有的的狀況
                gremlinInvoke.nest(
                    "to"
                    , new gremlinManager.GremlinInvoke(false)
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
                    , new gremlinManager.GremlinInvoke(true)
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
    // id: string
    // label: string
    pieces: LinearTargetPatternPiece[] = []

    get label() {
        return this.pieces[0].mappedGraphVertexId
    }

    constructor() {
        // this.id = id
        // this.label = label
    }
}

// TODO currentSpaceSentence 希望可以拿掉
export const reloadMatchingTargetPatternOptions = (sourcePatternBeginningId: number, currentSpacySentence: sentenceManager.ModifiedSpacySentence) => {

    const gremlinCommand = new gremlinManager.GremlinInvoke(false)
    .call("V", sourcePatternBeginningId)
    .call("in", "applicable")
    .nest("repeat", new gremlinManager.GremlinInvoke(true).call("__.in", gremlinManager.edgeLabels.follows).command())
    .nest("until", new gremlinManager.GremlinInvoke(true).call("__.in").call("count").call("is", 0).command())
    .call("limit", 20)
    .call("path")
    .call("by"
        , new gremlinManager.GremlinInvoke(true)
            .call(
                "project"
                , gremlinManager.projectKeys.traceToEdge
                , gremlinManager.projectKeys.traceToInV
                , gremlinManager.projectKeys.connectorInEdge
                , gremlinManager.projectKeys.tracer
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .call("outE", gremlinManager.edgeLabels.traceTo)
                    .call("elementMap")
                    .call("fold")
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .call("out", gremlinManager.edgeLabels.traceTo)
                    .call("elementMap")
                    .call("fold")
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .call("out", gremlinManager.edgeLabels.traceTo)
                    .call("inE")
                    .nest("hasLabel"
                        , new gremlinManager.GremlinInvoke(true).call(
                            "without"
                            , gremlinManager.edgeLabels.traceTo
                            , gremlinManager.edgeLabels.applicable
                        ).command()
                    ).call("elementMap")
                    .call("fold")
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .call("outE", gremlinManager.edgeLabels.traceTo)
                    .call("outV")
                    .call("elementMap")
                    .call("fold")
            )
        )
    console.log("reloading matching target pattern, gremlin: ", gremlinCommand)
    return new Promise( (resolve, reject) => {
        const targetPatternOptions: LinearTargetPattern[] = []
        gremlinManager.submit(gremlinCommand).then( (resultData: any) => {
            resultData['@value'].forEach( (targetPatternPath: any) => {
                const targetPattern = new LinearTargetPattern()
                console.log('path: ', targetPatternPath['@value'].objects['@value'])
                const path: any[] = targetPatternPath['@value'].objects['@value'] // pathArray[0] 是 source pattern beginning
                // 一個 path 就是一條 LinearTargetPattern
                path.forEach(projected => { // 一個元素內含一個 target pattern piece 的相關資料，例如 source pattern 和之間的 edge
                    let targetPatternPiece = undefined

                    const projectedMapArray = projected['@value']
                    console.log('projected: ', projectedMapArray)
                    const projectedTraceToEdge = projectedMapArray[1]['@value']
                    if (projectedTraceToEdge.length <= 0) return
                    console.log('projected traceToEdge elementMap: ', projectedTraceToEdge)
                    const foldedTraceToEdgeElementMap = projectedTraceToEdge[0]['@value']
                    console.log('traceToEdge: ', foldedTraceToEdgeElementMap)
                    const foldedTraceToInVElementMapArray = projectedMapArray[3]['@value'][0]['@value']
                    console.log('traceToInV: ', foldedTraceToInVElementMapArray)
                    const foldedTracerElementMapArray = projectedMapArray[7]['@value'][0]['@value']
                    console.log('tracer itself: ', foldedTracerElementMapArray)

                    const foldedTraceToInVInDependencyElementMapArrayWrapper = projectedMapArray[5]['@value']
                    let foldedTraceToInVInDependencyElementMapArray: any[] = []
                    if (foldedTraceToInVInDependencyElementMapArrayWrapper.length > 0) {
                        foldedTraceToInVInDependencyElementMapArray = foldedTraceToInVInDependencyElementMapArrayWrapper[0]['@value']
                    }
                    console.log('traceToInV in dependency: ', foldedTraceToInVInDependencyElementMapArray)

                    // 取得 source pattern vertex id
                    let sourcePatternVId = undefined
                    let isPlaceholder = undefined
                    let tracerVertexId = undefined
                    let tracedVertexId = undefined
                    foldedTraceToInVElementMapArray.forEach( (element: any, index: number) => {
                        if (element['@value'] != undefined) {
                            if (element['@value'] == 'id') {
                                sourcePatternVId = foldedTraceToInVElementMapArray[index + 1]['@value']
                            }
                        }
                    })
                    foldedTracerElementMapArray.forEach( (element: any, index: number) => {
                        if (element['@value'] != undefined) {
                            if (element['@value'] == 'id') {
                                tracerVertexId = foldedTracerElementMapArray[index + 1]['@value']
                                console.log('tracer v id: ', tracerVertexId)
                            }
                        } else {
                            if (element == gremlinManager.propertyNames.isPlaceholder) {
                                isPlaceholder = foldedTracerElementMapArray[index + 1]
                            }
                        }
                    })
                    foldedTraceToInVElementMapArray.forEach( (element: any, index: number) => {
                        if (element['@value'] != undefined) {
                            if (element['@value'] == 'id') {
                                tracedVertexId = foldedTraceToInVElementMapArray[index + 1]['@value']
                            }
                        }
                    })
                    // 處理 target pattern vertex 是 placeholder 的狀況
                    if (isPlaceholder) {
                        let depEdgeId: string = ''
                        let depEdgeLabel = undefined
                        foldedTraceToInVInDependencyElementMapArray.forEach( (element: any, index: number) => {
                            if (element['@value'] != undefined) {
                                if (element['@value'] == 'id') {
                                    depEdgeId = foldedTraceToInVInDependencyElementMapArray[index + 1]['@value'].relationId
                                    console.log('dep edge id: ', depEdgeId)
                                }
                                if (element['@value'] == 'label') {
                                    depEdgeLabel = foldedTraceToInVInDependencyElementMapArray[index + 1]
                                    console.log('dep edge label: ', depEdgeLabel)
                                }
                            }
                        })
                        const tracedDependency = sentenceManager.findDependencyByPatternEdgeId(depEdgeId, currentSpacySentence)
                        targetPatternPiece = new LinearTargetPatternPiece(tracedDependency)
                    } else {
                        if (tracedVertexId != undefined) {
                            const tracedToken = sentenceManager.findTokenByPatternVertexId(tracedVertexId, currentSpacySentence)
                            targetPatternPiece = new LinearTargetPatternPiece(tracedToken)
                        }
                    }
                    if (targetPatternPiece != undefined) {
                        targetPatternPiece.mappedGraphVertexId = tracerVertexId
                        targetPattern.pieces.push(targetPatternPiece)
                    }
                })
                targetPatternOptions.push(targetPattern)
            })
            resolve(targetPatternOptions)
        }).catch( (error) => {
            reject(error)
        })
    })
}
