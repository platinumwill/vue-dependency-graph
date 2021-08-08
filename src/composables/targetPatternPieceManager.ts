import { ref, watch } from 'vue'
import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinManager from "@/composables/gremlinManager"

// TODO 想要把 selectedTargetPattern 拿掉
export default function() {

    const selectedTargetPatternValue: LinearTargetPattern | undefined = undefined
    const selectedTargetPattern = ref(selectedTargetPatternValue)

    // TODO 這裡是不是其實不需要 watch？
    watch(selectedTargetPattern, (newValue: any, oldValue) => {
        console.log('watching target pattern change: ', newValue, oldValue)

        if (newValue == undefined || newValue.id == undefined) return

        const targetPatternBeginnningVertexId = newValue.id
        const gremlinInvoke = 
        new gremlinManager.GremlinInvoke()
        .call("V", targetPatternBeginnningVertexId)
        .call("repeat", new gremlinManager.GremlinInvoke(true).call("out"))
        .call("until", new gremlinManager.GremlinInvoke(true).call("out").call("count").call("is", 0))
        .call("limit", 20)
        .call("path")
        console.log(gremlinInvoke.command)
        gremlinManager.submit(gremlinInvoke).then( (resultData) => {
            console.log('query target pattern result: ', resultData)
            // const piece = new LinearTargetPatternPiece(LinearTargetPatternPiece.types.token)
            // console.log('piece type: ', piece.type)
            // console.log('piece type compare: ', piece.type === LinearTargetPatternPiece.types.token)
        })
    })
    function clearTargetPatternSelection() {
        selectedTargetPattern.value = undefined
    }
    function clearTargetPatternOptions() {
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
    }

    const targetPatternOptionsValue: LinearTargetPattern[] = []
    const targetPatternOptions = ref(targetPatternOptionsValue)

    const pieces: LinearTargetPatternPiece[] = []
    const targetPatternPieces = ref(pieces)
    const targetPatternPiecesForRevert: LinearTargetPatternPiece[] = []

    function addFixedTextPiece() {
        const fixedTextPiece = new LinearTargetPatternPiece()
        fixedTextPiece.specifiedVuekey = 'fixed-' + targetPatternPieces.value.filter(item => item.type === LinearTargetPatternPiece.types.text).length
        targetPatternPieces.value.push(fixedTextPiece)
    }

    function revertPieces() {
        targetPatternPieces.value.splice(
            0
            , targetPatternPieces.value.length
            , ...targetPatternPiecesForRevert
        )
        // applied text 可能也要清空
    }

    function queryOrGenerateDefaultPieces (
        currentSpacySentence: sentenceManager.ModifiedSpacySentence
        , targetPatternPieces: LinearTargetPatternPiece[]
        ) {
        _queryOrGenerateDefaultPieces(currentSpacySentence, targetPatternPieces, targetPatternPiecesForRevert)
    }

    function reloadTargetPatternOptions(sourcePatternBeginningId: number, currentSentence: sentenceManager.ModifiedSpacySentence) {
        return reloadMatchingTargetPatternOptions(sourcePatternBeginningId, currentSentence, targetPatternOptions.value)
    }

    return {
        targetPattern: {
            pieces: targetPatternPieces
            , piecesForRevert: targetPatternPiecesForRevert
            , queryOrGenerateDefaultPieces: queryOrGenerateDefaultPieces
            , addFixedTextPiece: addFixedTextPiece
            , revertPieces: revertPieces
            , selection: {
                selected: selectedTargetPattern
                , clearSelection: clearTargetPatternSelection
                , options: targetPatternOptions.value
                , clearOptions: clearTargetPatternOptions
                , reloadOptions: reloadTargetPatternOptions
            }
        }
    }

}

export class LinearTargetPatternPiece {

    source?: sentenceManager.ModifiedSpacyElement
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

    constructor(source?: sentenceManager.ModifiedSpacyElement) {
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
        if (this.specifiedVuekey == undefined && this.source != undefined) return this.source.vueKey
        return this.specifiedVuekey
    }

    get sortOrder () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return this.source.indexInSentence
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return (this.source.trueStart + this.source.trueEnd) / 2
        const error: string = "不應該執行到這裡"
        throw error
    }

    equalsForPattern(anotherPiece: LinearTargetPatternPiece): boolean {
        if (this.source == undefined || anotherPiece.source == undefined) {
            return this.source == undefined && anotherPiece.source == undefined
        }
        if (this.source.constructor.name != anotherPiece.source.constructor.name) return false

        let result = true
        if (this.source instanceof sentenceManager.ModifiedSpacyToken && anotherPiece.source instanceof sentenceManager.ModifiedSpacyToken) {
            if (! (anotherPiece.source instanceof sentenceManager.ModifiedSpacyToken)) return false
            const selfMorphologyInfoTypes = this.source.selectedMorphologyInfoTypes
            const anotherMorphInfoTypes = anotherPiece.source.selectedMorphologyInfoTypes
            selfMorphologyInfoTypes.forEach( morphInfoType => {
                if (! anotherMorphInfoTypes.includes(morphInfoType)) {
                    result = false
                    return
                }
            })
            anotherPiece.source.selectedMorphologyInfoTypes.forEach( morphologyInfoType => {
                if (! selfMorphologyInfoTypes.includes(morphologyInfoType)) {
                    result = false
                    return
                }
            })
        }
        return result
    }

}

function _queryOrGenerateDefaultPieces (
    currentSpacySentence: sentenceManager.ModifiedSpacySentence
    , targetPatternPieces: LinearTargetPatternPiece[] 
    , targetPatternPiecesForRevert: LinearTargetPatternPiece[]
    ) {

    const segmentPieces: LinearTargetPatternPiece[] = []

    // TODO 這裡用新的 API 來處理
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
    // TODO 還沒有實做查詢邏輯，查詢邏輯其實應該是和 options 比對
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
                gremlinInvoke.call(
                    "to"
                    , new gremlinManager.GremlinInvoke()
                    .call("E", piece.source.sourcePatternEdgeId)
                    .call("inV")
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
                gremlinInvoke.call(
                    "to"
                    , new gremlinManager.GremlinInvoke(true)
                    .call("V", piece.source.sourcePatternVertexId)
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

export class LinearTargetPattern {
    pieces: LinearTargetPatternPiece[] = []

    get label() {
        return this.pieces[0].mappedGraphVertexId
    }

    constructor() {
    }

    addPiece(piece: LinearTargetPatternPiece) {
        this.pieces.push(piece)
    }

    piecesEqual(pieces: LinearTargetPatternPiece[]): boolean {
        if (this.pieces.length !== pieces.length) return false

        let result = true
        this.pieces.forEach( (piece, index) => {
            if (! piece.equalsForPattern(pieces[index])) {
                result = false
                return
            }
        })
        return result
    }

}

// TODO currentSpaceSentence 希望可以拿掉
export function reloadMatchingTargetPatternOptions (
    sourcePatternBeginningId: number
    , currentSpacySentence: sentenceManager.ModifiedSpacySentence
    , targetPatternOptions: LinearTargetPattern[]) {

    targetPatternOptions.splice(0, targetPatternOptions.length)

    const gremlinCommand = new gremlinManager.GremlinInvoke()
    .call("V", sourcePatternBeginningId)
    .call("in", "applicable")
    .call("repeat", new gremlinManager.GremlinInvoke(true).call("__.in", gremlinManager.edgeLabels.follows))
    .call("until", new gremlinManager.GremlinInvoke(true).call("__.in").call("count").call("is", 0))
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
                    .call("hasLabel"
                        , new gremlinManager.GremlinInvoke(true).call(
                            "without"
                            , gremlinManager.edgeLabels.traceTo
                            , gremlinManager.edgeLabels.applicable
                        )
                    ).call("elementMap")
                    .call("fold")
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .outE(gremlinManager.edgeLabels.traceTo)
                    .call("outV")
                    .call("elementMap")
                    .call("fold")
            )
        )
    return new Promise( (resolve, reject) => {
        gremlinManager.submit(gremlinCommand).then( (resultData: any) => {
            resultData['@value'].forEach( (targetPatternPath: any) => {
                const targetPattern = new LinearTargetPattern()
                const path: any[] = targetPatternPath['@value'].objects['@value'] // pathArray[0] 是 source pattern beginning
                // 一個 path 就是一條 LinearTargetPattern
                path.forEach(projected => { // 一個元素內含一個 target pattern piece 的相關資料，例如 source pattern 和之間的 edge
                    let targetPatternPiece = undefined

                    const projectedMapArray = projected['@value']
                    const projectedTraceToEdge = projectedMapArray[1]['@value']
                    if (projectedTraceToEdge.length <= 0) return
                    const foldedTraceToEdgeElementMap = projectedTraceToEdge[0]['@value']
                    const foldedTraceToInVElementMapArray = projectedMapArray[3]['@value'][0]['@value']
                    const foldedTracerElementMapArray = projectedMapArray[7]['@value'][0]['@value']

                    const foldedTraceToInVInDependencyElementMapArrayWrapper = projectedMapArray[5]['@value']
                    let foldedTraceToInVInDependencyElementMapArray: any[] = []
                    if (foldedTraceToInVInDependencyElementMapArrayWrapper.length > 0) {
                        foldedTraceToInVInDependencyElementMapArray = foldedTraceToInVInDependencyElementMapArrayWrapper[0]['@value']
                    }

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
                                }
                                if (element['@value'] == 'label') {
                                    depEdgeLabel = foldedTraceToInVInDependencyElementMapArray[index + 1]
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
