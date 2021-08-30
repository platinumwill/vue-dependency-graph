import { ComputedRef, ref, watch } from 'vue'
import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinManager from "@/composables/gremlinManager"
import { GremlinInvoke } from '@/composables/gremlinManager'

// TODO 想要把 selectedTargetPattern 拿掉
export default function(currentSentence: ComputedRef<sentenceManager.ModifiedSpacySentence>) {

    const selectedTargetPattern = ref<LinearTargetPattern | undefined>(undefined)
    let dialogPiecesDragged = false

    watch(selectedTargetPattern, (newValue: any, oldValue) => {
        if (dialogPiecesDragged) {
            dialogPiecesDragged = false
            return
        }
        renewDialogPieces(currentSentence.value)
    })

    const dialogPieces = ref<LinearTargetPatternPiece[]>([])

    watch(dialogPieces, (newValue, oldValue) => {
        dialogPiecesDragged = true
        setSelectedTargetPatternByDialog()
    })

    function clearTargetPatternSelection() {
        selectedTargetPattern.value = undefined
    }
    function clearTargetPatternOptions() {
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
    }

    const targetPatternOptionsValue: LinearTargetPattern[] = []
    const targetPatternOptions = ref(targetPatternOptionsValue)

    const patternDialogTargetPatternPiecesForRevert: LinearTargetPatternPiece[] = []

    function addFixedTextPiece() {
        const fixedTextPiece = new LinearTargetPatternPiece()
        fixedTextPiece.specifiedVuekey = 'fixed-' + dialogPieces.value.filter(item => item.type === LinearTargetPatternPiece.types.text).length
        dialogPieces.value.push(fixedTextPiece)
    }

    function revertPieces() {
        dialogPieces.value.splice(
            0
            , dialogPieces.value.length
            , ...patternDialogTargetPatternPiecesForRevert
        )
        // applied text 可能也要清空
    }

    function queryOrGenerateDefaultPieces (
        currentSpacySentence: sentenceManager.ModifiedSpacySentence
        ) {
        const defaultTargetPatternSamplePieces = _generateDefaultTargetPattern(currentSpacySentence)
        setSelectedTargetPatternByPieces(defaultTargetPatternSamplePieces)
        renewDialogPieces(currentSpacySentence, defaultTargetPatternSamplePieces)
    }

    function setSelectedTargetPatternByDialog() {
        setSelectedTargetPatternByPieces(dialogPieces.value)
    }
    function setSelectedTargetPatternByPieces(patternPieces: LinearTargetPatternPiece[]) {
        const defaultTargetPatternSample = new LinearTargetPattern(patternPieces)
        let matchOption = targetPatternOptions.value.find( tp => {return tp.piecesEqual(defaultTargetPatternSample) })
        selectedTargetPattern.value = matchOption
    }

    function renewDialogPieces(
        currentSpacySentence: sentenceManager.ModifiedSpacySentence
        , defaultTargetPatternPieces?: LinearTargetPatternPiece[]
        ) {

        let tempDialogPieces: LinearTargetPatternPiece[] = []

        if (selectedTargetPattern.value != undefined) {
            tempDialogPieces = _duplicateTargetPattern(selectedTargetPattern.value)
        } else if (defaultTargetPatternPieces != undefined) {
            tempDialogPieces = defaultTargetPatternPieces
        } else {
            tempDialogPieces = _generateDefaultPieces(currentSpacySentence)
        }

        dialogPieces.value.splice(0, dialogPieces.value.length, ...tempDialogPieces)
        patternDialogTargetPatternPiecesForRevert.splice(
            0
            ,patternDialogTargetPatternPiecesForRevert.length
            , ...tempDialogPieces
        )
    }

    async function reloadTargetPatternOptions(sourcePatternBeginningId: number) {
        const result: LinearTargetPattern[] = await reloadMatchingTargetPatternOptions(sourcePatternBeginningId, currentSentence.value, targetPatternOptions.value)
        setSelectedTargetPatternByDialog()
        return result
    }

    function removePiece(piece: LinearTargetPatternPiece) {
        const index = dialogPieces.value.indexOf(piece)
        if (index < 0) return
        dialogPieces.value.splice(index, 1)
    }

    function isDialogPatternNew() {
        return selectedTargetPattern.value == undefined
    }

    function save(gremlinInvoke: GremlinInvoke) {
        return processTargetPatternStoring(dialogPieces.value, gremlinInvoke)
    }

    return {
        targetPattern: {
            dialogPieces: {
                pieces: dialogPieces
                , removePiece: removePiece
                , addFixedTextPiece: addFixedTextPiece
                , revertPieces: revertPieces
                , isPatternNew: isDialogPatternNew
                , queryOrGenerateDefaultPieces: queryOrGenerateDefaultPieces
            }
            , selection: {
                selected: selectedTargetPattern
                , clearSelection: clearTargetPatternSelection
                , options: targetPatternOptions.value
                , clearOptions: clearTargetPatternOptions
                , reloadOptions: reloadTargetPatternOptions
            }
            , process: {
                save: save
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
        // source 是 token 的比對邏輯
        if (this.source instanceof sentenceManager.ModifiedSpacyToken 
            && anotherPiece.source instanceof sentenceManager.ModifiedSpacyToken
        ) {
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
        // source 是 dependency 的比對邏輯
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency 
            && anotherPiece.source instanceof sentenceManager.ModifiedSpacyDependency
        ) {
            return (this.source.label == anotherPiece.source.label)
        }
        return result
    }

}

function _generateDefaultTargetPattern (currentSpacySentence: sentenceManager.ModifiedSpacySentence) {
    const defaultPieces = _generateDefaultPieces(currentSpacySentence)
    return defaultPieces
}

function _generateDefaultPieces (
    currentSpacySentence: sentenceManager.ModifiedSpacySentence
    ) {

    const segmentPieces: LinearTargetPatternPiece[] = []

    currentSpacySentence.selectedTokens.forEach((selectedWord) => {
        const piece = new LinearTargetPatternPiece(selectedWord)
        segmentPieces.push(piece)
    })
    currentSpacySentence.selectedDependencies.forEach((selectedArc) => {
        const piece = new LinearTargetPatternPiece(selectedArc)
        segmentPieces.push(piece)
    })

    segmentPieces.sort(function(a, b) {
        return a.sortOrder - b.sortOrder
    })

    return segmentPieces
}
function _duplicateTargetPattern(targetPattern: LinearTargetPattern) {
    const pieces: LinearTargetPatternPiece[] = []
    targetPattern.pieces.forEach( piece => {
        pieces.push(new LinearTargetPatternPiece(piece.source))
    })
    return pieces
}

export const processTargetPatternStoring = (segmentPieces: LinearTargetPatternPiece[], gremlinInvoke: GremlinInvoke) => {
    console.log('gremlin invoke: ', gremlinInvoke)
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
        gremlinInvoke
        .call("addE", gremlinManager.edgeLabels.traceTo)
        .call("from", currentPieceAlias)
        if (piece.source instanceof sentenceManager.ModifiedSpacyDependency) {
            // 和 dependency 的關連
            if (piece.source.sourcePatternEdgeId != undefined) { // 如果 source pattern 是既有的的狀況
                gremlinInvoke.call(
                    "to"
                    , new gremlinManager.GremlinInvoke()
                    .call("E", piece.source.sourcePatternEdgeId)
                    .call("inV")
                )
            } else {
                gremlinInvoke.property(gremlinManager.edgePropertyNames.traceToDep, true)
                if (piece.source.isPlaceholder) {
                    gremlinInvoke.call("to", gremlinManager.connectorAlias(piece.source))
                } else {
                    gremlinInvoke.call("to", gremlinManager.vertexAlias(piece.source.endToken))
                }
            }
        }
        if (piece.source instanceof sentenceManager.ModifiedSpacyToken) {
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
    $pieces: LinearTargetPatternPiece[] = []

    get label() {
        // 為了把數字轉換成文字所以這樣寫。不轉換成文字，Dropdown 會報錯
        return '' + this.$pieces[0].mappedGraphVertexId
    }

    get pieces() {
        return this.$pieces
    }

    constructor(patternPieces?: LinearTargetPatternPiece[]) {
        if (patternPieces != undefined) this.addPieces(patternPieces)
    }

    addPieces(pieces: LinearTargetPatternPiece | LinearTargetPatternPiece[]) {
        if (Array.isArray(pieces)) {
            this.$pieces.push(...pieces)
        } else {
            this.$pieces.push(pieces)
        }
    }

    piecesEqual(anotherPattern: LinearTargetPattern): boolean {
        if (this.$pieces.length !== anotherPattern.$pieces.length) return false

        let result = true
        this.$pieces.forEach( (piece: LinearTargetPatternPiece, index: number) => {
            if (! piece.equalsForPattern(anotherPattern.$pieces[index])) {
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
    return new Promise<LinearTargetPattern[]>( (resolve, reject) => {
        gremlinManager.submit(gremlinCommand).then( (resultData: any) => {
            resultData['@value'].forEach( (targetPatternPath: any) => {
                const targetPattern = new LinearTargetPattern()
                const path: any[] = targetPatternPath['@value'].objects['@value'] // pathArray[0] 是 source pattern beginning
                // 一個 path 就是一條 LinearTargetPattern
                path.forEach( (projected, index) => { // 一個元素內含一個 target pattern piece 的相關資料，例如 source pattern 和之間的 edge
                    if (index === 0) return // 第一個是 source pattern 的頭
                    let targetPatternPiece = undefined

                    const projectedMapArray = projected['@value']
                    const projectedTraceToEdge = projectedMapArray[1]['@value']
                    if (projectedTraceToEdge.length <= 0) {
                        // text piece
                        targetPatternPiece = new LinearTargetPatternPiece()
                        // TODO 這裡還要再抓 text 選項 (？)
                        targetPattern.addPieces(targetPatternPiece)
                        return
                    }
                    const foldedTraceToEdgeElementMapArray = projectedTraceToEdge[0]['@value']
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
                    let traceToDep = false
                    foldedTraceToEdgeElementMapArray.forEach( (element: any, index: number) => {
                        if (element != undefined && element == gremlinManager.edgePropertyNames.traceToDep) {
                            traceToDep = foldedTraceToEdgeElementMapArray[index + 1]
                        }
                    })
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
                    if (traceToDep) {
                        // target pattern piece 的 source 是 dependency 的處理邏輯
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
                        targetPattern.addPieces(targetPatternPiece)
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
