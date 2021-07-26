import { ref } from "vue"
import { useStore } from "vuex"

export class ModifiedSpacySentence {
    constructor(modifiedSpacyTokens, modifiedSpacyDependencies) {
        this.words = modifiedSpacyTokens
        this.words.forEach(word => word.sentence = this)
        this.arcs = modifiedSpacyDependencies
        this.arcs.forEach(arc => arc.sentence = this)
    }
}

export class ModifiedSpacyToken {
    constructor(spacyWord) {
        this.text = spacyWord.text
        this.tag = spacyWord.tag
        this.lemma = spacyWord.lemma
    }

}
export class ModifiedSpacyDependency {
    constructor(spacyArc) {
        this.start = spacyArc.start
        this.end = spacyArc.end
        this.label = spacyArc.label
        this.trueStart = spacyArc.dir == 'right' ? spacyArc.start : spacyArc.end
        this.trueEnd = spacyArc.dir == 'right' ? spacyArc.end : spacyArc.start
    }
}

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
        const dependencies = []
        arcsClone.forEach(function (arc, index) {
            const dependency = new ModifiedSpacyDependency(arc)
            dependency.start -= (baselineSentence.start)
            dependency.end -= (baselineSentence.start)
            // Chin format property
            dependency.indexInSentence = index
            dependencies.push(dependency)
        })
        // Chin format property
        // spacyFormatDocumentParse.value.words.filter()
        const words = spacyFormatDocumentParse.value.words.filter(
            (word, index) =>
                index >= baselineSentence.start
                && index <= baselineSentence.end
            )
        const tokens = []
        words.forEach((word, index) => {
            const token = new ModifiedSpacyToken(word)
            token.indexInSentence = index
            token.selectedMorphologyInfoTypes = []
            tokens.push(token)
        })
        const sentence = new ModifiedSpacySentence(tokens, dependencies)
        return sentence
    }

    const spacyFormatHelper = ref({})
    spacyFormatHelper.value.documentParse = spacyFormatDocumentParse
    spacyFormatHelper.value.generateSentences = generateSentences

    return {
        spacyFormatHelper
    }
}
