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
export class ModifiedSpacyToken extends ModifiedSpacyElement {

    text: string
    tag: string
    lemma: string
    selectedMorphologyInfoTypes: string[] = []
    sourcePatternVertexId?: number
    isBeginning?: boolean

    constructor(spacyWord: any, index: number) {
        super(index, "token")
        this.indexInSentence
        this.text = spacyWord.text
        this.tag = spacyWord.tag
        this.lemma = spacyWord.lemma
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
    console.error(error)
    throw error
}