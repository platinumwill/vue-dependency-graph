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
                return (selectedArc.trueStart === tokenIndex || selectedArc.trueEnd === tokenIndex)
            }).length <= 0) return // 就不要選取
        }
        // TODO 選取還是都要連起來比較保險
        // 執行 toggle
        const word = sentence.words[tokenIndex]
        if (word.selectedMorphologyInfoType === morphInfoType) { // toggle off
            word.selectedMorphologyInfoType = undefined
            word.beginningMorphologyInfoType = undefined
            word.sourcePatternVertexId = undefined
            if (findBeginWord.indexInSentence === tokenIndex) {
                sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
                targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
            }
        } else { // toggle on
            word.selectedMorphologyInfoType = morphInfoType
        }
        updateBeginning()
        reloadMatchingSourcePatternOptions()
        markExistingPattern()
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        dependency.selected = !dependency.selected
        updateBeginning()
        reloadMatchingSourcePatternOptions()
        markExistingPattern()
    }
    const updateBeginning = () => {
        currentSentence().words.forEach( (word) => {
            selectedArcs().forEach( (arc) => {
                if (arc.trueEnd === word.indexInSentence) { // 在 edge 尾巴的標成不是 begin
                    word.beginningMorphologyInfoType = undefined
                    return
                }
            })
            if (findBeginWord()) return
            word.beginningMorphologyInfoType = word.selectedMorphologyInfoType
        })
        if (! findBeginWord()) return
        if (findBeginWord().length > 1) { // 如果 begin word 超過 1 個
            currentSentence().words.forEach( (word) => {
                word.beginningMorphologyInfoType = undefined
                word.selectedMorphologyInfoType = undefined
                word.sourcePatternVertexId = undefined
            })
        }
    }

    const markExistingPattern = () => { // 這個命名可能要調整一下，跟 automark 有可能混淆
        if (!findBeginWord()) return
        const selectedArcsFromBegin = currentSentence().arcs.filter( (arc) => {
            return (arc.selected && arc.trueStart === findBeginWord().indexInSentence)
        })
        if (selectedArcsFromBegin.length === 0) return
        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V")
        .call("has", findBeginWord().selectedMorphologyInfoType, findBeginWord().tag)
        .nest(
            "where"
            , new gremlinUtils.GremlinInvoke(true)
            .call("outE")
            .call("count")
            .call("is", selectedArcsFromBegin.length)
            .command
            )
        .command
        console.log(gremlinCommand)
        gremlinApi(gremlinCommand).then( (resultData) => {
            console.log(resultData)
            // 查詢結果超過 1 筆要丟例外
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
        .call("has", beginWord.beginningMorphologyInfoType, beginWord.tag)
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
            clearSelectionAndMatchingAndOptions()
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
    const clearSelectionAndMatchingAndOptions = () => {
        const sentence = currentSentence()
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        sentence.arcs.forEach( arc => arc.selected = false)
        sentence.words.forEach( (word) => {
            word.selectedMorphologyInfoType = undefined
            word.beginningMorphologyInfoType = undefined
            word.sourcePatternVertexId = undefined
        })
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
    }
    const reloadTargetPatternOptions = (sourcePatternBeginningId) => {
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)

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
