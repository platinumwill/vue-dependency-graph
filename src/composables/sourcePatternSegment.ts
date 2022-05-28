import { ModifiedSpacyDependency, ModifiedSpacyElement, ModifiedSpacyToken } from "@/composables/sentenceManager";
import { Ref, ref } from 'vue'
import { GremlinInvoke, aliases, vertexAlias, vertexLabels, propertyNames, connectorAlias, edgeLabels, submit } from "@/composables/gremlinManager";

export class SourcePatternOption {
    id: number
    dropdownOptionLabel: string

    constructor(id: number, dropdownOptionLabel: string) {
        this.id = id
        this.dropdownOptionLabel = dropdownOptionLabel
    }
}

export function prepareSegment(token: ModifiedSpacyToken) {
    const selectedSourcePattern = ref<SourcePatternOption | undefined>(undefined)
    const sourcePatternOptions = ref<SourcePatternOption[]>([])
    
    const processSelectedSourcePatternStoring = (gremlinInvoke: GremlinInvoke) => {
        // 如果 source pattern 下拉選單已經有值（表示資料庫裡已經有目前選取的 source pattern），就不必儲存 source pattern
        if (selectedSourcePattern.value != undefined && selectedSourcePattern.value.id != undefined) {
            gremlinInvoke = gremlinInvoke
            .call("V", selectedSourcePattern.value.id)
            .call("as", aliases.sourcePatternBeginning)
            return gremlinInvoke
        }
        const elements: ModifiedSpacyElement[] = []
        elements.push(...token.segmentTokens)
        elements.push(...token.segmentDeps)
        // token 和 dependency 拼在一起是為了要順序的資料
        elements.sort( (e1, e2) => { return e1.indexInSentence - e2.indexInSentence})
        elements.forEach( (ele, index) => {
            if (! (ele instanceof ModifiedSpacyToken)) return

            const word = ele
            gremlinInvoke.call("addV", vertexLabels.sourcePattern)
            gremlinInvoke.property(propertyNames.seqNo, index + 1)
            word.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
                gremlinInvoke = gremlinInvoke.call("property", morphInfoType.name, word[morphInfoType.propertyInWord])
            })
            gremlinInvoke.as(vertexAlias(word))
            if (word.isBeginning) {
                gremlinInvoke = gremlinInvoke
                .as(aliases.sourcePatternBeginning)
                // TODO 這一行不確定還需不需要
                .property("isBeginning", true)
                .property("owner", "Chin")
            }
        })
        elements.forEach( (ele, index) => {
            if (! (ele instanceof ModifiedSpacyDependency)) return

            const arc = ele
            const startWord = token
            if (startWord === undefined
                || startWord.selectedMorphologyInfoTypes.length === 0
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            const startVName = vertexAlias(startWord)
            let endVName = undefined
            if (arc.isPlaceholder) { // 這個 dependency 後面連著連接處 (=假想的連接對象），也就是沒有連著 token
                const connectorVName = connectorAlias(arc)
                endVName = connectorVName
                gremlinInvoke = gremlinInvoke
                .addV(vertexLabels.sourcePattern)
                .property(propertyNames.isConnector, true)
                .as(connectorVName)
            } else { // 不是 placeholder ，也就是連接著 token
                endVName = vertexAlias(arc.selectedEndToken)
            }
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
            .property(propertyNames.seqNo, index + 1)
        })
        return gremlinInvoke
    }

    const reloadOptions = () => {
        return _reloadMatchingSourcePatternOptions(sourcePatternOptions, token)
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

const _reloadMatchingSourcePatternOptions = (
    sourcePatternOptions: Ref<SourcePatternOption[]>
    , beginWord: ModifiedSpacyToken) => {

    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
    if (! beginWord) {
        return new Promise( (resolve) => {
            resolve(undefined)
        })
    }
    let gremlinCommand = new GremlinInvoke().call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    gremlinCommand = gremlinCommand.call("inE", edgeLabels.applicable)
    .call("inV")
    .call("dedup")
    return new Promise((resolve, reject) => {
        submit(gremlinCommand).then( (resultData: any) => {
            resultData['@value'].forEach( (sourcePatternBeginning: any) => {
                sourcePatternOptions.value.push({
                    id: sourcePatternBeginning['@value'].id['@value']
                    , dropdownOptionLabel: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                })
            })
            resolve(resultData)
        }).catch ( function(error) {
            console.error(error)
            reject(error)
        })
    })
}
