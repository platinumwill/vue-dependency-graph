import { ref } from 'vue'
import { useStore } from "vuex"
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

const morphologyInfoType = Object.freeze({
    pos: 'POS'
    , lemma: 'Lemma'
})
// const vertextType = Object.freeze({
//     connector: 'Connector'
// })

export default function() {
    
    const store = useStore()
    const spacyFormatSentences = ref([])
    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        const sentence = currentSentence()
        const selectedArcs = sentence.arcs.filter( arc => arc.selected)
        if (selectedArcs.length > 0) { // 如果有選 dependency
            if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
                selectedArc.trueStart === tokenIndex || selectedArc.trueEnd === tokenIndex
            }).length <= 0) return // 就不要選取
        }
        // 執行選取
        const word = sentence.words[tokenIndex]
        if (word.selectedMorphologyInfoType === morphInfoType) {
            word.selectedMorphologyInfoType = undefined
            word.beginningMorphologyInfoType = undefined
            sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
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
        const beginWord = findBeginWord()
        currentSentence().words.forEach( (word) => {
            selectedArcs().forEach( (arc) => {
                if (arc.trueEnd === word.indexInSentence) {
                    word.beginningMorphologyInfoType = undefined
                    return
                }
            })
            if (beginWord) return
            word.beginningMorphologyInfoType = word.selectedMorphologyInfoType
            if (word.selectedMorphologyInfoType === undefined) {
                word.beginningMorphologyInfoType = undefined
                return
            }
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
        if (event.value == undefined) {
            clearSelectionAndMatching()
            return
        }
        const sourcePatternBeginningId = event.value.id
        const currentBeginWord = findBeginWord()
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId

        // clear

        // 處理 target pattern
        selectedTargetPattern.value = {}
        reloadTargetPatternOptions(sourcePatternBeginningId)

        autoMarkMatchingPattern(sourcePatternBeginningId)
    }
    const clearSelectionAndMatching = () => {
        const sentence = currentSentence()
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        sentence.arcs.forEach( arc => arc.selected = false)
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
    const autoMarkMatchingPattern = (sourcePatternBeginningId) => {
        let gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .nest("repeat", new gremlinUtils.GremlinInvoke(true).call("outE").call("inV").command)
        .nest("until", new gremlinUtils.GremlinInvoke(true).call("outE").call("count").call("is", 0).command)
        .call("limit", 20)
        .call("path")
        .command
        gremlinApi(gremlinCommand).then( (resultData) => {
            findBeginWord().sourcePatternVertexId = sourcePatternBeginningId
            resultData['@value'].forEach( (path) => {
                const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                const outELabel = path['@value'].objects['@value'][1]['@value'].label
                const outEId = path['@value'].objects['@value'][1]['@value'].id['@value']
                // const inVLabel = path['@value'].objects[2].label
                // const beginWordIndex = beginWord().indexInSentence
                const sentence = currentSentence()
                const matchingArc = sentence.arcs.find( (arc) => {
                    return (
                        sentence.words[arc.trueStart].sourcePatternVertexId === outVId
                        && arc.label === outELabel
                    )
                })
                matchingArc.selected = true // 不要用 selected
                matchingArc.sourcePatternEdgeId = outEId
            })
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
