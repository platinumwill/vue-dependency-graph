import { ref } from 'vue'
import axios from 'axios'

export default function selectionManager() {
    const selectedPOSs = ref([])
    const selectedLemmas = ref([])
    const selectedDependencies = ref([])

    const togglePOSSelected = (posIndex) => {
        const indexOfPOS = selectedPOSs.value.indexOf(posIndex)
        if (indexOfPOS >= 0) {
            selectedPOSs.value.splice(indexOfPOS, 1)
        } else {
            selectedPOSs.value.push(posIndex)
        }
        if (selectedLemmas.value.indexOf(posIndex) >= 0) {
            selectedLemmas.value.splice(selectedLemmas.value.indexOf(posIndex), 1)
        }
    }
    const toggleLemmaSelected = (lemmaIndex) => {
        const indexOfLemma = selectedLemmas.value.indexOf(lemmaIndex)
        if (indexOfLemma >= 0) {
            selectedLemmas.value.splice(indexOfLemma, 1)
        } else {
            selectedLemmas.value.push(lemmaIndex)
        }
        if (selectedPOSs.value.indexOf(lemmaIndex) >= 0) {
            selectedPOSs.value.splice(indexOfLemma, 1)
        }
    }
    const toggleDependencySelected = (dependencyIndex) => {
        const indexOfDependency = selectedDependencies.value.indexOf(dependencyIndex)
        if (indexOfDependency >= 0) {
            selectedDependencies.value.splice(indexOfDependency, 1)
        } else {
            selectedDependencies.value.push(dependencyIndex)
        }
    }

    const isDependencyPlaceholder = (dependency) => {
        console.log(dependency)
        const startConnected = (selectedPOSs.value.indexOf(dependency.trueStart) >= 0) || (selectedLemmas.value.indexOf(dependency.trueStart) >= 0)
        const endConnected = (selectedPOSs.value.indexOf(dependency.trueEnd) >= 0) || (selectedLemmas.value.indexOf(dependency.trueEnd) >= 0)
        if (startConnected && !endConnected) {
            return true
        }
        return false
    }

    const saveSelectedPattern = (sentenceParse, segmentPieces) => {
        function appendAddPropertyCommand(name, value) {
            return ".property('" + name + "', " + JSON.stringify(value) + ")" 
        }

        let command = "g"
        let vCount = 0
        selectedPOSs.value.forEach(function (posIndex) {
            command += ".addV('POS').as('pos_" + posIndex + "')"
            if (vCount === 0) {
                command += ".as('sourceBeginning')"
                command += appendAddPropertyCommand('isBeginning', true)
                command += appendAddPropertyCommand('owner', 'Chin')
            }
            const token = sentenceParse.words[posIndex]
            console.log(token)
            vCount++
        })
        selectedLemmas.value.forEach(function (lemmaIndex){
            command += ".addV('Lemma').as('lemma_" + lemmaIndex + "')"
            if (vCount === 0) {
                command += ".as('sourceBeginning')"
                command += appendAddPropertyCommand('isBeginning', true)
                command += appendAddPropertyCommand('owner', 'Chin')
            }
            const token = sentenceParse.words[lemmaIndex]
            console.log(token)
            vCount++
        })
        selectedDependencies.value.forEach(function (dependencyIndex) {
            const dependency = sentenceParse.arcs[dependencyIndex]
            let startVPrefix = undefined
            if (selectedPOSs.value.includes(dependency.trueStart)) {
                startVPrefix = "pos_"
            } else if (selectedLemmas.value.includes(dependency.trueStart)) {
                startVPrefix = "lemma_"
            } else {
                const error = "dependency 起點沒被選取"
                console.error(error)
                throw error
            }
            let startVName = startVPrefix + dependency.trueStart
            let endVName = undefined
            const connectorVName = "connector_" + dependency.trueStart + "-" + dependency.trueEnd + ""
            if (isDependencyPlaceholder(dependency)) {
                command += ".addV('Connector').as('" + connectorVName + "')"
                endVName = connectorVName
            } else if (selectedPOSs.value.includes(dependency.trueEnd)) {
                endVName = "pos_" + dependency.trueEnd
            } else if (selectedLemmas.value.includes(dependency.trueEnd)) {
                endVName = "lemma_" + dependency.trueEnd
            }
            command += ".addE('" + dependency.label + "').from('" + startVName + "').to('" + endVName + "')"
            
        })
        
        let lastAddedPieceAlias
        segmentPieces.forEach((piece, pieceIdx) => {
            const currentPieceAlias = 'v' + pieceIdx
            command += ".addV('SimpleTargetPatternPiece').property('sourceType', '" + piece.type + "').as('" + currentPieceAlias + "')"
            if (lastAddedPieceAlias) {
                command += ".addE('follows').to('" + lastAddedPieceAlias + "')"
            } else {
                command += ".addE('applicable').to('sourceBeginning')"
            }
            lastAddedPieceAlias = currentPieceAlias
        });
        console.log(command)
        let argument = {
            gremlin: command
        }
        axios.post('http://stanford-local:8182/', JSON.stringify(argument)).then(function(response) {
            console.log(response)
            console.log(response.status)
            console.log(response.data)
        }).catch(function(error) {
            console.log(error)
        })
    }


    return {
        posSelectionManager: {
            selections: selectedPOSs.value
            , toggler: togglePOSSelected
        }
        , lemmaSelectionManager: {
            selections: selectedLemmas.value
            , toggler: toggleLemmaSelected
        }
        , dependencySelectionManager: {
            selections: selectedDependencies.value
            , toggler: toggleDependencySelected
        }
        , selectionHelper: {
            isDependencyPlaceholder: isDependencyPlaceholder
            , saveSelectedPattern: saveSelectedPattern
        }
    }
}