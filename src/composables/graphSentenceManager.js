import { ref } from 'vue'
import { useStore } from "vuex"
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

const morphologyInfoType = Object.freeze({
    pos: 'POS'
    , lemma: 'Lemma'
})

export default function() {
    
    const store = useStore()
    const spacyFormatSentences = ref([])
    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        const word = currentSentence().words[tokenIndex]
        if (word.selectedMorphologyInfoType === morphInfoType) {
            word.selectedMorphologyInfoType = undefined
        } else {
            word.selectedMorphologyInfoType = morphInfoType
        }
        updateBeginning()
        reloadMatchingSourcePatternOptions()
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        dependency.selected = !dependency.selected
        updateBeginning()
        reloadMatchingSourcePatternOptions()
    }
    const updateBeginning = () => {
        currentSentence().words.forEach( (word) => {
            word.beginningMorphologyInfoType = word.selectedMorphologyInfoType
            if (word.selectedMorphologyInfoType === undefined) {
                word.beginningMorphologyInfoType = undefined
                return
            }
            selectedArcs().forEach( (arc) => {
                if (arc.trueEnd === word.indexInSentence) {
                    word.beginningMorphologyInfoType = undefined
                    return
                }
            })
        })
    }

    const selectedSourcePattern = ref({})
    const sourcePatternOptions = ref([])
    const reloadMatchingSourcePatternOptions = () => {
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
        const beginWord = findBeginWord()
        if (! beginWord) {
            return
        }
        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V")
        .call("hasLabel", beginWord.beginningMorphologyInfoType)
        .call("inE", 'applicable')
        .call("inV")
        .command
        gremlinApi(gremlinCommand).then( (resultData) => {
            resultData['@value'].forEach( (sourcePatternBeginning) => {
                sourcePatternOptions.value.push({
                    id: sourcePatternBeginning['@value'].id['@value']
                    , label: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                })
            })
        })
    }

    const selectedTargetPattern = ref({})
    const targetPatternOptions = ref([])
    const selectedSourcePatternChanged = function(event) {
        reloadTargetPatternOptions(event.value.id)
        selectedTargetPattern.value = {}
        autoMarkSelectedPattern(event.value.id)
    }
    const reloadTargetPatternOptions = (sourcePatternBeginningId) => {
        targetPatternOptions.value.splice(0, sourcePatternOptions.value.length)

        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .call("in", "applicable")
        .command
        gremlinApi(gremlinCommand).then( (resultData) => {
            resultData['@value'].forEach( (targetPatternBeginning) => {
                targetPatternOptions.value.push({
                    id: targetPatternBeginning['@value'].id['@value'] 
                    , label: targetPatternBeginning['@value'].label + '-' + targetPatternBeginning['@value'].id['@value']
                })
            })
        })
    }
    const autoMarkSelectedPattern = (sourcePatternBeginningId) => {
        let gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .nest("repeat", new gremlinUtils.GremlinInvoke(true).call("outE").call("inV").command)
        .nest("until", new gremlinUtils.GremlinInvoke(true).call("outE").call("count").call("is", 0).command)
        .call("limit", 20)
        .call("path")
        .command
        gremlinApi(gremlinCommand).then( (resultData) => {
            console.log(resultData)
        })
    }

    const currentSentence = () => {
        return spacyFormatSentences.value[store.getters.currentSentenceIndex]
    }
    const selectedArcs = () => {
        return currentSentence().arcs.filter( (arc) => {
            return arc.selected
        })
    }
    const findBeginWord = () => {
        const beginWords = currentSentence().words.filter( (word) => {
            return word.beginningMorphologyInfoType !== undefined
        })
        if (beginWords.length <= 0) return undefined
        if (beginWords.length > 1) {
            const error = "begin word 超過一個，程式控制有問題"
            console.error(error)
            throw error
        }
        return beginWords[0]
    }

    return {
        spacyFormatSentences
        , toggleMorphologySelection
        , morphologyInfoType
        , toggleDependencySelection
        , sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
            , selectionChanged: selectedSourcePatternChanged
        }
        , targetPattern: {
            selected: selectedTargetPattern
            , options: targetPatternOptions.value
        }
    }
}
