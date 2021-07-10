import { computed, ref } from "vue"
import { useStore } from "vuex"

export default function () {
    const spacyFormatDocumentParse = ref({})
    const store = useStore()
    const spacyFormatSentenceParseFunction = () => {
        if (spacyFormatDocumentParse.value == undefined || !spacyFormatDocumentParse.value.words || !store.getters.isDocumentReady) {
            return {}
        }
        const filteredArcs = spacyFormatDocumentParse.value.arcs.filter(
            arc =>
            // 這裡應該要準備換掉吧
            arc.start >= store.getters.currentSentence.start
            && arc.end >= store.getters.currentSentence.start
            && arc.start <= store.getters.currentSentence.end 
            && arc.end <= store.getters.currentSentence.end
            )
        let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
        arcsClone.forEach(function (arc, index) {
            arc.start -= (store.getters.currentSentence.start)
            arc.end -= (store.getters.currentSentence.start)
            // Chin format property
            arc.indexInSentence = index
            arc.trueStart = arc.dir == 'right' ? arc.start : arc.end
            arc.trueEnd = arc.dir == 'right' ? arc.end : arc.start
        })
        // Chin format property
        spacyFormatDocumentParse.value.words.forEach((word, index) => word.indexInSentence = index - store.getters.currentSentence.start)
        const sentenceParse = {
            words: spacyFormatDocumentParse.value.words.filter(
            (word, index) =>
                index >= store.getters.currentSentence.start
                && index <= store.getters.currentSentence.end
            )
            , arcs: arcsClone
        }
        return sentenceParse
    }
    const spacyFormatSentenceParse = computed(spacyFormatSentenceParseFunction)

    const spacyFormatHelper = ref({})
    spacyFormatHelper.value.documentParse = spacyFormatDocumentParse
    spacyFormatHelper.value.sentenceParse = spacyFormatSentenceParse

    return {
        spacyFormatHelper
    }
}
