import { ref, watch } from 'vue'
import { ModifiedSpacyDependency, ModifiedSpacyElement, ModifiedSpacyToken } from "@/composables/sentenceManager"
import { GremlinInvoke } from '@/composables/gremlinManager'
import * as gremlinManager from "@/composables/gremlinManager"

export type TargetPattern = {
    dialogPieces: {
        pieces: any
        , removePiece: Function
        , addFixedTextPiece: Function
        , revertPieces: Function
        , isPatternNew: Function
        , queryOrGenerateDefaultPieces: Function
    }
    , selection: {
        selected: any
        , clearSelection: Function
        , options: LinearTargetPattern[]
        , clearOptions: Function
        , reloadOptions: Function
    }
    , process: {
        save: Function
    }
    , token: ModifiedSpacyToken
}

export function prepareTargetPattern (token: ModifiedSpacyToken) {

    const selectedTargetPattern = ref<LinearTargetPattern | undefined>(undefined)
    let dialogPiecesModified = false

    watch(selectedTargetPattern, (newValue: any, oldValue) => {
        if (dialogPiecesModified) {
            dialogPiecesModified = false
            if (oldValue != undefined) {
                return
            }
        }
        renewDialogPieces(token)
    })

    const dialogPieces = ref<LinearTargetPatternPiece[]>([])

    watch(dialogPieces, (newValue, oldValue) => {
        dialogPiecesModified = true
        setSelectedTargetPatternByDialog()
    })
    watch(dialogPieces.value, (newValue, oldValue) => {
        dialogPiecesModified = true
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
        dialogPieces.value.push(_createTargetPatternPiece(undefined, dialogPieces.value))
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
        token: ModifiedSpacyToken
        , showingDialog: boolean
        ) {
        if (selectedTargetPattern.value && showingDialog) return
        const defaultTargetPatternSamplePieces = _generateDefaultTargetPattern(token)
        setSelectedTargetPatternByPieces(defaultTargetPatternSamplePieces)
        renewDialogPieces(token, defaultTargetPatternSamplePieces)
    }

    function setSelectedTargetPatternByDialog() {
        setSelectedTargetPatternByPieces(dialogPieces.value)
    }
    function setSelectedTargetPatternByPieces(patternPieces: LinearTargetPatternPiece[]) {
        const defaultTargetPatternSample = new LinearTargetPattern(patternPieces)
        const matchOption = targetPatternOptions.value.find( tp => {return tp.piecesEqual(defaultTargetPatternSample) })
        selectedTargetPattern.value = matchOption
    }

    function renewDialogPieces(
        token: ModifiedSpacyToken
        , defaultTargetPatternPieces?: LinearTargetPatternPiece[]
        ) {

        let tempDialogPieces: LinearTargetPatternPiece[] = []

        if (selectedTargetPattern.value != undefined) {
            tempDialogPieces = _duplicateTargetPattern(selectedTargetPattern.value)
        } else if (defaultTargetPatternPieces != undefined) {
            tempDialogPieces = defaultTargetPatternPieces
        } else {
            tempDialogPieces = _generateDefaultPieces(token)
        }

        dialogPieces.value.splice(0, dialogPieces.value.length, ...tempDialogPieces)
        patternDialogTargetPatternPiecesForRevert.splice(
            0
            ,patternDialogTargetPatternPiecesForRevert.length
            , ...tempDialogPieces
        )
    }

    async function reloadTargetPatternOptions(sourcePatternBeginningId: number) {
        const result: LinearTargetPattern[] = await _reloadMatchingTargetPatternOptions(
            sourcePatternBeginningId
            , token
            , targetPatternOptions.value
            )
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
        return _processTargetPatternStoring(dialogPieces.value, gremlinInvoke)
    }

    return {
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
        , token: token
    }

}

export class LinearTargetPattern {
    $pieces: LinearTargetPatternPiece[] = []

    get dropdownOptionLabel() {
        let result = ''
        this.$pieces.forEach( (piece, index) => {
            if (index !== 0) result += '-'
            if (piece.source == undefined) result += 'text'
            if (piece.source instanceof ModifiedSpacyToken) result += piece.source.tag
            if (piece.source instanceof ModifiedSpacyDependency) {
                if (piece.source.isPlaceholder) result += '{'
                result += piece.source.label.toLowerCase()
                if (piece.source.isPlaceholder) result += '}'
            }
        })
        return result
    }

    get pieces() {
        return this.$pieces
    }
    set pieces(pieces: LinearTargetPatternPiece[]) {
        this.$pieces = pieces
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

export class LinearTargetPatternPiece {

    source?: ModifiedSpacyElement
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

    constructor(source?: ModifiedSpacyElement) {
        this.source = source
    }

    get isPlaceholder () {
        if (this.source instanceof ModifiedSpacyDependency) return this.source.isPlaceholder
        return false
    }

    get displayText () {
        if (
            this.source instanceof ModifiedSpacyDependency
            && this.source.isPlaceholder
            ) return "{" + this.source.label + " 連接處}"
        return this.appliedText
    }
    
    get content () {
        if (this.source instanceof ModifiedSpacyToken) return this.source.tag + " (" + this.source.lemma + ")"
        if (this.source instanceof ModifiedSpacyDependency) return this.source.label
        return "TEXT" // fixed text 
    }

    get type () {
        if (this.source instanceof ModifiedSpacyToken) return LinearTargetPatternPiece.types.token
        if (this.source instanceof ModifiedSpacyDependency) return LinearTargetPatternPiece.types.dependency
        return LinearTargetPatternPiece.types.text
    }

    get vueKey () {
        if (this.specifiedVuekey == undefined && this.source != undefined) return this.source.vueKey
        return this.specifiedVuekey
    }

    get sortOrder () {
        if (this.source instanceof ModifiedSpacyToken) return this.source.indexInSentence
        if (this.source instanceof ModifiedSpacyDependency) return (this.source.trueStart + this.source.trueEnd) / 2
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
        if (this.source instanceof ModifiedSpacyToken 
            && anotherPiece.source instanceof ModifiedSpacyToken
        ) {
            if (! (anotherPiece.source instanceof ModifiedSpacyToken)) return false
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
        if (this.source instanceof ModifiedSpacyDependency 
            && anotherPiece.source instanceof ModifiedSpacyDependency
        ) {
            return (this.source.label == anotherPiece.source.label)
        }
        return result
    }
}

export type TargetPatternPieceAppliedTextPair = {
    piece: LinearTargetPatternPiece
    , value: string
}

function _createTargetPatternPiece(piece?: LinearTargetPatternPiece, targetPatternPieces?: LinearTargetPatternPiece[], appliedText?: string) {
    if (piece == undefined && targetPatternPieces == undefined) {
        const error = '傳入參數都是 undefined，這樣是錯的'
        throw error
    }
    let source = undefined
    if (piece != undefined) {
        appliedText = piece.appliedText
        source = piece.source
    }
    const tempPiece = new LinearTargetPatternPiece(source)
    tempPiece.appliedText = appliedText
    if (piece && piece?.specifiedVuekey) {
        tempPiece.specifiedVuekey = piece.specifiedVuekey
    } else if (source == undefined && targetPatternPieces != undefined) {
        tempPiece.specifiedVuekey = 'fixed-' + targetPatternPieces.filter(item => item.type === LinearTargetPatternPiece.types.text).length
    }
    return tempPiece
}

function _duplicateTargetPattern(targetPattern: LinearTargetPattern) {
    const pieces: LinearTargetPatternPiece[] = []
    targetPattern.pieces.forEach( piece => {
        pieces.push(_createTargetPatternPiece(piece, targetPattern.pieces))
    })
    console.log('pieces: ', pieces)
    return pieces
}

function _generateDefaultTargetPattern (token: ModifiedSpacyToken) {
    const defaultPieces = _generateDefaultPieces(token)
    return defaultPieces
}

function _generateDefaultPieces (
    token: ModifiedSpacyToken
    ) {

    const segmentPieces: LinearTargetPatternPiece[] = []

    token.segmentTokens.forEach((selectedWord) => {
        const piece = new LinearTargetPatternPiece(selectedWord)
        segmentPieces.push(piece)
    })
    token.segmentDeps.forEach((selectedArc) => {
        const piece = new LinearTargetPatternPiece(selectedArc)
        segmentPieces.push(piece)
    })

    segmentPieces.sort(function(a, b) {
        return a.sortOrder - b.sortOrder
    })

    return segmentPieces
}

function _processTargetPatternStoring(segmentPieces: LinearTargetPatternPiece[], gremlinInvoke: GremlinInvoke) {
    console.log('gremlin invoke: ', gremlinInvoke)
    // save target pattern
    let lastAddedPieceAlias: string
    segmentPieces.forEach((piece, pieceIdx) => {
        const currentPieceAlias = 'v' + pieceIdx
        gremlinInvoke = gremlinInvoke
        .call("addV", gremlinManager.vertexLabels.linearTargetPattern)
        .call("property", gremlinManager.propertyNames.isPlaceholder, piece.isPlaceholder)
        if (piece.appliedText != undefined) {
            gremlinInvoke.property(gremlinManager.propertyNames.appliedText, piece.appliedText)
        }
        gremlinInvoke.as(currentPieceAlias)
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
        if (piece.source != undefined) {
            gremlinInvoke
            .call("addE", gremlinManager.edgeLabels.traceTo)
            .call("from", currentPieceAlias)
        }
        if (piece.source instanceof ModifiedSpacyDependency) {
            // 和 dependency 的關連
            gremlinInvoke.property(gremlinManager.edgePropertyNames.traceToInDep, true)
            if (piece.source.sourcePatternEdgeId != undefined) { // 如果 source pattern 是既有的的狀況
                gremlinInvoke.call(
                    "to"
                    , new gremlinManager.GremlinInvoke()
                    .call("E", piece.source.sourcePatternEdgeId)
                    .call("inV")
                )
            } else {
                if (piece.source.isPlaceholder) {
                    gremlinInvoke.call("to", gremlinManager.connectorAlias(piece.source))
                } else {
                    gremlinInvoke.call("to", gremlinManager.vertexAlias(piece.source.endToken))
                }
            }
        }
        if (piece.source instanceof ModifiedSpacyToken) {
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

export function _reloadMatchingTargetPatternOptions (
    sourcePatternBeginningId: number
    , token: ModifiedSpacyToken
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
                , gremlinManager.projectKeys.appliedText
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
            ).call(
                "by"
                , new gremlinManager.GremlinInvoke(true)
                    .call(
                        'choose'
                        , new gremlinManager.GremlinInvoke(true).has(gremlinManager.propertyNames.appliedText)
                        , new gremlinManager.GremlinInvoke(true).values(gremlinManager.propertyNames.appliedText)
                        , new gremlinManager.GremlinInvoke(true).constant('')
                    )
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
                        targetPatternPiece = _createTargetPatternPiece(undefined, targetPattern.$pieces, projectedMapArray[9])
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
                        if (element != undefined && element == gremlinManager.edgePropertyNames.traceToInDep) {
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
                        const tracedDependency = findDependencyByPatternEdgeId(depEdgeId, token)
                        targetPatternPiece = new LinearTargetPatternPiece(tracedDependency)
                    } else {
                        if (tracedVertexId != undefined) {
                            const tracedToken = findTokenByPatternVertexId(tracedVertexId, token)
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

export const findDependencyByPatternEdgeId = (sourceEdgeId: string, token: ModifiedSpacyToken): ModifiedSpacyDependency => {
    const result = token.segmentDeps.find( dependency => {
        return dependency.sourcePatternEdgeId == sourceEdgeId
    })
    if (result != undefined) return result
    const error = "source pattern edge 記錄有問題"
    console.error(error)
    throw error
}

export const findTokenByPatternVertexId = (sourceVertexId: number, token: ModifiedSpacyToken): ModifiedSpacyToken => {
    const result = token.segmentTokens.find( token => {
        return token.sourcePatternVertexId == sourceVertexId
    })
    if (result != undefined) return result
    const error = "source pattern vertex 記錄有問題"
    console.error(error, 'source vertex id: ', sourceVertexId, ' not found in tokens')
    throw error
}
