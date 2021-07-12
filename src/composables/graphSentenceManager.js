import { ref } from 'vue'
import { useStore } from "vuex"

const morphologyInfoType = Object.freeze({
    pos: 'pos'
    , lemma: 'lemma'
})

export default function() {
    
    const store = useStore()
    const spacyFormatSentences = ref([])
    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        const word = spacyFormatSentences.value[store.getters.currentSentenceIndex].words[tokenIndex]
        if (word.selectedMorphologyInfoType === morphInfoType) {
            word.selectedMorphologyInfoType = undefined
            return
        }
        word.selectedMorphologyInfoType = morphInfoType
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = spacyFormatSentences.value[store.getters.currentSentenceIndex].arcs[dependencyIndex]
        dependency.selected = !dependency.selected
    }

    return {
        spacyFormatSentences
        , toggleMorphologySelection
        , morphologyInfoType
        , toggleDependencySelection
    }
}
