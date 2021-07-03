import { ref } from 'vue'

export default function selectionManager() {
    const selectedPOSs = ref([])
    const selectedLemmas = ref([])
    const selectedDependencies = ref([])

    const togglePOSSelected = (posIndex) => {
        const indexOfPOS = selectedPOSs.value.indexOf(posIndex)
        if (indexOfPOS >= 0) {
            selectedPOSs.value.splice(indexOfPOS, 1)
        } else {
            selectedPOSs.value.push(posIndex)
        }
        if (selectedLemmas.value.indexOf(posIndex) >= 0) {
            selectedLemmas.value.splice(selectedLemmas.value.indexOf(posIndex), 1)
        }
    }
    const toggleLemmaSelected = (lemmaIndex) => {
        const indexOfLemma = selectedLemmas.value.indexOf(lemmaIndex)
        if (indexOfLemma >= 0) {
            selectedLemmas.value.splice(indexOfLemma, 1)
        } else {
            selectedLemmas.value.push(lemmaIndex)
        }
        if (selectedPOSs.value.indexOf(lemmaIndex) >= 0) {
            selectedPOSs.value.splice(indexOfLemma, 1)
        }
    }
    const toggleDependencySelected = (dependencyIndex) => {
        const indexOfDependency = selectedDependencies.value.indexOf(dependencyIndex)
        if (indexOfDependency >= 0) {
            selectedDependencies.value.splice(indexOfDependency, 1)
        } else {
            selectedDependencies.value.push(dependencyIndex)
        }
    }

    return {
        posSelectionManager: {
            selections: selectedPOSs.value
        }
        , lemmaSelectionManager: {
            selections: selectedLemmas.value
        }
        , selectedDependencies
        , togglePOSSelected
        , toggleLemmaSelected
        , toggleDependencySelected
    }
}