import { ComputedRef, Ref, ref } from 'vue'
import * as sentenceManager from "@/composables/sentenceManager"
import * as gremlinUtils from "@/composables/gremlinManager"

export function clearSelection(selectedSourcePattern: any) {
    selectedSourcePattern.value = undefined
}

export function clearOptions(sourcePatternOptions: any) {
    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
}

class SourcePatternOption {
    id: number
    dropdownOptionLabel: string

    constructor(id: number, dropdownOptionLabel: string) {
        this.id = id
        this.dropdownOptionLabel = dropdownOptionLabel
    }
}

export default function(currentSentence: ComputedRef<sentenceManager.ModifiedSpacySentence>) {

    const selectedSourcePattern = ref<SourcePatternOption | undefined>(undefined)
    const sourcePatternOptions = ref<SourcePatternOption[]>([])
    
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
            , status: {
                isSourcePatternNew: isSourcePatternNew
            }
        }
    }
}

export type SourcePatternSegmentSelection = {
    selectedPattern: any
    , options: any
    , reloadOptions: any
    , setAsSelected: any
    , clearOptions: Function
}

export type SourcePatternManager = {
    selection: SourcePatternSegmentSelection
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
// TODO convert to aws = done
    let gremlinCommand = new gremlinUtils.GremlinInvoke().call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    gremlinCommand = gremlinCommand.call("inE", gremlinUtils.edgeLabels.applicable)
    .call("inV")
    .call("dedup")
    return new Promise((resolve, reject) => {
        gremlinUtils.submit(gremlinCommand).then( (resultData: any) => {
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
