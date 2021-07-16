import { ref } from 'vue'
import { useStore } from "vuex"

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
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        dependency.selected = !dependency.selected
        updateBeginning()
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
    const currentSentence = () => {
        return spacyFormatSentences.value[store.getters.currentSentenceIndex]
    }
    const selectedArcs = () => {
        return currentSentence().arcs.filter( (arc) => {
            return arc.selected
        })
    }

    return {
        spacyFormatSentences
        , toggleMorphologySelection
        , morphologyInfoType
        , toggleDependencySelection
    }
}
