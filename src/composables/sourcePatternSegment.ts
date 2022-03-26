import { ModifiedSpacyDependency, ModifiedSpacyElement, ModifiedSpacySentence, ModifiedSpacyToken } from "@/composables/sentenceManager";
import { ComputedRef, Ref, ref } from 'vue'
import { GremlinInvoke, aliases, vertexAlias, vertexLabels, propertyNames, connectorAlias, edgeLabels, submit } from "@/composables/gremlinManager";
import { MorphologyInfo, morphologyInfoTypeEnum, morphologyInfoUnknownValuePostfix } from "@/composables/morphologyInfo"
import { SourcePatternManager, SourcePatternSegmentSelection } from "./sourcePatternManager";

class SourcePatternOption {
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

let $toggling = false

const _toggleMorphologyInfoSelection = (morphologyInfo: MorphologyInfo, selection: SourcePatternSegmentSelection) => {
    const word = morphologyInfo.token
    // 如果 morphology info 是 UNKNOWN，就不繼續動作
    if (word[morphologyInfo.type.propertyInWord].endsWith(morphologyInfoUnknownValuePostfix)) return

    $toggling = true

    const selectedArcs = word.segmentDeps
    if (selectedArcs.length > 0) { // 如果有選 dependency
        if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
            return (selectedArc.trueStart === morphologyInfo.token.indexInSentence || selectedArc.trueEnd === morphologyInfo.token.indexInSentence)
        }).length <= 0) return // 就不要選取
    }
    // 執行 toggle
    if (word.selectedMorphologyInfoTypes.includes(morphologyInfo.type)) { // toggle off
        word.unmarkMorphologyInfoAsSelected(morphologyInfo.type)
        word.sourcePatternVertexId = undefined
        if (! word.selectedMorphologyInfoTypes.length) {
            word.isBeginning = false
        }
        // 重新檢查然後標記每個 token 的 begin
        // 然後再針對每個 begin token 處理 source pattern
        // 這些要在新的 segment manager 做
    } else { // toggle on
        word.markMorphologyInfoAsSelected(morphologyInfo.type)
    }
    selection.reloadOptions().then( () => {
        _findExistingMatchSourcePatternAndSetDropdown(word, selection)
    })        
}

const _findExistingMatchSourcePatternAndSetDropdown = (
    beginWord: ModifiedSpacyToken
    , selection: SourcePatternSegmentSelection
    ) => {

    if (! beginWord) return
    const selectedArcsFromBegin = beginWord.segmentDeps
    let gremlinInvoke = new GremlinInvoke()
    .call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    if (selectedArcsFromBegin.length) {
        gremlinInvoke.where(
            new GremlinInvoke(true)
            .outE()
            .count()
            .is(new GremlinInvoke(true).eq(selectedArcsFromBegin.length))
        )
    }
    const arcSum = new Map();
    selectedArcsFromBegin.forEach( (selectedArc) => {
        if ( arcSum.has(selectedArc.label) ) {
            arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
        } else {
            arcSum.set(selectedArc.label, 1)
        }
        // 目前暫時支援查詢到第 1 層的 edge 和隨後的 vertex。如果要再支搜查詢到更後面的線和端，就要用遞迴了
        if (selectedArc.endToken && selectedArc.endToken?.selectedMorphologyInfoTypes.length > 0) {
            // 非 connector 的狀況
            const endToken = selectedArc.endToken
            const endTokenCriteria = new GremlinInvoke(true).out(selectedArc.label)
            Object.values(morphologyInfoTypeEnum).forEach( (morphInfoType, index) => {
                const endTokenPropertyCriteria = new GremlinInvoke(true)
                if (endToken.selectedMorphologyInfoTypes.includes(morphInfoType)) {
                    endTokenPropertyCriteria.has(morphInfoType.name, endToken[morphInfoType.propertyInWord])
                } else {
                    endTokenPropertyCriteria.hasNot(morphInfoType.name)
                }
                const whereOrAnd = index === 0 ? 'where' : 'and'
                endTokenCriteria.call(whereOrAnd, endTokenPropertyCriteria)
            })
            gremlinInvoke.where(endTokenCriteria)
        } else {
            // connector 的狀況
            gremlinInvoke.where(
                new GremlinInvoke(true)
                .out(selectedArc.label)
                .where(new GremlinInvoke(true).has(propertyNames.isConnector, true))
                .count()
                .is(new GremlinInvoke(true).eq(1))
            )
        }
    })
    arcSum.forEach( (value, key) => {
        gremlinInvoke.call(
            "and"
            , new GremlinInvoke(true)
            .call("outE", key)
            .call("count")
            .call("is", new GremlinInvoke(true).gte(value))
        )
    })
    submit(gremlinInvoke).then( (resultData: any) => {
        if (resultData['@value'].length === 0) {
            selection.setAsSelected(undefined)
            return
        }
        const sourcePatternBeginningId = resultData['@value'][0]['@value'].id['@value']
        selection.setAsSelected(sourcePatternBeginningId)
    })
}
