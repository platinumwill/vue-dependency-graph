import { ModifiedSpacyToken } from "./sentenceManager";
import { ComputedRef } from 'vue'

export function prepareSegment(token: ComputedRef<ModifiedSpacyToken>) {
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
        const elements: sentenceManager.ModifiedSpacyElement[] = []
        elements.push(...selectedWords)
        elements.push(...selectedArcs)
        // token 和 dependency 拼在一起是為了要順序的資料
        elements.sort( (e1, e2) => { return e1.indexInSentence - e2.indexInSentence})
        elements.forEach( (ele, index) => {
            if (! (ele instanceof sentenceManager.ModifiedSpacyToken)) return

            const word = ele
            gremlinInvoke.call("addV", gremlinUtils.vertexLabels.sourcePattern)
            gremlinInvoke.property(gremlinUtils.propertyNames.seqNo, index + 1)
            word.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
                gremlinInvoke = gremlinInvoke.call("property", morphInfoType.name, word[morphInfoType.propertyInWord])
            })
            gremlinInvoke.call("as", gremlinUtils.vertexAlias(word))
            if (word.isBeginning) {
                gremlinInvoke = gremlinInvoke
                .call("as", gremlinUtils.aliases.sourcePatternBeginning)
                // TODO 這一行不確定還需不需要
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })
        elements.forEach( (ele, index) => {
            if (! (ele instanceof sentenceManager.ModifiedSpacyDependency)) return

            const arc = ele
            const startWord = selectedWords.find( word => word.indexInSentence == arc.trueStart )
            if (startWord === undefined
                || startWord.selectedMorphologyInfoTypes.length === 0
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            const startVName = gremlinUtils.vertexAlias(startWord)
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
            .property(gremlinUtils.propertyNames.seqNo, index + 1)
        })
        return gremlinInvoke
    }

    const reloadOptions = () => {
        return reloadMatchingSourcePatternOptions(sourcePatternOptions, currentSentence.value)
    }

    const clearOptions = () => {
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
    }

    const setSelectedSourcePatternDropdownValue = (id: any) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }

    function isSourcePatternNew() {
        return selectedSourcePattern.value == undefined
    }

    return {
        sourcePatternManager: {
            selection: {
                selectedPattern: selectedSourcePattern
                , options: sourcePatternOptions
                , reloadOptions: reloadOptions
                , setAsSelected: setSelectedSourcePatternDropdownValue
                , clearOptions: clearOptions
            }
            , process: {
                save: processSelectedSourcePatternStoring
            }
            , status: {
                isSourcePatternNew: isSourcePatternNew
            }
        }
    }
}
