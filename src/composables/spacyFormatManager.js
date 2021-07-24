import { ref } from "vue"
import { useStore } from "vuex"

export default function () {
    const spacyFormatDocumentParse = ref({})
    const store = useStore()

    const generateSentences = () => {
        const result = []
        if (spacyFormatDocumentParse.value == undefined 
            || !spacyFormatDocumentParse.value.words 
            || !store.getters.isDocumentReady) {
            return result
        }
        store.getters.baselineSentences.forEach((baselineSentence) => {
            result.push(generateSentence(baselineSentence))
        })
        return result
    }

    const generateSentence = (baselineSentence) => {
        const filteredArcs = spacyFormatDocumentParse.value.arcs.filter(
            arc =>
            arc.start >= baselineSentence.start
            && arc.end >= baselineSentence.start
            && arc.start <= baselineSentence.end 
            && arc.end <= baselineSentence.end
            )
        let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
        arcsClone.forEach(function (arc, index) {
            arc.start -= (baselineSentence.start)
            arc.end -= (baselineSentence.start)
            // Chin format property
            arc.indexInSentence = index
            arc.trueStart = arc.dir == 'right' ? arc.start : arc.end
            arc.trueEnd = arc.dir == 'right' ? arc.end : arc.start
        })
        // Chin format property
        // spacyFormatDocumentParse.value.words.filter()
        const words = spacyFormatDocumentParse.value.words.filter(
            (word, index) =>
                index >= baselineSentence.start
                && index <= baselineSentence.end
            )
        words.forEach((word, index) => {
            word.indexInSentence = index
            word.selectedMorphologyInfoTypes = []
        })
        return  {
            words: words
            , arcs: arcsClone
        }
    }

    const spacyFormatHelper = ref({})
    spacyFormatHelper.value.documentParse = spacyFormatDocumentParse
    spacyFormatHelper.value.generateSentences = generateSentences

    return {
        spacyFormatHelper
    }
}
