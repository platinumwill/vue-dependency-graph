import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

const vertexLabels = Object.freeze({
    targetPattern: "SimpleTargetPatternPiece"
})
const edgeLabels = Object.freeze({
    applicable: 'applicable'
    , follows: 'follows'
})
const aliases = Object.freeze({
    sourcePatternBeginning: "sourcePatternBeginning"
})

export default function selectionManager() {

    const isDependencyPlaceholder = (arc, selectedWords) => {
        const startConnected = (selectedWords.find( word => word.indexInSentence == arc.trueStart) !== undefined)
        const endConnected = (selectedWords.find( word => word.indexInSentence == arc.trueEnd) !== undefined)
        if (startConnected && !endConnected) {
            return true
        }
        return false
    }

    const saveSelectedPattern = (selectedWords, selectedArcs, segmentPieces) => {
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()

        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        gremlinInvoke = processSelectedNewSourcePatternStoring(selectedWords, selectedArcs, gremlinInvoke)
        gremlinInvoke = processTargetPatternStoring(segmentPieces, gremlinInvoke)

        console.log(gremlinInvoke.command)
        gremlinApi(gremlinInvoke.command)
        .then((resultData) => {
            const targetPatterBeginPieceVId = resultData['@value'][0]['@value'].id['@value']
            console.log('Target Pattern Begin Piece Id: ', targetPatterBeginPieceVId)
            return targetPatterBeginPieceVId
        }).then((targetPatterBeginPieceVId) => {
            gremlinApi(
                new gremlinUtils.GremlinInvoke()
                .call('V', targetPatterBeginPieceVId)
                .call('out', edgeLabels.applicable)
                .command
            )
            .then((resultData) => {
                console.log(resultData)
            })
        }).catch(function(error) {
            console.log(error)
        })
    }
    const processSelectedNewSourcePatternStoring = (selectedWords, selectedArcs, gremlinInvoke) => {
        function vertexAlias(word) {
            return word.selectedMorphologyInfoType + word.indexInSentence
        }

        selectedWords.forEach( (word) => {
            gremlinInvoke = gremlinInvoke
                .call("addV", word.selectedMorphologyInfoType)
                .call("property", word.selectedMorphologyInfoType, word.tag)
                .call("as", vertexAlias(word))
            if (word.beginningMorphologyInfoType !== undefined) {
                gremlinInvoke = gremlinInvoke
                .call("as", aliases.sourcePatternBeginning)
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })
        selectedArcs.forEach( (arc) => {
            const startWord = selectedWords.find( word => word.indexInSentence == arc.trueStart )
            if (startWord === undefined
                || startWord.selectedMorphologyInfoType === undefined 
                || startWord.selectedMorphologyInfoType === ''
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            let startVName = vertexAlias(startWord)
            let endVName = undefined
            if (isDependencyPlaceholder(arc, selectedWords)) { // 這個 dependency 後面連著連接處
                const connectorVName = "connector_" + arc.trueStart + "-" + arc.trueEnd
                endVName = connectorVName
                gremlinInvoke = gremlinInvoke
                .call("addV", "Connector")
                .call("as", connectorVName)
            } else {
                const endWord = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                endVName = vertexAlias(endWord)
            }
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
        })
        return gremlinInvoke
    }
    const processTargetPatternStoring = (segmentPieces, gremlinInvoke) => {
        // save target pattern
        let lastAddedPieceAlias
        let firstPieceAlias = undefined
        segmentPieces.forEach((piece, pieceIdx) => {
            const currentPieceAlias = 'v' + pieceIdx
            if (pieceIdx === 0) firstPieceAlias = currentPieceAlias
            gremlinInvoke = gremlinInvoke
            .call("addV", vertexLabels.targetPattern)
            .call("property", "sourceType", piece.type)
            .call("as", currentPieceAlias)
            if (lastAddedPieceAlias) {
                gremlinInvoke = gremlinInvoke
                .call("addE", edgeLabels.follows)
                .call("to", lastAddedPieceAlias)
            } else {
                gremlinInvoke = gremlinInvoke
                .call("addE", edgeLabels.applicable)
                .call("to", aliases.sourcePatternBeginning)
            }
            lastAddedPieceAlias = currentPieceAlias
        })
        gremlinInvoke = gremlinInvoke
        .call("select", firstPieceAlias)
        return gremlinInvoke
    }

    return {
        patternHelper: {
            isDependencyPlaceholder: isDependencyPlaceholder
            , saveSelectedPattern: saveSelectedPattern
        }
    }
}
