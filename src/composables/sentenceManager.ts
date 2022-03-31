import { computed, ref } from 'vue'
import { useStore } from "vuex"
import { MorphologyInfoType, minimalMorphologyInfo } from "@/composables/morphologyInfo"
import { SourcePatternManager } from '@/composables/sourcePatternManager'
import { TargetPattern } from '@/composables//targetPatter'
import { TranslationHelper } from '@/composables/translationHelper'


export default function () {

    const spacyFormatSentences = ref<ModifiedSpacySentence[]>([])
    const store = useStore()

    const currentSentence = computed( () => {
        return spacyFormatSentences.value[store.getters.currentSentenceIndex]
    })

    return {
        spacyFormatSentences: spacyFormatSentences.value
        , currentSentence
    }

}

export class ModifiedSpacyElement {

    indexInSentence: number
    sentence?: ModifiedSpacySentence
    type: string

    constructor(indexInSentence: number, type: string) {
        this.indexInSentence = indexInSentence
        this.type = type
    }

    get vueKey () {
        return this.type + this.indexInSentence
    }
    
    get existingGraphElementId(): string {
        if (this instanceof ModifiedSpacyToken && this.sourcePatternVertexId != undefined) return this.sourcePatternVertexId?.toString()
        if (this instanceof ModifiedSpacyDependency && this.sourcePatternEdgeId) return this.sourcePatternEdgeId
        return "$$$"
    }

}

export const morphologyInfoUnknownValuePostfix = "_UNKNOWN"
export class ModifiedSpacyToken extends ModifiedSpacyElement {

    text: string
    tag: string
    lemma: string
    selectedMorphologyInfoTypes: MorphologyInfoType[] = []
    sourcePatternVertexId?: number
    $isBeginning: boolean = false
    $tense: string
    $segmentHelper?: SourcePatternManager
    $targetPatternHelper?: TargetPattern
    $translationHelper?: TranslationHelper

    constructor(spacyWord: any, index: number) {
        super(index, "token")
        this.text = spacyWord.text
        this.tag = spacyWord.tag
        this.lemma = spacyWord.lemma
        this.$tense = spacyWord.tense == undefined || spacyWord.tense.endsWith(morphologyInfoUnknownValuePostfix) 
        ? morphologyInfoUnknownValuePostfix
        : spacyWord.tense
    }

    markMorphologyInfoAsSelected(morphologyInfoType: MorphologyInfoType) {
        this.selectedMorphologyInfoTypes.push(morphologyInfoType)
        if (! this.selectedMorphologyInfoTypes.includes(minimalMorphologyInfo)) this.selectedMorphologyInfoTypes.push(minimalMorphologyInfo)
    }
    unmarkMorphologyInfoAsSelected(morphologyInfoType: MorphologyInfoType) {
        if (morphologyInfoType == minimalMorphologyInfo) {// 如果是取消選取 pos
            this.selectedMorphologyInfoTypes.splice(0, this.selectedMorphologyInfoTypes.length) // 把整個選取的 morph info 陣列清掉
        } else {
            this.selectedMorphologyInfoTypes.splice(this.selectedMorphologyInfoTypes.indexOf(morphologyInfoType)) // 否則只清除取消選取的 pos
        }
    }

    get tense() {
        return this.$tense
    }

    get isSegmentRoot() {
        const frontDep = this.sentence?.arcs.filter( dep => {return dep.selected && dep.trueEnd === this.indexInSentence} ).length
        // https://stackoverflow.com/questions/20093613/typescript-conversion-to-boolean
        return !! this.selectedMorphologyInfoTypes.length && !frontDep
    }

    get outDeps() {
        const outDeps = this.sentence?.arcs
            .filter( dep => {return dep.trueStart === this.indexInSentence} )
        return outDeps || []
    }

    get segmentDeps() {
        return this.outDeps.filter( outDep => {return outDep.selected})
    }

    get segmentTokens() {
        if (! this.$isBeginning) return []

        const result = []
        result.push(this)
        this.outDeps.forEach(dep => {if (dep.endToken?.selectedMorphologyInfoTypes.length) result.push(dep.endToken)})
        return result
    }

    get isBeginning() {
        return this.$isBeginning
    }
    set isBeginning(isBeginning) {
        this.$isBeginning = isBeginning
        if (! isBeginning)
        this.outDeps
            .forEach( outDep => {
                outDep.sourcePatternEdgeId = undefined
                outDep.selected = false
            } )
    }

    // source pattern segment helper
    get segmentHelper() {
        return this.$segmentHelper
    }
    set segmentHelper(segmentHelper) {
        this.$segmentHelper = segmentHelper
    }

    // target pattern
    get targetPatternHelper() {
        return this.$targetPatternHelper
    }
    set targetPatternHelper(targetPatternHelper) {
        this.$targetPatternHelper = targetPatternHelper
    }

    // translation helper
    get translationHelper() {
        return this.$translationHelper
    }
    set translationHelper(translationHelper) {
        this.$translationHelper = translationHelper
    }

}

export class ModifiedSpacyDependency extends ModifiedSpacyElement {
    
    dir: string
    start: number
    end: number
    label: string
    trueStart: number
    trueEnd: number
    selected: boolean = false
    sourcePatternEdgeId?: string

    constructor(spacyArc: any, index: number) {
        super(index, "dependency")
        this.dir = spacyArc.dir
        this.start = spacyArc.start
        this.end = spacyArc.end
        this.label = spacyArc.label
        this.trueStart = spacyArc.dir == 'right' ? spacyArc.start : spacyArc.end
        this.trueEnd = spacyArc.dir == 'right' ? spacyArc.end : spacyArc.start
    }

    get isPlaceholder() {
        let result = true
        this.sentence?.selectedTokens.forEach( (token) => {
            if (token.indexInSentence == this.trueEnd) {
                result = false
                return
            }
        })
        return result
    }
    
    get endToken() {
        return this.sentence?.words[this.trueEnd]
    }

    get selectedEndToken() {
        const endToken = this.sentence?.words[this.trueEnd]
        if (endToken?.selectedMorphologyInfoTypes.length) {
            return endToken
        }
        throw 'selectedEndToken() 邏輯有錯'
    }
}

export class ModifiedSpacySentence {

    words: ModifiedSpacyToken[]
    arcs: ModifiedSpacyDependency[]
    constructor(
        modifiedSpacyTokens: ModifiedSpacyToken[]
        , modifiedSpacyDependencies: ModifiedSpacyDependency[]
        ) {
        this.words = modifiedSpacyTokens
        this.words.forEach(word => word.sentence = this)
        this.arcs = modifiedSpacyDependencies
        this.arcs.forEach(arc => arc.sentence = this)
    }

    get selectedDependencies() {
        return this.arcs.filter( arc => arc.selected)
    }
    get selectedTokens() {
        return this.words.filter( token => token.selectedMorphologyInfoTypes.length > 0)
    }

    clearSelection() {
        this.selectedDependencies.forEach( dep => dep.selected = false)
        this.selectedTokens.forEach( token => {
            token.selectedMorphologyInfoTypes.splice(0, token.selectedMorphologyInfoTypes.length)
        });
    }

    // TODO 暫時把邏輯搬過來，可能還要再修正整理
    findBeginWord() {
        const beginWords = this.words.filter( (word) => {
            return word.isBeginning
        })
        if (beginWords.length <= 0) return undefined
        if (beginWords.length > 1) {
            const error = "begin word 超過一個，程式控制有問題"
            console.error(error)
            throw error
        }
        return beginWords[0]
    }

}

export const findDependencyByPatternEdgeId = (sourceEdgeId: string, sentence: ModifiedSpacySentence): ModifiedSpacyDependency => {
    const result = sentence.arcs.find( dependency => {
        return dependency.sourcePatternEdgeId == sourceEdgeId
    })
    if (result != undefined) return result
    const error = "source pattern edge 記錄有問題"
    console.error(error)
    throw error
}

export const findTokenByPatternVertexId = (sourceVertexId: number, sentence: ModifiedSpacySentence): ModifiedSpacyToken => {
    const result = sentence.words.find( token => {
        return token.sourcePatternVertexId == sourceVertexId
    })
    if (result != undefined) return result
    const error = "source pattern vertex 記錄有問題"
    console.error(error, 'source vertex id: ', sourceVertexId, ' not found in tokens')
    throw error
}
