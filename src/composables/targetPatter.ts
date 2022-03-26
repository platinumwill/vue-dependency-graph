
export default function(currentSentence: ComputedRef<sentenceManager.ModifiedSpacySentence>) {

    const selectedTargetPattern = ref<LinearTargetPattern | undefined>(undefined)
    let dialogPiecesModified = false

    watch(selectedTargetPattern, (newValue: any, oldValue) => {
        if (dialogPiecesModified) {
            dialogPiecesModified = false
            if (oldValue != undefined) {
                return
            }
        }
        renewDialogPieces(currentSentence.value)
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
        const matchOption = targetPatternOptions.value.find( tp => {return tp.piecesEqual(defaultTargetPatternSample) })
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