import { ComputedRef, ref } from 'vue'
import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinUtils from "@/composables/gremlinManager"

export function clearSelection(selectedSourcePattern: any) {
    selectedSourcePattern.value = undefined
}

export function clearOptions(sourcePatternOptions: any) {
    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
}

export function isSourcePatternNew(selectedSourcePattern: any) {
    return selectedSourcePattern.value == undefined
}

class SourcePatternOption {
    id: number
    label: string

    constructor(id: number, label: string) {
        this.id = id
        this.label = label
    }
}

export default function(currentSentence: ComputedRef<sentenceManager.ModifiedSpacySentence>) {

    const selectedSourcePattern = ref<SourcePatternOption | undefined>(undefined)
    
    const processSelectedSourcePatternStoring = (gremlinInvoke: gremlinUtils.GremlinInvoke) => {
        const selectedWords = currentSentence.value.selectedTokens
        const selectedArcs = currentSentence.value.selectedDependencies
        if (selectedSourcePattern.value != undefined && selectedSourcePattern.value.id != undefined) {
            gremlinInvoke = gremlinInvoke
            .call("V", selectedSourcePattern.value.id)
            .call("as", gremlinUtils.aliases.sourcePatternBeginning)
            return gremlinInvoke
        }
        selectedWords.forEach( (word) => {
            gremlinInvoke = gremlinInvoke
                .call("addV", gremlinUtils.vertexLabels.sourcePattern)
            word.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
                gremlinInvoke = gremlinInvoke.call("property", morphInfoType.name, word[morphInfoType.propertyInWord])
            })
            gremlinInvoke = gremlinInvoke.call("as", gremlinUtils.vertexAlias(word))
            if (word.isBeginning) {
                gremlinInvoke = gremlinInvoke
                .call("as", gremlinUtils.aliases.sourcePatternBeginning)
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })
        selectedArcs.forEach( (arc) => {
            const startWord = selectedWords.find( word => word.indexInSentence == arc.trueStart )
            if (startWord === undefined
                || startWord.selectedMorphologyInfoTypes.length === 0
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            let startVName = gremlinUtils.vertexAlias(startWord)
            let endVName = undefined
            if (arc.isPlaceholder) { // 這個 dependency 後面連著連接處
                const connectorVName = gremlinUtils.connectorAlias(arc)
                endVName = connectorVName
                gremlinInvoke = gremlinInvoke
                .call("addV", gremlinUtils.vertexLabels.sourcePattern)
                .call("property", gremlinUtils.propertyNames.isConnector, true)
                .call("as", connectorVName)
            } else {
                const endWord: sentenceManager.ModifiedSpacyToken | undefined = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                endVName = gremlinUtils.vertexAlias(endWord)
            }
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
        })
        return gremlinInvoke
    }
    return {
        sourcePatternManager: {
            selection: {
                selectedPattern: selectedSourcePattern
                , save: processSelectedSourcePatternStoring
            }
        }
    }
}
