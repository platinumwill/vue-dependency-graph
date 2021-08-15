import { ComputedRef, Ref, ref } from 'vue'
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
    const sourcePatternOptions = ref<SourcePatternOption[]>([])
    
    const processSelectedSourcePatternStoring = (gremlinInvoke: gremlinUtils.GremlinInvoke) => {
        const selectedWords = currentSentence.value.selectedTokens
        const selectedArcs = currentSentence.value.selectedDependencies
        // 如果 source pattern 下拉選單已經有值（表示資料庫裡已經有目前選取的 source pattern），就不必儲存 source pattern
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
                // TODO 這一行不確定還需不需要
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

    const reloadOptions = () => {
        return reloadMatchingSourcePatternOptions(sourcePatternOptions, currentSentence.value)
    }

    const setSelectedSourcePatternDropdownValue = (id: any) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }

    return {
        sourcePatternManager: {
            selection: {
                selectedPattern: selectedSourcePattern
                , options: sourcePatternOptions
                , reloadOptions: reloadOptions
                , setAsSelected: setSelectedSourcePatternDropdownValue
            }
            , process: {
                save: processSelectedSourcePatternStoring
            }
        }
    }
}

export type SourcePatternManager = {
    selection: {
        selectedPattern: any
        , options: any
        , save: any
        , reloadOptions: any
        , setAsSelected: any
    }
    , process: {
        save: Function
    }
}

// TODO 暫時把邏輯搬過來，可能還要再整理
const reloadMatchingSourcePatternOptions = (
    sourcePatternOptions: Ref<SourcePatternOption[]>
    , currentSentence: sentenceManager.ModifiedSpacySentence) => {

    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
    const beginWord = currentSentence.findBeginWord()
    if (! beginWord) {
        return new Promise( (resolve) => {
            resolve(undefined)
        })
    }
    let gremlinCommand = new gremlinUtils.GremlinInvoke().call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    gremlinCommand = gremlinCommand.call("inE", 'applicable')
    .call("inV")
    .call("dedup")
    return new Promise((resolve, reject) => {
        gremlinUtils.submit(gremlinCommand).then( (resultData: any) => {
            resultData['@value'].forEach( (sourcePatternBeginning: any) => {
                sourcePatternOptions.value.push({
                    id: sourcePatternBeginning['@value'].id['@value']
                    , label: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                })
            })
            resolve(resultData)
        }).catch ( function(error) {
            console.error(error)
            reject(error)
        })
    })
}
