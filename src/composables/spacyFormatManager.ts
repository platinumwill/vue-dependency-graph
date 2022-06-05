import { Ref, ref } from "vue"
import { useStore } from "vuex"
import * as sentenceManager from "@/composables/sentenceManager"
import * as sourcePattern from '@/composables/sourcePatternSegment'
import * as targetPattern from '@/composables/targetPattern'
import * as translationHelper from '@/composables/translationHelper'

export type SpacyArc = {
    label: string
    , start: number
    , end: number
    , dir: string
}
export type SpacyWord = {
    text: string
    , tag: string
    , tense: string
    , lemma: string
}
export type SpacySentence = {
    words: SpacyWord[]
    , arcs: SpacyArc[]
    , start: number
    , end: number
}

export class SpacyFormatHelper {
    $documentParse: Ref<SpacySentence>
    $generateSentences: Function

    constructor(documentParse: Ref<SpacySentence>, generateSentences: Function) {
        this.$documentParse = documentParse
        this.$generateSentences = generateSentences
    }

    get documentParse() {
        return this.$documentParse
    }
    set documentParse(documentParse) {
        this.$documentParse = documentParse
    }

    get generateSentences() {
        return this.$generateSentences
    }

}

export default function () {
    const spacyFormatDocumentParse = ref<SpacySentence>(
        {
            words: []
            , arcs: []
            , start: -1
            , end: -1
        }
    )
    const store = useStore()

    const generateSentences = () => {
        const result: sentenceManager.ModifiedSpacySentence[] = []
        if (spacyFormatDocumentParse.value == undefined 
            || !spacyFormatDocumentParse.value.words 
            || !store.getters.isDocumentReady) {
            return result
        }
        store.getters.baselineSentences.forEach((baselineSentence: SpacySentence) => {
            result.push(generateSentence(baselineSentence))
        })
        return result
    }

    const generateSentence = (baselineSentence: SpacySentence) => {
        const filteredArcs = spacyFormatDocumentParse.value.arcs.filter(
            arc =>
            arc.start >= baselineSentence.start
            && arc.end >= baselineSentence.start
            && arc.start <= baselineSentence.end 
            && arc.end <= baselineSentence.end
            )
        const arcsClone: SpacyArc[] = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
        const dependencies: sentenceManager.ModifiedSpacyDependency[] = []
        arcsClone.forEach(function (arc, index) {
            const dependency = new sentenceManager.ModifiedSpacyDependency(arc, index)
            dependency.start -= (baselineSentence.start)
            dependency.end -= (baselineSentence.start)
            // Chin format property
            dependencies.push(dependency)
        })
        // Chin format property
        // spacyFormatDocumentParse.value.words.filter()
        const words = spacyFormatDocumentParse.value.words.filter(
            (word, index) =>
                index >= baselineSentence.start
                && index <= baselineSentence.end
            )
        const tokens: sentenceManager.ModifiedSpacyToken[] = []
        words.forEach((word, index) => {
            const token = new sentenceManager.ModifiedSpacyToken(word, index)

            // source pattern segment helper
            const segmentHelper = sourcePattern.prepareSegment(token)
            token.segmentHelper = segmentHelper
            // target pattern helper
            const targetPatternHelper = targetPattern.prepareTargetPattern(token)
            token.targetPatternHelper = targetPatternHelper
            // translation helper
            const translation = translationHelper.prepareTranslationHelper(segmentHelper, targetPatternHelper)
            token.translationHelper = translation

            token.selectedMorphologyInfoTypes = []
            tokens.push(token)
        })
        const sentence = new sentenceManager.ModifiedSpacySentence(tokens, dependencies)
        return sentence
    }

    const spacyFormatHelper = ref<SpacyFormatHelper>(new SpacyFormatHelper(spacyFormatDocumentParse, generateSentences))

    return {
        spacyFormatHelper
    }
}
