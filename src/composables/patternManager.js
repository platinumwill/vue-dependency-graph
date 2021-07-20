import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

const vertexType = Object.freeze({
    applicable: 'applicable'
    , follows: 'follows'
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
        function vertexAlias(word) {
            return word.selectedMorphologyInfoType + word.indexInSentence
        }
        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()
        const sourcePatternBeginningAlias = "sourceBeginning"
        selectedWords.forEach( (word) => {
            gremlinInvoke = gremlinInvoke
                .call("addV", word.selectedMorphologyInfoType)
                .call("property", word.selectedMorphologyInfoType, word.tag)
                .call("as", vertexAlias(word))
            if (word.beginningMorphologyInfoType !== undefined) {
                gremlinInvoke = gremlinInvoke
                .call("as", sourcePatternBeginningAlias)
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })

        let command = gremlinInvoke.command
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
            let startVName = "'" + vertexAlias(startWord) + "'"
            let quotedEndVName = undefined
            if (isDependencyPlaceholder(arc, selectedWords)) { // 這個 dependency 後面連著連接處
                const quotedConnectorVName = "'connector_" + arc.trueStart + "-" + arc.trueEnd + "'"
                quotedEndVName = quotedConnectorVName
                command += ".addV('Connector').as(" + quotedConnectorVName + ")"
            } else {
                const endWord = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                quotedEndVName = "'" + vertexAlias(endWord) + "'"
            }
            command += ".addE('" + arc.label + "').from(" + startVName + ").to(" + quotedEndVName + ")"
        })
        // save target pattern
        let lastAddedPieceAlias
        let firstPieceAlias = undefined
        segmentPieces.forEach((piece, pieceIdx) => {
            const currentPieceAlias = 'v' + pieceIdx
            if (pieceIdx === 0) firstPieceAlias = currentPieceAlias
            command += ".addV('SimpleTargetPatternPiece').property('sourceType', '" + piece.type + "').as('" + currentPieceAlias + "')"
            if (lastAddedPieceAlias) {
                command += ".addE('follows').to('" + lastAddedPieceAlias + "')"
            } else {
                command += ".addE('applicable').to('sourceBeginning')"
            }
            lastAddedPieceAlias = currentPieceAlias
        })
        command = command.concat(".select('", firstPieceAlias, "')")

        console.log(command)
        gremlinApi(command)
        .then((resultData) => {
            const targetPatterBeginPieceVId = resultData['@value'][0]['@value'].id['@value']
            console.log('Target Pattern Begin Piece Id: ', targetPatterBeginPieceVId)
            return targetPatterBeginPieceVId
        }).then((targetPatterBeginPieceVId) => {
            gremlinApi(
                new gremlinUtils.GremlinInvoke()
                .call('V', targetPatterBeginPieceVId)
                .call('out', vertexType.applicable)
                .command
            )
            .then((resultData) => {
                console.log(resultData)
            })
        }).catch(function(error) {
            console.log(error)
        })
    }


    return {
        patternHelper: {
            isDependencyPlaceholder: isDependencyPlaceholder
            , saveSelectedPattern: saveSelectedPattern
        }
    }
}