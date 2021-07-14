import axios from 'axios'

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
        function appendAddPropertyCommand(name, value) {
            return ".property('" + name + "', " + JSON.stringify(value) + ")" 
        }
        function singleQuotedVectorAlias(word) {
            return "'" + word.selectedMorphologyInfoType + word.indexInSentence + "'"
        }

        let command = "g"
        const sourcePatternBeginningAlias = "sourceBeginning"
        selectedWords.forEach( (word, index) => {
            command = command.concat(".addV(", JSON.stringify(word.selectedMorphologyInfoType), ")")
            command = command.concat(".as(", singleQuotedVectorAlias(word), ")")
            if (index === 0) {
                command += ".as('" + sourcePatternBeginningAlias + "')"
                command += appendAddPropertyCommand('isBeginning', true)
                command += appendAddPropertyCommand('owner', 'Chin')
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
            let startVName = singleQuotedVectorAlias(startWord)
            let quotedEndVName = undefined
            if (isDependencyPlaceholder(arc, selectedWords)) { // 這個 dependency 後面連著連接處
                const quotedConnectorVName = "'connector_" + arc.trueStart + "-" + arc.trueEnd + "'"
                quotedEndVName = quotedConnectorVName
                command += ".addV('Connector').as(" + quotedConnectorVName + ")"
            } else {
                const endWord = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                quotedEndVName = singleQuotedVectorAlias(endWord)
            }
            command += ".addE('" + arc.label + "').from(" + startVName + ").to(" + quotedEndVName + ")"
        })
        
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
        let argument = {
            gremlin: command
        }
        axios.post('http://stanford-local:8182/', JSON.stringify(argument)).then(function(response) {
            const result = response.data.result
            console.log(result.data)
            const targetPatterBeginPieceVId = result.data['@value'][0]['@value'].id
            console.log(targetPatterBeginPieceVId)
        }).catch(function(error) {
            console.log(error)
        })
    }


    return {
        selectionHelper: {
            isDependencyPlaceholder: isDependencyPlaceholder
            , saveSelectedPattern: saveSelectedPattern
        }
    }
}