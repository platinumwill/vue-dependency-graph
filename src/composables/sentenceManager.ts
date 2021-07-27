
export class ModifiedSpacyToken {

    text: string
    tag: string
    lemma: string
    sentence?: ModifiedSpacySentence

    constructor(spacyWord: any) {
        this.text = spacyWord.text
        this.tag = spacyWord.tag
        this.lemma = spacyWord.lemma
    }

}

export class ModifiedSpacyDependency {
    
    start: number
    end: number
    label: string
    trueStart: number
    trueEnd: number
    sentence?: ModifiedSpacySentence

    constructor(spacyArc: any) {
        this.start = spacyArc.start
        this.end = spacyArc.end
        this.label = spacyArc.label
        this.trueStart = spacyArc.dir == 'right' ? spacyArc.start : spacyArc.end
        this.trueEnd = spacyArc.dir == 'right' ? spacyArc.end : spacyArc.start
    }
}

export class ModifiedSpacySentence {

    words: ModifiedSpacyToken[]
    arcs: ModifiedSpacyDependency[]
    constructor(modifiedSpacyTokens: ModifiedSpacyToken[], modifiedSpacyDependencies: ModifiedSpacyDependency[]) {
        this.words = modifiedSpacyTokens
        this.words.forEach(word => word.sentence = this)
        this.arcs = modifiedSpacyDependencies
        this.arcs.forEach(arc => arc.sentence = this)
    }
}
