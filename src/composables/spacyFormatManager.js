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
        store.getters.sentences.forEach((sentence) => {
            result.push(generateSentence(sentence))
        })
        return result
    }

    const generateSentence = (sentence) => {
        const filteredArcs = spacyFormatDocumentParse.value.arcs.filter(
            arc =>
            arc.start >= sentence.start
            && arc.end >= sentence.start
            && arc.start <= sentence.end 
            && arc.end <= sentence.end
            )
        let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
        arcsClone.forEach(function (arc, index) {
            arc.start -= (sentence.start)
            arc.end -= (sentence.start)
            // Chin format property
            arc.indexInSentence = index
            arc.trueStart = arc.dir == 'right' ? arc.start : arc.end
            arc.trueEnd = arc.dir == 'right' ? arc.end : arc.start
        })
        // Chin format property
        // spacyFormatDocumentParse.value.words.filter()
        const words = spacyFormatDocumentParse.value.words.filter(
            (word, index) =>
                index >= sentence.start
                && index <= sentence.end
            )
        words.forEach((word, index) => {
            word.indexInSentence = index
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
