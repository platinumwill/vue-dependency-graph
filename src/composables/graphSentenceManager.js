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
        queryMathingSourcePatterns()
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        dependency.selected = !dependency.selected
        updateBeginning()
        queryMathingSourcePatterns()
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

    const sourcePatternOptions = ref([])
    const queryMathingSourcePatterns = () => {
        const beginWord = findBeginWord()
        if (! beginWord) {
            sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
            return
        }
        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V")
        .call("hasLabel", beginWord.beginningMorphologyInfoType)
        .call("inE", 'applicable')
        .call("inV")
        // .call("path")
        .command
        console.log(gremlinCommand)
        gremlinApi(gremlinCommand).then( (resultData) => {
            // const targetPatterBeginPieceVId = resultData['@value'][0]['@value'].id['@value']
            console.log(resultData)
            // console.log(resultData['@value'].objects['@value'][1]['@value'])
            resultData['@value'].forEach( (sourcePatternBeginning) => {
                sourcePatternOptions.value.push({
                    id: sourcePatternBeginning['@value'].id['@value']
                    , label: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                })
            })
        })
        console.log(sourcePatternOptions)
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
        , optionHelper: {
            sourcePatternOptions: sourcePatternOptions.value
        }
    }
}
